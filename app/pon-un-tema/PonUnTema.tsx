"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { FoundTrack } from "@/lib/spotify";
import { useCadena } from "../useCadena";

export function PonUnTema({ playlists }: { playlists: Record<string, string> }) {
  // The playlist of the channel on air; the first one until the browser says which
  const playlist = playlists[useCadena() ?? ""] ?? Object.values(playlists)[0];
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<FoundTrack[]>([]);
  const [elegido, setElegido] = useState<FoundTrack | null>(null);
  const [quien, setQuien] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [hecho, setHecho] = useState(false);

  // Waits for a pause in the typing, and drops an answer that arrives after a newer search
  useEffect(() => {
    const q = busqueda.trim();
    if (!q) return;
    const pedido = new AbortController();
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/buscar?q=${encodeURIComponent(q)}`, { signal: pedido.signal }).catch(() => null);
      if (res?.ok) setResultados((await res.json()).tracks);
    }, 300);
    return () => (clearTimeout(timer), pedido.abort());
  }, [busqueda]);

  async function alAire() {
    if (!elegido) return;
    setEnviando(true);
    setError("");
    const res = await fetch("/api/anadir", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: elegido.id, quien }) }).catch(() => null);
    setEnviando(false);
    if (res?.ok) return setHecho(true);
    setError((await res?.json().catch(() => null))?.error ?? "No ha salido, prueba otra vez");
  }

  if (hecho && elegido)
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6 px-4 pt-12 pb-16 text-center">
        <div className="relative aspect-square w-48 overflow-hidden bg-black">{elegido.cover && <Image src={elegido.cover} alt="" fill sizes="12rem" className="object-cover" />}</div>
        <h1 className="font-display text-6xl uppercase leading-none">¡En antena!</h1>
        <p className="font-display text-2xl uppercase leading-tight">
          {elegido.title}
          {quien.trim() && (
            <>
              <br />
              <span className="font-mono text-sm tracking-[0.3em]">cortesía de</span> {quien.trim().split(" ")[0]}
            </>
          )}
        </p>
        <a href={`https://open.spotify.com/track/${elegido.id}`} target="_blank" rel="noreferrer" className="text-sm uppercase underline decoration-2 underline-offset-4">
          Escúchala en Spotify ↗
        </a>
        <button onClick={() => (setHecho(false), setElegido(null), setBusqueda(""))} className="text-sm uppercase underline decoration-2 underline-offset-4">
          Añadir otra
        </button>
      </div>
    );

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 px-4 pt-8 pb-16">
      <h1 className="text-center font-display text-7xl uppercase leading-none sm:text-8xl">Pon un tema</h1>

      <label className="flex flex-col gap-2">
        <span className="text-sm uppercase">1 · Busca una canción o pega su enlace de Spotify</span>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="The Beatles Yesterday, open.spotify.com/track/…"
          className="border-2 border-black bg-transparent px-3 py-3 text-lg placeholder:text-black/40"
        />
      </label>

      {busqueda.trim() && resultados.length > 0 && (
        <ul className="flex flex-col gap-2">
          {resultados.map((r) => (
            <li key={r.id} className={`flex items-center border-2 border-black ${elegido?.id === r.id ? "bg-black text-accent" : ""}`}>
              <button onClick={() => setElegido(r)} aria-pressed={elegido?.id === r.id} className={`flex flex-1 items-center gap-4 p-2 text-left ${elegido?.id === r.id ? "" : "hover:bg-black/10"}`}>
                <div className="relative size-14 shrink-0 overflow-hidden bg-black">{r.cover && <Image src={r.cover} alt="" fill sizes="3.5rem" className="object-cover" />}</div>
                <span className="flex flex-col">
                  <span className="font-display text-xl uppercase leading-tight">{r.title}</span>
                  <span className="text-xs uppercase">{r.artist}</span>
                </span>
              </button>
              <a href={`https://open.spotify.com/track/${r.id}`} target="_blank" rel="noreferrer" aria-label={`${r.title} en Spotify`} className="self-stretch px-4 text-xl leading-[4.5rem] hover:bg-black/10">
                ↗
              </a>
            </li>
          ))}
        </ul>
      )}

      <label className="flex flex-col gap-2">
        <span className="text-sm uppercase">2 · ¿Quién lo trae?</span>
        <input value={quien} onChange={(e) => setQuien(e.target.value)} maxLength={30} autoComplete="given-name" placeholder="Tu nombre" className="border-2 border-black bg-transparent px-3 py-3 text-lg placeholder:text-black/40" />
      </label>

      <button disabled={!elegido || enviando} onClick={alAire} className="bg-black px-4 py-4 font-display text-3xl uppercase text-accent disabled:opacity-40">
        {enviando ? "Sintonizando…" : "Al aire"}
      </button>
      <p role="alert" className="-mt-4 min-h-[1.5em] text-center text-sm uppercase">
        {error}
      </p>
      {playlist && (
        <a href={playlist} target="_blank" rel="noreferrer" className="text-center text-sm uppercase underline decoration-2 underline-offset-4">
          Ver la playlist en Spotify ↗
        </a>
      )}
    </div>
  );
}
