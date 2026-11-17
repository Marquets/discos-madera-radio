"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Envio } from "@/lib/tops";
import { useStored } from "../../useStored";
import { TopLista } from "../TopLista";

// La misma clave que el buzón, guardada en el mismo sitio: quien entra en uno ya está dentro del otro
const CLAVE_KEY = "buzon-clave";

function Fila({ envio, clave, onCambio }: { envio: Envio; clave: string; onCambio: (e: Envio[]) => void }) {
  const [ocupado, setOcupado] = useState(false);

  async function hacer(method: "PATCH" | "DELETE") {
    setOcupado(true);
    const res = await fetch(`/api/tops/${envio.id}`, { method, headers: { "x-clave": clave } }).catch(() => null);
    setOcupado(false);
    if (res?.ok) onCambio((await res.json()).envios);
  }

  return (
    <li className="flex flex-col gap-4 border-2 border-black p-4">
      <TopLista top={envio} />
      <div className="flex gap-2 font-mono text-xs uppercase">
        {!envio.aprobado && (
          <button disabled={ocupado} onClick={() => hacer("PATCH")} className="bg-black px-3 py-1.5 font-bold text-accent hover:opacity-80 disabled:opacity-50">
            Aprobar
          </button>
        )}
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
