"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Audio } from "@/lib/buzon";
import { REVISAR } from "@/lib/buzon-reglas";
import { oirEntradilla } from "../buzonEstado";
import { useStored } from "../useStored";

// La clave se queda en este navegador, para no escribirla cada vez
const CLAVE_KEY = "buzon-clave";
const DIA = 24 * 60 * 60 * 1000;

const cuando = (iso: string) => new Date(iso).toLocaleString("es-ES", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
const quedan = (iso: string) => Math.max(0, Math.ceil((Date.parse(iso) + 7 * DIA - Date.now()) / DIA));

/** Un audio con su reproductor; se pide con la clave, porque los pendientes no son públicos */
function Fila({ audio, clave, onCambio }: { audio: Audio; clave: string; onCambio: (a: Audio[]) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let u: string | null = null;
    fetch(`/api/buzon/${audio.id}`, { headers: { "x-clave": clave } })
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => b && setUrl((u = URL.createObjectURL(b))));
    return () => void (u && URL.revokeObjectURL(u));
  }, [audio.id, clave]);

  async function hacer(method: "PATCH" | "DELETE") {
    setOcupado(true);
    const res = await fetch(`/api/buzon/${audio.id}`, { method, headers: { "x-clave": clave } }).catch(() => null);
    setOcupado(false);
    if (res?.ok) onCambio((await res.json()).audios);
  }

  return (
    <li className="flex flex-col gap-2 border-2 border-black p-3">
      <p className="font-mono text-xs uppercase">
        {cuando(audio.at)} · se borra en {quedan(audio.at)} {quedan(audio.at) === 1 ? "día" : "días"}
      </p>
      {url ? <audio controls src={url} className="w-full" /> : <p className="text-sm">Cargando…</p>}
      <div className="flex gap-2 font-mono text-xs uppercase">
        {!audio.aprobado && (
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

/** Las entradillas de cada canción (lib/entradillas.ts): no caducan, así que aquí se borran */
function Entradillas({ clave, temas }: { clave: string; temas: Record<string, string> }) {
  const [lista, setLista] = useState<{ id: string; at: string; track: string }[] | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{ id: string; texto: string } | null>(null);

  useEffect(() => {
    fetch("/api/entradillas")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setLista(d.entradillas));
  }, []);

  async function borrar(id: string) {
    setOcupado(id);
    const res = await fetch(`/api/entradillas/${id}`, { method: "DELETE", headers: { "x-clave": clave } }).catch(() => null);
    setOcupado(null);
    if (res?.ok) setLista((await res.json()).entradillas);
  }

  if (!lista) return <p>Cargando…</p>;
  if (!lista.length) return <p>Ninguna todavía.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {lista.toReversed().map((e) => (
        <li key={e.id} className="flex flex-col gap-2 border-2 border-black p-3">
          <p className="font-mono text-xs uppercase">
            {temas[e.track] ?? "Una canción que ya no está en la radio"} · {cuando(e.at)}
          </p>
          <audio controls preload="none" src={`/api/entradillas/${e.id}`} className="w-full" />
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs uppercase">
            {/* Como en antena: la canción desde el principio, más baja, con la entradilla encima */}
            <button
              onClick={() => setAviso(oirEntradilla(e.id, e.track) ? null : { id: e.id, texto: "Esa canción no está en la cadena que suena: cambia a la suya para oírla" })}
              className="bg-black px-3 py-1.5 font-bold text-accent hover:opacity-80"
            >
              Oír con su canción
            </button>
            <button disabled={ocupado === e.id} onClick={() => borrar(e.id)} className="border-2 border-black px-3 py-1 hover:bg-black hover:text-accent disabled:opacity-50">
              Borrar
            </button>
            {aviso?.id === e.id && <span className="normal-case">{aviso.texto}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function Cola({ temas }: { temas: Record<string, string> }) {
  const [clave, setClave] = useStored(CLAVE_KEY);
  const [escrita, setEscrita] = useState("");
  const [audios, setAudios] = useState<Audio[] | null>(null);
  const [error, setError] = useState("");

  // Sin la clave buena la API solo da los aprobados, sin el campo aprobado
  const [mala, setMala] = useState(false);

  useEffect(() => {
    if (!clave) return;
    let vale = true;
    fetch("/api/buzon", { headers: { "x-clave": clave } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(({ audios }: { audios: (Audio | { id: string; at: string })[] }) => {
        if (!vale) return;
        const buena = audios.every((a) => "aprobado" in a);
        setMala(!buena);
        setError("");
        setAudios(buena ? (audios as Audio[]) : null);
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
          aria-label="Clave del buzón"
          autoFocus
          className="w-64 border-2 border-black bg-transparent px-2 py-1.5 font-mono"
        />
        <button className="bg-black px-4 py-1.5 font-mono text-sm font-bold uppercase text-accent">Entrar</button>
        {mala && <p className="text-sm">Clave incorrecta</p>}
      </form>
    );

  if (!audios) return <p className="text-center">{error || "Cargando…"}</p>;

  const pendientes = audios.filter((a) => !a.aprobado).toReversed();
  const aprobados = audios.filter((a) => a.aprobado);
  return (
    <>
      <p>
        {REVISAR ? "Los aprobados" : "Entran directos, sin revisión. Todos"} se pueden escuchar desde la portada, y detrás de cada cortinilla suena uno en
        antena, primero los que ese oyente aún no ha oído. Se borran solos a los 7 días de grabarse; aquí puedes borrar antes el que sobre.
      </p>
      {/* Sin revisión (REVISAR en lib/buzon-reglas.ts) todos llegan aprobados y esta parte no sale */}
      {(REVISAR || pendientes.length > 0) && (
        <>
          <h2 className="font-display text-3xl uppercase">Por revisar ({pendientes.length})</h2>
          {pendientes.length ? (
            <ul className="flex flex-col gap-3">
              {pendientes.map((a) => (
                <Fila key={a.id} audio={a} clave={clave} onCambio={setAudios} />
              ))}
            </ul>
          ) : (
            <p>Nada nuevo.</p>
          )}
        </>
      )}
      <h2 className="font-display text-3xl uppercase">En el buzón ({aprobados.length})</h2>
      {aprobados.length ? (
        <ul className="flex flex-col gap-3">
          {aprobados.map((a) => (
            <Fila key={a.id} audio={a} clave={clave} onCambio={setAudios} />
          ))}
        </ul>
      ) : (
        <p>Ninguno aprobado.</p>
      )}
      <h2 className="font-display text-3xl uppercase">Entradillas</h2>
      <p>Suenan encima del principio de su canción cada vez que sale. No caducan.</p>
      <Entradillas clave={clave} temas={temas} />
      <button onClick={() => setClave("")} className="self-center font-mono text-xs uppercase underline">
        Salir
      </button>
    </>
  );
}
