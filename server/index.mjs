// Tiny proxy so the Gemini API key stays on a server instead of inside the app.
// Run:  GEMINI_API_KEY=... node server/index.mjs   (Node 18+, no dependencies)
// Then set EXPO_PUBLIC_API_URL=http://<this machine>:8787 in the app's .env.
import { createServer } from 'node:http';

const KEY = process.env.GEMINI_API_KEY;
const PORT = Number(process.env.PORT || 8787);
const EMBED_MODEL = process.env.EMBED_MODEL || 'gemini-embedding-2';
const TEXT_MODEL = process.env.TEXT_MODEL || 'gemini-flash-latest';
const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MAX_BODY = 4 * 1024 * 1024;

if (!KEY) {
  console.error('GEMINI_API_KEY is not set');
  process.exit(1);
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY) throw Object.assign(new Error('body too large'), { status: 413 });
    chunks.push(c);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

async function gemini(path, body) {
  const res = await fetch(`${BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(json?.error?.message || 'upstream error'), { status: res.status });
  return json;
}

const routes = {
  // { parts: [{text}|{inlineData:{mimeType,data}}], dims } -> { values }
  async '/embed'(body) {
    const parts = Array.isArray(body.parts) ? body.parts.slice(0, 1) : [];
    if (!parts.length) throw Object.assign(new Error('parts required'), { status: 400 });
    const json = await gemini(`models/${EMBED_MODEL}:embedContent`, {
      content: { parts },
      outputDimensionality: Number(body.dims) || 768,
    });
    return { values: json?.embedding?.values ?? json?.embeddings?.[0]?.values };
  },
  // { prompt } -> { text }
  async '/generate'(body) {
    const prompt = String(body.prompt || '').slice(0, 8000);
    if (!prompt) throw Object.assign(new Error('prompt required'), { status: 400 });
    const json = await gemini(`models/${TEXT_MODEL}:generateContent`, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const text = (json?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
    return { text };
  },
};

createServer(async (req, res) => {
  const send = (status, obj) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(obj));
  };
  const handler = req.method === 'POST' ? routes[req.url] : null;
  if (!handler) return send(req.url === '/health' ? 200 : 404, { ok: req.url === '/health' });
  try {
    send(200, await handler(await readJson(req)));
  } catch (e) {
    send(e.status || 500, { error: { message: e.message } });
  }
}).listen(PORT, () => console.log(`haru proxy on :${PORT}`));
