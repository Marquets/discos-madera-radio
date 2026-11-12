"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MAX_SEC, MAX_SUBIDA, REVISAR } from "@/lib/buzon-reglas";
import { BUZON_NUEVO } from "./buzonEstado";

type Estado = { fase: "elegir" } | { fase: "pidiendo" } | { fase: "grabando"; desde: number } | { fase: "lista"; audio: Blob; url: string } | { fase: "enviando"; audio: Blob; url: string };

// Opus en WebM donde se puede (Chrome, Firefox), AAC en MP4 en Safari; los dos suenan en todos
const TIPOS = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"];

const sinSuscripcion = () => () => {};
/** Hace falta micrófono y MediaRecorder, y solo se sabe en el navegador */
export const usePuedeGrabar = () =>
  useSyncExternalStore(
    sinSuscripcion,
    () => typeof MediaRecorder !== "undefined" && !!navigator.mediaDevices?.getUserMedia,
    () => false,
  );

export function Microfono({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={`size-3.5 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
      <rect x="5.5" y="1.5" width="5" height="8" rx="2.5" fill="currentColor" />
      <path d="M3 7.5a5 5 0 0 0 10 0M8 12.5v2.5M5.5 15h5" />
    </svg>
  );
}

const reloj = (s: number) => `0:${String(Math.max(0, Math.ceil(s))).padStart(2, "0")}`;

/**
 * Graba un mensaje de hasta MAX_SEC segundos para el buzón, o sube uno ya grabado de hasta
 * MAX_SUBIDA, deja oírlo y lo manda.
 */
export function Grabadora({ onClose, onStatus }: { onClose: () => void; onStatus: (s: string) => void }) {
  const [estado, setEstado] = useState<Estado>({ fase: "elegir" });
  const [ahora, setAhora] = useState(0);
  const recorder = useRef<MediaRecorder>(null);
  const escucha = useRef<HTMLAudioElement>(null);
  const [sonando, setSonando] = useState(false);

  // Falsa en cuanto se cierra: un micro concedido después ya no tiene a quién grabar
  const abierta = useRef(true);

  async function grabar() {
    setEstado({ fase: "pidiendo" });
    onStatus("");
    // La radio sigue sonando mientras hablas; la cancelación de eco la quita de la grabación
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).catch(() => {
      onStatus("Sin permiso para usar el micrófono; puedes subir un audio");
      setEstado({ fase: "elegir" });
      return null;
    });
    if (!stream) return;
    if (!abierta.current) return stream.getTracks().forEach((t) => t.stop());
    const mimeType = TIPOS.find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stream, { ...(mimeType && { mimeType }), audioBitsPerSecond: 64_000 });
    const trozos: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && trozos.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      recorder.current = null;
      // Cerrada a mitad de grabación: no queda nada que enseñar
      if (rec.state === "inactive" && !trozos.length) return;
      const audio = new Blob(trozos, { type: rec.mimeType || mimeType || "audio/webm" });
      setEstado({ fase: "lista", audio, url: URL.createObjectURL(audio) });
    };
    recorder.current = rec;
    rec.start();
    const desde = Date.now();
    setAhora(desde);
    setEstado({ fase: "grabando", desde });
  }

  /** Para la grabación sin quedarse con lo grabado */
  function cortar() {
    const rec = recorder.current;
    if (!rec) return;
    recorder.current = null;
    rec.ondataavailable = null;
    rec.onstop = null;
    rec.stop();
    rec.stream.getTracks().forEach((t) => t.stop());
  }

  // Un audio ya grabado sustituye a la grabación
  function subir(file: File) {
    if (!file.type.startsWith("audio/")) return onStatus("Eso no es un audio");
    const url = URL.createObjectURL(file);
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => {
      if (a.duration > MAX_SUBIDA + 0.5) {
        URL.revokeObjectURL(url);
        return onStatus(`Tiene que durar ${MAX_SUBIDA} s como mucho`);
      }
      onStatus("");
      setEstado({ fase: "lista", audio: file, url });
    };
    a.onerror = () => {
      URL.revokeObjectURL(url);
      onStatus("Este navegador no puede abrir ese audio");
    };
    a.src = url;
  }

  useEffect(() => {
    abierta.current = true;
    return () => {
      abierta.current = false;
      cortar();
    };
  }, []);

  // La cuenta atrás, y el corte a los MAX_SEC segundos
  const grabando = estado.fase === "grabando";
  useEffect(() => {
    if (!grabando) return;
    const id = setInterval(() => {
      const t = Date.now();
      setAhora(t);
      if (t - (estado as { desde: number }).desde >= MAX_SEC * 1000) recorder.current?.stop();
    }, 200);
    return () => clearInterval(id);
  }, [grabando, estado]);

  const url = "url" in estado ? estado.url : null;
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  async function enviar() {
    if (estado.fase !== "lista") return;
    setEstado({ ...estado, fase: "enviando" });
    const res = await fetch("/api/buzon", { method: "POST", headers: { "Content-Type": estado.audio.type }, body: estado.audio }).catch(() => null);
    if (res?.ok) {
      if (REVISAR) onStatus("Recibido. Si pasa la revisión, estará en el buzón y sonará en la radio");
      else {
        onStatus("¡Ya está en el buzón! Dale a los cascos para oírlo");
        // Que los cascos lo cuenten ya, sin esperar a la próxima vuelta del reproductor
        window.dispatchEvent(new Event(BUZON_NUEVO));
      }
      return onClose();
    }
    setEstado({ ...estado, fase: "lista" });
    if (res?.status === 429) onStatus(`Puedes dejar otro en ${Math.ceil((await res.json()).wait / 60_000)} min`);
    else if (res?.status === 503) onStatus("El buzón está lleno, prueba mañana");
    else if (res?.status === 413) onStatus("Es demasiado largo");
    else onStatus("No se ha podido enviar");
  }

  const oir = () => {
    const a = escucha.current;
    if (!a) return;
    if (a.paused) {
      a.currentTime = 0;
      a.play().catch(() => {});
    } else a.pause();
  };

  const boton = "px-3 py-1.5 hover:text-white";
  return (
    <div role="group" aria-label="Buzón de voz" onKeyDown={(e) => e.key === "Escape" && onClose()} className="flex flex-wrap items-center gap-2">
      {estado.fase === "pidiendo" && <span className="py-1.5">Abriendo el micrófono…</span>}
      {estado.fase === "elegir" && (
        <>
          <button autoFocus onClick={grabar} className="flex items-center gap-2 bg-accent px-3 py-1.5 font-bold text-black hover:bg-white">
            <span aria-hidden className="size-2 rounded-full bg-red-600" />
            Grabar
          </button>
          <label className={`cursor-pointer border border-accent focus-within:text-white ${boton}`}>
            Subir audio
            <input type="file" accept="audio/*" className="sr-only" onChange={(e) => {
                const file = e.target.files?.[0];
                // Así se puede volver a elegir el mismo archivo
                e.target.value = "";
                if (file) subir(file);
              }} />
          </label>
        </>
      )}
      {estado.fase === "grabando" && (
        <>
          <span className="flex items-center gap-2 py-1.5" aria-live="off">
            <span aria-hidden className="size-2 animate-pulse rounded-full bg-red-500" />
            Grabando · {reloj(MAX_SEC - (ahora - estado.desde) / 1000)}
          </span>
          <button autoFocus onClick={() => recorder.current?.stop()} className="bg-accent px-3 py-1.5 font-bold text-black hover:bg-white">
            Parar
          </button>
        </>
      )}
      {(estado.fase === "lista" || estado.fase === "enviando") && (
        <>
          <audio ref={escucha} src={estado.url} onPlay={() => setSonando(true)} onPause={() => setSonando(false)} onEnded={() => setSonando(false)} />
          <button onClick={oir} aria-pressed={sonando} className={`border border-accent ${boton}`}>
            {sonando ? "■ Parar" : "▶ Escuchar"}
          </button>
          <button
            onClick={() => {
              setEstado({ fase: "elegir" });
              onStatus("");
            }}
            disabled={estado.fase === "enviando"} className={boton}>
            Otra vez
          </button>
          <button autoFocus onClick={enviar} disabled={estado.fase === "enviando"} className="bg-accent px-3 py-1.5 font-bold text-black hover:bg-white disabled:opacity-60">
            {estado.fase === "enviando" ? "Enviando…" : "Enviar"}
          </button>
        </>
      )}
      <button type="button" onClick={onClose} aria-label="Cerrar" className="px-1 py-1.5 text-base leading-none hover:text-white">
        ×
      </button>
    </div>
  );
}
