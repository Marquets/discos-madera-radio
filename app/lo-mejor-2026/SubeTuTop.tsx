"use client";

import { useState, type FormEvent } from "react";

const campo = "border-2 border-black bg-transparent px-3 py-2 placeholder:text-black/40";

/** Anyone can send their own top 10; it waits for approval before it shows up */
export function SubeTuTop() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [discos, setDiscos] = useState(Array.from({ length: 10 }, () => ({ url: "", comment: "" })));
  const [estado, setEstado] = useState<"" | "enviando" | "hecho">("");
  const [error, setError] = useState("");

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEstado("enviando");
    setError("");
    const res = await fetch("/api/tops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, discos }),
    }).catch(() => null);
    if (res?.ok) return setEstado("hecho");
    setEstado("");
    setError((await res?.json().catch(() => null))?.error ?? "No se ha podido mandar");
  }

  if (estado === "hecho")
    return (
      <section className="mx-auto flex max-w-xl flex-col items-center gap-3 text-center">
        <h2 className="font-display text-5xl uppercase leading-none">¡Recibido!</h2>
        <p>Tu top saldrá aquí en cuanto lo revisemos.</p>
      </section>
    );

  return (
    <section aria-labelledby="sube-tu-top" className="mx-auto flex w-full max-w-xl flex-col items-center gap-6">
      <h2 id="sube-tu-top" className="text-center font-display text-5xl uppercase leading-none sm:text-6xl">
        ¿Y el tuyo?
      </h2>
      {!open ? (
        <button onClick={() => setOpen(true)} aria-expanded={false} className="bg-black px-5 py-2.5 font-mono text-sm font-bold uppercase text-accent hover:text-white">
          ¡Sube tu top 10!
        </button>
      ) : (
        <form onSubmit={enviar} className="flex w-full flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm uppercase">Tu nombre</span>
            <input required maxLength={30} value={name} onChange={(e) => setName(e.target.value)} className={campo} />
          </label>
          <fieldset className="flex flex-col gap-4">
            <legend className="pb-1 text-sm uppercase">Tus 10 discos: pega el enlace de Spotify de cada álbum (Compartir → Copiar enlace) y, si quieres, un comentario</legend>
            {discos.map((d, i) => (
              <div key={i} className="flex gap-3">
                <span className="w-8 shrink-0 pt-1 text-right font-display text-2xl">{i + 1}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <input
                    required
                    type="url"
                    inputMode="url"
                    placeholder="https://open.spotify.com/album/…"
                    aria-label={`Disco número ${i + 1}`}
                    value={d.url}
                    onChange={(e) => setDiscos(discos.with(i, { ...d, url: e.target.value.trim() }))}
                    className={campo}
                  />
                  <textarea
                    rows={2}
                    maxLength={280}
                    placeholder="Comentario (si quieres)"
                    aria-label={`Comentario del disco número ${i + 1}`}
                    value={d.comment}
                    onChange={(e) => setDiscos(discos.with(i, { ...d, comment: e.target.value }))}
                    className={`${campo} text-sm`}
                  />
                </div>
              </div>
            ))}
          </fieldset>
          <p aria-live="polite" className="empty:hidden">
            {error}
          </p>
          <button disabled={estado === "enviando"} className="self-center bg-black px-5 py-2.5 font-mono text-sm font-bold uppercase text-accent hover:text-white disabled:opacity-50">
            {estado === "enviando" ? "Mandando…" : "Mandar"}
          </button>
        </form>
      )}
    </section>
  );
}
