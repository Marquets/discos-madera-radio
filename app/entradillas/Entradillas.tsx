"use client";

import Image from "next/image";
import { useState } from "react";
import { MAX_SEC, MAX_SUBIDA } from "@/lib/buzon-reglas";
import { Grabadora, Microfono } from "../Grabadora";

type Tema = { id: string; title: string; artist: string; cover?: string };

const normal = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Buscas una canción de la radio, la eliges y grabas (o subes) cómo la presentarías */
export function Entradillas({ tracks, inicial }: { tracks: Tema[]; inicial?: string }) {
  const [busqueda, setBusqueda] = useState("");
  const [elegido, setElegido] = useState(tracks.find((t) => t.id === inicial)?.id ?? null);
  const [status, setStatus] = useState("");

  const q = normal(busqueda.trim());
  const lista = q ? tracks.filter((t) => normal(`${t.title} ${t.artist}`).includes(q)) : tracks;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-8 pb-16 sm:px-8">
      <h1 className="text-center font-display text-6xl uppercase leading-none sm:text-8xl">Entradillas</h1>
      <p className="text-center">
        Elige una canción y preséntala como lo haría un locutor: graba hasta {MAX_SEC} segundos o sube un audio de hasta {MAX_SUBIDA}. Sonará encima del principio de la
        canción cada vez que salga en la radio.
      </p>
      <p aria-live="polite" className="text-center font-mono text-xs uppercase empty:hidden">
        {status}
      </p>
      <input
        type="search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Busca por canción o artista"
        aria-label="Buscar canción"
        className="border-2 border-black bg-transparent px-3 py-2 font-mono"
      />
      <ul className="flex flex-col gap-2">
        {lista.map((t) => (
          <li key={t.id} className="flex flex-col gap-2 border-b-2 border-black pb-2">
            <div className="flex items-center gap-3">
              <div className="relative size-12 shrink-0 overflow-hidden bg-black/10">{t.cover && <Image src={t.cover} alt="" fill sizes="3rem" className="object-cover" />}</div>
              <p className="min-w-0 flex-1 leading-tight">
                <span className="block truncate font-display text-xl uppercase">{t.title}</span>
                <span className="block truncate text-xs uppercase">{t.artist}</span>
              </p>
              {elegido !== t.id && (
                <button
                  onClick={() => {
                    setStatus("");
                    setElegido(t.id);
                  }}
                  aria-label={`Grabar una entradilla para ${t.title}`}
                  className="grid size-10 place-items-center hover:bg-black hover:text-accent"
                >
                  <Microfono className="size-5" />
                </button>
              )}
            </div>
            {elegido === t.id && (
              <div className="self-end bg-black p-2 font-mono text-xs uppercase text-accent">
                <Grabadora tema={t.id} onClose={() => setElegido(null)} onStatus={setStatus} />
              </div>
            )}
          </li>
        ))}
      </ul>
      {!lista.length && <p className="text-center uppercase">Ninguna canción de la radio se llama así.</p>}
    </div>
  );
}
