import { useSyncExternalStore } from "react";

/**
 * Lo que la portada sabe del buzón, que lleva el reproductor (RadioPlayer.tsx): cuántos mensajes
 * aprobados hay y si está sonando alguno. Los botones de la portada piden escucharlos con
 * escucharBuzon(); los pone el reproductor, que sabe pausar la radio y volver a sintonizarla.
 */
export type EstadoBuzon = { mensajes: number; escuchando: boolean };

let estado: EstadoBuzon = { mensajes: 0, escuchando: false };
const listeners = new Set<() => void>();
const SERVIDOR: EstadoBuzon = { mensajes: 0, escuchando: false };

export function cambiarBuzon(cambio: Partial<EstadoBuzon>) {
  const next = { ...estado, ...cambio };
  if (next.mensajes === estado.mensajes && next.escuchando === estado.escuchando) return;
  estado = next;
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};

export const useBuzon = () =>
  useSyncExternalStore(
    subscribe,
    () => estado,
    () => SERVIDOR,
  );

export const ESCUCHAR = "radio:buzon";
/** Alguien acaba de dejar uno: el reproductor vuelve a pedir la lista */
export const BUZON_NUEVO = "radio:buzon-nuevo";
/** Pone los mensajes del buzón, o los para si ya están sonando */
export const escucharBuzon = () => window.dispatchEvent(new Event(ESCUCHAR));
