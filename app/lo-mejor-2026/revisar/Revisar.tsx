"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Envio } from "@/lib/tops";
import { useStored } from "../../useStored";
import { TopLista } from "../TopLista";

// La misma clave que el buzón, guardada en el mismo sitio: quien entra en uno ya está dentro del otro
const CLAVE_KEY = "buzon-clave";

const campo = "border-2 border-black bg-transparent px-3 py-2";

/** El nombre y un comentario por disco; lo demás sale de Spotify y no se toca */
function Editar({ envio, clave, onCambio, onCerrar }: { envio: Envio; clave: string; onCambio: (e: Envio[]) => void; onCerrar: () => void }) {
  const [name, setName] = useState(envio.name);
  const [comments, setComments] = useState(envio.discos.map((d) => d.comment ?? ""));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setGuardando(true);
    const res = await fetch(`/api/tops/${envio.id}`, { method: "PUT", headers: { "x-clave": clave, "Content-Type": "application/json" }, body: JSON.stringify({ name, comments }) }).catch(() => null);
    setGuardando(false);
    if (!res?.ok) return setError((await res?.json().catch(() => null))?.error ?? "No se ha podido guardar");
    onCambio((await res.json()).envios);
    onCerrar();
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 font-mono text-xs uppercase">
        Nombre
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={30} required className={`${campo} font-sans text-base normal-case`} />
      </label>
      <ol className="flex flex-col gap-3">
        {envio.discos.map((d, i) => (
          <li key={d.url}>
            <label className="flex flex-col gap-1">
              <span className="font-display text-lg uppercase leading-tight">
                {i + 1}. {d.title} <span className="font-sans text-xs">— {d.artist}</span>
              </span>
              <textarea value={comments[i]} onChange={(e) => setComments(comments.with(i, e.target.value))} maxLength={280} rows={2} placeholder="Comentario (si quieres)" className={`${campo} placeholder:text-black/40`} />
            </label>
          </li>
        ))}
      </ol>
      {error && <p className="text-sm">{error}</p>}
      <div className="flex gap-2 font-mono text-xs uppercase">
        <button disabled={guardando} className="bg-black px-3 py-1.5 font-bold text-accent hover:opacity-80 disabled:opacity-50">
          {guardando ? "Guardando…" : "Guardar"}
        </button>
        <button type="button" onClick={onCerrar} className="border-2 border-black px-3 py-1 hover:bg-black hover:text-accent">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Fila({ envio, clave, onCambio }: { envio: Envio; clave: string; onCambio: (e: Envio[]) => void }) {
  const [ocupado, setOcupado] = useState(false);
  const [editando, setEditando] = useState(false);

  async function hacer(method: "PATCH" | "DELETE") {
    setOcupado(true);
    const res = await fetch(`/api/tops/${envio.id}`, { method, headers: { "x-clave": clave } }).catch(() => null);
    setOcupado(false);
    if (res?.ok) onCambio((await res.json()).envios);
  }

  return (
    <li className="flex flex-col gap-4 border-2 border-black p-4">
      {editando ? <Editar envio={envio} clave={clave} onCambio={onCambio} onCerrar={() => setEditando(false)} /> : <TopLista top={envio} />}
      <div className={`flex gap-2 font-mono text-xs uppercase ${editando ? "hidden" : ""}`}>
        {!envio.aprobado && (
          <button disabled={ocupado} onClick={() => hacer("PATCH")} className="bg-black px-3 py-1.5 font-bold text-accent hover:opacity-80 disabled:opacity-50">
            Aprobar
          </button>
        )}
        <button onClick={() => setEditando(true)} className="border-2 border-black px-3 py-1 hover:bg-black hover:text-accent">
          Editar
        </button>
        <button disabled={ocupado} onClick={() => hacer("DELETE")} className="border-2 border-black px-3 py-1 hover:bg-black hover:text-accent disabled:opacity-50">
          Borrar
        </button>
      </div>
    </li>
  );
}

export function Revisar() {
  const [clave, setClave] = useStored(CLAVE_KEY);
  const [escrita, setEscrita] = useState("");
  const [envios, setEnvios] = useState<Envio[] | null>(null);
  const [mala, setMala] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!clave) return;
    let vale = true;
    fetch("/api/tops", { headers: { "x-clave": clave } })
      .then((r) => {
        if (r.status === 401) return vale && setMala(true);
        if (!r.ok) throw new Error();
        return r.json().then(({ envios }) => vale && (setMala(false), setError(""), setEnvios(envios)));
      })
      .catch(() => vale && setError("No se ha podido cargar"));
    return () => void (vale = false);
  }, [clave]);

  function entrar(e: FormEvent) {
    e.preventDefault();
    if (!escrita) return;
    setMala(false);
    setClave(escrita);
  }

  if (!clave || mala)
    return (
      <form onSubmit={entrar} className="flex flex-col items-center gap-3">
        <input
          type="password"
          value={escrita}
          onChange={(e) => setEscrita(e.target.value)}
          placeholder="Clave"
          aria-label="Clave"
          autoFocus
          className="w-64 border-2 border-black bg-transparent px-2 py-1.5 font-mono"
        />
        <button className="bg-black px-4 py-1.5 font-mono text-sm font-bold uppercase text-accent">Entrar</button>
        {mala && <p className="text-sm">Clave incorrecta</p>}
      </form>
    );

  if (!envios) return <p className="text-center">{error || "Cargando…"}</p>;

  const pendientes = envios.filter((e) => !e.aprobado);
  const aprobados = envios.filter((e) => e.aprobado);
  return (
    <>
      <h2 className="font-display text-3xl uppercase">Por revisar ({pendientes.length})</h2>
      {pendientes.length ? (
        <ul className="flex flex-col gap-6">
          {pendientes.map((e) => (
            <Fila key={e.id} envio={e} clave={clave} onCambio={setEnvios} />
          ))}
        </ul>
      ) : (
        <p>Nada nuevo.</p>
      )}
      <h2 className="font-display text-3xl uppercase">En la página ({aprobados.length})</h2>
      {aprobados.length ? (
        <ul className="flex flex-col gap-6">
          {aprobados.map((e) => (
            <Fila key={e.id} envio={e} clave={clave} onCambio={setEnvios} />
          ))}
        </ul>
      ) : (
        <p>Ninguno aprobado.</p>
      )}
      <button onClick={() => setClave("")} className="self-center font-mono text-xs uppercase underline">
        Salir
      </button>
    </>
  );
}
