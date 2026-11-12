"use client";

import { useEffect, useState } from "react";
import { escucharBuzon, useBuzon } from "./buzonEstado";
import { MAX_SEC, MAX_SUBIDA } from "@/lib/buzon-reglas";
import { Grabadora, Microfono, usePuedeGrabar } from "./Grabadora";

function Cascos({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={`size-5 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2.5 10V8a5.5 5.5 0 0 1 11 0v2" />
      <rect x="1.75" y="9.25" width="3" height="5" rx="1" fill="currentColor" />
      <rect x="11.25" y="9.25" width="3" height="5" rx="1" fill="currentColor" />
    </svg>
  );
}

// Solo el icono, sin círculo; el botón mide lo mismo para que se pulse bien con el dedo
const redondo = "relative grid size-10 place-items-center transition-colors hover:text-white aria-pressed:text-white";

/**
 * El buzón de voz, abajo a la derecha de la portada, frente a los mensajes escritos: los cascos
 * ponen los mensajes que hay (los lleva el reproductor) y el micro graba uno nuevo.
 */
export function MensajeBuzon() {
  const puedeGrabar = usePuedeGrabar();
  const { mensajes, escuchando } = useBuzon();
  const [grabando, setGrabando] = useState(false);
  const [status, setStatus] = useState("");

  // Los avisos ("¡Ya está en el buzón!", un error) se quedan unos segundos y se van solos;
  // mientras se graba no, que ahí acompañan a la grabadora
  useEffect(() => {
    if (!status || grabando) return;
    const t = setTimeout(() => setStatus(""), 5000);
    return () => clearTimeout(t);
  }, [status, grabando]);

  return (
    <div className="buzon-voz absolute right-4 bottom-4 flex max-w-[min(28rem,calc(100%-2rem))] flex-col items-end gap-2 text-right font-mono text-xs uppercase sm:right-8 max-sm:bottom-14">
      <p aria-live="polite" className="empty:hidden">
        {status}
      </p>
      {grabando ? (
        <Grabadora onClose={() => setGrabando(false)} onStatus={setStatus} />
      ) : (
        <div role="group" aria-label="Buzón de voz" className="flex items-center gap-1">
          {(mensajes > 0 || escuchando) && (
            <button
              onClick={escucharBuzon}
              aria-pressed={escuchando}
              aria-label={escuchando ? "Parar el buzón" : `Escuchar el buzón: ${mensajes} ${mensajes === 1 ? "mensaje" : "mensajes"}`}
              title={escuchando ? "Parar el buzón" : "Escuchar el buzón"}
              className={redondo}
            >
              {escuchando ? <span aria-hidden className="size-3.5 bg-current" /> : <Cascos />}
              {!escuchando && (
                <span aria-hidden className="absolute top-0.5 right-0 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] leading-4 font-bold text-black">
                  {mensajes}
                </span>
              )}
            </button>
          )}
          {puedeGrabar && (
            <button
              onClick={() => {
                setStatus("");
                setGrabando(true);
              }}
              aria-label="Grabar un mensaje para el buzón"
              title={`Graba un mensaje para el buzón (${MAX_SEC} s) o sube uno (${MAX_SUBIDA} s)`}
              className={redondo}
            >
              <Microfono className="size-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
