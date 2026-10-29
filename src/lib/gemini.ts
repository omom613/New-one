import * as SecureStore from "expo-secure-store";

import { normalize } from "./vector";

/**
 * Google Gemini access.
 *
 * Two ways to connect (first one found wins):
 *  1. A personal API key pasted in the app's settings (stored in the device keychain),
 *     or EXPO_PUBLIC_GEMINI_API_KEY in .env — handy for personal use and testing.
 *  2. EXPO_PUBLIC_API_URL pointing at the small proxy in /server, so the key never
 *     ships inside the app. Use this before sharing the app with anyone.
 */

const BASE = "https://generativelanguage.googleapis.com/v1beta";
export const EMBED_MODEL =
  process.env.EXPO_PUBLIC_EMBED_MODEL || "gemini-embedding-2";
export const TEXT_MODEL =
  process.env.EXPO_PUBLIC_TEXT_MODEL || "gemini-flash-latest";
export const EMBED_DIMS = 768;

const KEY_STORE = "gemini_api_key";

export async function getStoredKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY_STORE);
  } catch {
    return null;
  }
}

export async function setStoredKey(key: string | null) {
  if (key) await SecureStore.setItemAsync(KEY_STORE, key.trim());
  else await SecureStore.deleteItemAsync(KEY_STORE);
}

type Conn =
  | { kind: "key"; key: string }
  | { kind: "proxy"; url: string }
  | null;

async function connection(): Promise<Conn> {
  const stored = await getStoredKey();
  if (stored) return { kind: "key", key: stored };
  const envKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (envKey) return { kind: "key", key: envKey };
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (url) return { kind: "proxy", url: url.replace(/\/$/, "") };
  return null;
}

export async function isAiConfigured(): Promise<boolean> {
  return (await connection()) != null;
}

export class AiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  attempt = 0,
): Promise<any> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  if (res.status === 429 || res.status >= 500) {
    // Rate limited or temporary server error: back off and retry a few times.
    if (attempt < 4) {
      await sleep(1500 * 2 ** attempt);
      return postJson(url, body, headers, attempt + 1);
    }
  }
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json())?.error?.message ?? "";
    } catch {}
    throw new AiError(detail || `요청 실패 (${res.status})`, res.status);
  }
  return res.json();
}

function readValues(json: any): number[] {
  const values =
    json?.embedding?.values ?? json?.embeddings?.[0]?.values ?? json?.values;
  if (!Array.isArray(values))
    throw new AiError("임베딩 응답 형식을 읽지 못했어요");
  return values;
}

type Part =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

async function embedParts(parts: Part[]): Promise<Float32Array> {
  const conn = await connection();
  if (!conn) throw new AiError("AI 연결이 설정되지 않았어요");
  if (conn.kind === "proxy") {
    const json = await postJson(
      `${conn.url}/embed`,
      { parts, dims: EMBED_DIMS },
      {},
    );
    return normalize(readValues(json));
  }
  const json = await postJson(
    `${BASE}/models/${EMBED_MODEL}:embedContent`,
    { content: { parts }, outputDimensionality: EMBED_DIMS },
    { "x-goog-api-key": conn.key },
  );
  return normalize(readValues(json));
}

/** Embeds a JPEG (base64) into the shared text–image vector space. */
export function embedImage(base64Jpeg: string) {
  return embedParts([
    { inlineData: { mimeType: "image/jpeg", data: base64Jpeg } },
  ]);
}

/** Embeds a search phrase (any language, e.g. "노을 지는 바다"). */
export function embedText(text: string) {
  return embedParts([{ text }]);
}

/** Short text generation, used for the recap summary. */
export async function generateText(prompt: string): Promise<string> {
  const conn = await connection();
  if (!conn) throw new AiError("AI 연결이 설정되지 않았어요");
  if (conn.kind === "proxy") {
    const json = await postJson(`${conn.url}/generate`, { prompt }, {});
    return String(json.text ?? "").trim();
  }
  const json = await postJson(
    `${BASE}/models/${TEXT_MODEL}:generateContent`,
    { contents: [{ role: "user", parts: [{ text: prompt }] }] },
    { "x-goog-api-key": conn.key },
  );
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((p: any) => p.text ?? "")
    .join("")
    .trim();
}
