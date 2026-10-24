"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import type { Message } from "@/lib/messages";
import { useStored } from "./useStored";

// No websockets on Netlify functions, so everyone else's messages arrive by polling
const POLL_MS = 30_000;
const HIDDEN_KEY = "mensajes-ocultos";

// Stable per message, so a poll doesn't change each one's speed
function hash(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

/** Messages drifting across the hero, plus the box to leave one and the switch to hide them */
export function Mensajes({ maxLength }: { maxLength: number }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [hiddenFlag, setHiddenFlag] = useStored(HIDDEN_KEY);
  const hidden = hiddenFlag === "1";
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  // The box to write one stays folded behind a button until someone wants it
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/mensajes").catch(() => null);
      if (res?.ok) setMessages((await res.json()).messages);
    };
    // Always on arrival, even in a tab opened in the background; after that only while in view
    load();
    const id = setInterval(() => document.hidden || load(), POLL_MS);
    return () => clearInterval(id);
  }, []);

  const toggle = () => setHiddenFlag(hidden ? "0" : "1");

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const res = await fetch("/api/mensajes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) }).catch(() => null);
    if (res?.ok) {
      setMessages((await res.json()).messages);
      setText("");
      setStatus("");
      setOpen(false);
      // Sending one means wanting to see it float
      if (hidden) toggle();
    } else if (res?.status === 429) setStatus(`Puedes dejar otro en ${Math.ceil((await res.json()).wait / 1000)} s`);
    else setStatus("No se ha podido enviar");
  }

  return (
    <>
      {!hidden && (
        <ul aria-label="Mensajes de los oyentes" className="pointer-events-none absolute inset-0 overflow-hidden">
          {messages.map((m, i) => {
            const h = hash(m.id);
            // Each message crosses the hero along its own line, at its own angle, from well off
            // one edge to well off the other, and then comes back the same way
            const angle = ((h % 360) * Math.PI) / 180;
            const dx = Math.cos(angle);
            const dy = Math.sin(angle);
            const reach = 120 / Math.max(Math.abs(dx), Math.abs(dy));
            const cx = 30 + ((h >> 9) % 40);
            // Golden-ratio steps spread consecutive messages over the height
            const cy = Math.round(20 + ((i * 0.618) % 1) * 60);
            const duration = 50 + ((h >> 11) % 40);
            return (
              <li
                key={m.id}
                className="mensaje absolute w-max font-mono text-xs uppercase text-accent sm:text-sm"
                style={{
                  "--cx": `${cx}%`,
                  "--cy": `${cy}%`,
                  "--x0": `${cx - dx * reach}%`,
                  "--x1": `${cx + dx * reach}%`,
                  "--y0": `${cy - dy * reach}%`,
                  "--y1": `${cy + dy * reach}%`,
                  animationDuration: `${duration}s`,
                  // Negative, so on arrival they're already spread along their way
                  animationDelay: `-${(h >> 5) % (2 * duration)}s`,
                } as CSSProperties}
              >
                {m.text}
              </li>
            );
          })}
        </ul>
      )}
      {/* Abajo a la izquierda del hero, fuera del flujo, para no mover el conjunto centrado */}
      <div className="absolute bottom-4 left-4 flex w-[min(28rem,calc(100%-2rem))] flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs uppercase sm:left-8">
        {!open && (
          <button onClick={() => setOpen(true)} aria-expanded={false} className="py-1.5 hover:text-white">
            + Deja un mensaje
          </button>
        )}
        {/* Grows sideways from nothing when opened; inert while folded so Tab skips it */}
        <form
          onSubmit={send}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          inert={!open}
          className={`flex items-center gap-2 overflow-hidden transition-[max-width,opacity] duration-500 ease-out motion-reduce:transition-none ${open ? "max-w-md flex-1 opacity-100" : "max-w-0 opacity-0"}`}
        >
          <input
            ref={input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={maxLength}
            placeholder="Tu mensaje"
            aria-label="Deja un mensaje"
            className="min-w-0 flex-1 border border-accent bg-black px-2 py-1.5 text-accent placeholder:text-accent/50 focus-visible:outline-2 focus-visible:outline-accent"
          />
          <button className="bg-accent px-3 py-1.5 font-bold text-black hover:bg-white">Enviar</button>
          <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="px-1 py-1.5 text-base leading-none hover:text-white">
            ×
          </button>
        </form>
        {!open && (
          <button onClick={toggle} aria-pressed={hidden} className="py-1.5 text-accent/60 hover:text-white">
            {hidden ? "Ver mensajes" : "Ocultar mensajes"}
          </button>
        )}
        <p aria-live="polite" className="order-first w-full empty:hidden">
          {status}
        </p>
      </div>
    </>
  );
}
