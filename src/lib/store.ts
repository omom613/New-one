import { useSyncExternalStore } from "react";

export type IndexPhase =
  | "idle"
  | "scanning"
  | "locating"
  | "naming"
  | "analyzing"
  | "done"
  | "error";

export type IndexState = {
  phase: IndexPhase;
  running: boolean;
  done: number;
  total: number;
  message: string | null;
  /** Bumped whenever photos/places/notes change so screens reload. */
  version: number;
};

let state: IndexState = {
  phase: "idle",
  running: false,
  done: 0,
  total: 0,
  message: null,
  version: 0,
};
const listeners = new Set<() => void>();

export function getIndexState() {
  return state;
}

export function setIndexState(patch: Partial<IndexState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function bumpVersion() {
  setIndexState({ version: state.version + 1 });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useIndexState(): IndexState {
  return useSyncExternalStore(subscribe, getIndexState, getIndexState);
}

/** Just the data version, for screens that only need to refetch. */
export function useDataVersion(): number {
  return useSyncExternalStore(
    subscribe,
    () => state.version,
    () => state.version,
  );
}
