import { useSyncExternalStore } from "react";

// The storage event only reaches other tabs, so writes from this one notify through here
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * A setting remembered in this browser. The server and the first render see null, so
 * hydration matches; the stored value takes over right after. Storage that throws
 * (private windows, blocked site data) just never remembers.
 */
export function useStored(key: string): [string | null, (value: string) => void] {
  const value = useSyncExternalStore(subscribe, () => read(key), () => null);
  const set = (next: string) => {
    try {
      localStorage.setItem(key, next);
    } catch {}
    listeners.forEach((l) => l());
  };
  return [value, set];
}
