"use client";

import { useSyncExternalStore } from "react";
import { COOKIE } from "@/lib/cadenas";

// The channel lives on <html data-cadena>, set by layout.tsx's inline script before the first
// paint, so every component reads the same value and the colours never flash.
const subscribe = (onChange: () => void) => {
  const watch = new MutationObserver(onChange);
  watch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-cadena", "data-cambia"] });
  return () => watch.disconnect();
};

/** The channel on air for this visitor; null while server rendering, which can't know it */
export const useCadena = () =>
  useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.cadena ?? null,
    () => null,
  );

/** Whether today there's more than one channel to pick from (data-cambia, set by the same script) */
export const useCambia = () =>
  useSyncExternalStore(
    subscribe,
    () => "cambia" in document.documentElement.dataset,
    () => false,
  );

/** Remembers the pick for a year and repaints at once; the songs follow with a router refresh */
export function elegir(id: string, themeColor: string) {
  document.cookie = `${COOKIE}=${encodeURIComponent(id)}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.dataset.cadena = id;
  pintarBarra(themeColor);
}

/** The browser bar's colour, which CSS can't reach */
export function pintarBarra(themeColor: string) {
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor);
}
