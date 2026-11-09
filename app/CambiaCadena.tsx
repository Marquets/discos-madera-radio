"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import type { CadenaPublica } from "@/lib/cadenas";
import { elegir, pintarBarra, useCadena, useCambia } from "./useCadena";

/**
 * The channel switch, up in the ticker beside Spotify / YouTube. Colours change at once; the songs come with a refresh,
 * since the server picks them from the cookie. Hidden unless more than one channel is open
 * today: the seasonal ones only show in season, or with the ?cadenas=ver preview.
 * There's no room for it in a phone's ticker, so there it sits in the menu instead.
 */
/** pastilla: el fondo lleno en la activa (el menú del móvil); dial: puntos de emisora (la barra de arriba) */
type Estilo = "pastilla" | "dial";

const BOTON: Record<Estilo, string> = {
  pastilla: "px-1.5 py-0.5 hover:text-white aria-pressed:bg-accent aria-pressed:text-black",
  dial: "group flex items-center gap-1.5 px-1 py-0.5 opacity-60 hover:text-white hover:opacity-100 aria-pressed:opacity-100",
};

export function CambiaCadena({ cadenas, className = "", estilo = "pastilla" }: { cadenas: CadenaPublica[]; className?: string; estilo?: Estilo }) {
  const actual = useCadena();
  const visible = useCambia();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // The inline script runs before Next's <meta name="theme-color"> may exist, so the bar is
  // painted here; and again once a switch's refresh is done, since Next rewrites the tag
  const color = cadenas.find((c) => c.id === actual)?.themeColor;
  useEffect(() => {
    if (color && !pending) pintarBarra(color);
  }, [color, pending]);

  if (!visible) return null;

  return (
    <div role="group" aria-label="Cadena" className={`flex ${estilo === "dial" ? "gap-2" : "gap-1"} font-mono uppercase transition-opacity ${pending ? "opacity-60" : ""} ${className}`}>
      {cadenas.map((c) => (
        <button
          key={c.id}
          aria-pressed={c.id === actual}
          onClick={() => {
            if (c.id === actual) return;
            elegir(c.id, c.themeColor);
            startTransition(() => router.refresh());
          }}
          className={BOTON[estilo]}
        >
          {/* Like the presets of a radio dial: a lit dot on the station that's on */}
          {estilo === "dial" && <span aria-hidden className="size-1.5 rounded-full border border-current group-aria-pressed:bg-current" />}
          {c.nombre}
        </button>
      ))}
    </div>
  );
}
