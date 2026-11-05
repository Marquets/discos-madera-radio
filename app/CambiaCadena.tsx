"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";
import type { CadenaPublica } from "@/lib/cadenas";
import { elegir, pintarBarra, useCadena, useCambia } from "./useCadena";

/**
 * The channel switch in the header. Colours change at once; the songs come with a refresh,
 * since the server picks them from the cookie. Hidden unless more than one channel is open
 * today: the seasonal ones only show in season, or with the ?cadenas=ver preview.
 * There's no room for it beside the logo on a phone, so there it sits in the menu instead.
 */
export function CambiaCadena({ cadenas, className = "" }: { cadenas: CadenaPublica[]; className?: string }) {
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
    <div role="group" aria-label="Cadena" className={`flex gap-1 font-mono uppercase transition-opacity ${pending ? "opacity-60" : ""} ${className}`}>
      {cadenas.map((c) => (
        <button
          key={c.id}
          aria-pressed={c.id === actual}
          onClick={() => {
            if (c.id === actual) return;
            elegir(c.id, c.themeColor);
            startTransition(() => router.refresh());
          }}
          className="px-1.5 py-0.5 hover:text-white aria-pressed:bg-accent aria-pressed:text-black"
        >
          {c.nombre}
        </button>
      ))}
    </div>
  );
}
