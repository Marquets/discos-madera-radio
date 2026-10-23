"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";

type Props = { initial: string; size: number; palette: { hex: string; name: string }[]; cooldownMs: number };

// No websockets on Netlify functions, so everyone else's pixels arrive by polling
const POLL_MS = 10_000;

export function Lienzo({ initial, size, palette, cooldownMs }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [pixels, setPixels] = useState(initial);
  const [color, setColor] = useState(1);
  const [cursor, setCursor] = useState<number | null>(null);
  const [readyAt, setReadyAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const wait = Math.ceil(Math.max(0, readyAt - now) / 1000);

  useEffect(() => {
    const ctx = canvas.current!.getContext("2d")!;
    for (let i = 0; i < pixels.length; i++) {
      ctx.fillStyle = palette[parseInt(pixels[i], 16)].hex;
      ctx.fillRect(i % size, Math.floor(i / size), 1, 1);
    }
    if (cursor !== null) {
      ctx.fillStyle = palette[color].hex;
      ctx.fillRect(cursor % size, Math.floor(cursor / size), 1, 1);
    }
  }, [pixels, cursor, color, size, palette]);

  useEffect(() => {
    const id = setInterval(async () => {
      if (document.hidden) return;
      const res = await fetch("/api/lienzo").catch(() => null);
      if (res?.ok) setPixels((await res.json()).pixels);
    }, POLL_MS);
    return () => clearInterval(id);
  }, []);

  // Only ticks while there is a countdown to show
  useEffect(() => {
    if (readyAt <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [readyAt]);

  async function paint(index: number) {
    if (Date.now() < readyAt) return;
    setPixels((p) => p.slice(0, index) + color.toString(16) + p.slice(index + 1));
    setReadyAt(Date.now() + cooldownMs);
    setNow(Date.now());
    const res = await fetch("/api/lienzo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ index, color }) }).catch(() => null);
    if (res?.ok) setPixels((await res.json()).pixels);
    else if (res?.status === 429) setReadyAt(Date.now() + (await res.json()).wait);
  }

  function pixelAt(e: MouseEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.min(size - 1, Math.floor(((e.clientX - r.left) / r.width) * size));
    const y = Math.min(size - 1, Math.floor(((e.clientY - r.top) / r.height) * size));
    return y * size + x;
  }

  function onKeyDown(e: KeyboardEvent<HTMLCanvasElement>) {
    const at = cursor ?? (size * size) / 2 + size / 2;
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -size, ArrowDown: size };
    if (e.key in moves) {
      e.preventDefault();
      const next = at + moves[e.key];
      // Left and right stop at the row's edge instead of wrapping onto the next row
      const sameRow = Math.floor(next / size) === Math.floor(at / size) || Math.abs(moves[e.key]) === size;
      if (next >= 0 && next < size * size && sameRow) setCursor(next);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      paint(at);
    }
  }

  const x = cursor === null ? null : (cursor % size) + 1;
  const y = cursor === null ? null : Math.floor(cursor / size) + 1;

  return (
    <div className="mx-auto flex w-full max-w-[min(36rem,60svh)] flex-col items-center gap-6">
      <canvas
        ref={canvas}
        width={size}
        height={size}
        tabIndex={0}
        role="img"
        aria-label={`Lienzo compartido de ${size} por ${size} píxeles. Muévete con las flechas y pinta con Enter.`}
        onPointerMove={(e) => setCursor(pixelAt(e))}
        onPointerLeave={() => setCursor(null)}
        onClick={(e) => paint(pixelAt(e))}
        onKeyDown={onKeyDown}
        className={`aspect-square w-full bg-black [image-rendering:pixelated] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-black ${wait ? "cursor-not-allowed" : "cursor-crosshair"}`}
      />
      <div role="radiogroup" aria-label="Color" className="flex flex-wrap justify-center gap-2">
        {palette.map((c, i) => (
          <button
            key={c.hex}
            role="radio"
            aria-checked={i === color}
            aria-label={c.name}
            onClick={() => setColor(i)}
            style={{ backgroundColor: c.hex }}
            className="size-9 border-2 border-black aria-checked:outline-4 aria-checked:outline-offset-2 aria-checked:outline-black"
          />
        ))}
      </div>
      <p className="font-mono text-sm uppercase" aria-live="polite">
        {wait ? `Puedes volver a pintar en ${wait} s` : "Elige un color y pinta un píxel"}
        {x !== null && ` · ${x}, ${y}`}
      </p>
    </div>
  );
}
