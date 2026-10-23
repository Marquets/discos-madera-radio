"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";

type Props = { initial: string; cols: number; rows: number; palette: { hex: string; name: string }[]; cooldownMs: number; children: ReactNode };

// No websockets on Netlify functions, so everyone else's pixels arrive by polling
const POLL_MS = 10_000;

export function Lienzo({ initial, cols, rows, palette, cooldownMs, children }: Props) {
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
      ctx.fillRect(i % cols, Math.floor(i / cols), 1, 1);
    }
    if (cursor !== null) {
      ctx.fillStyle = palette[color].hex;
      ctx.fillRect(cursor % cols, Math.floor(cursor / cols), 1, 1);
    }
  }, [pixels, cursor, color, cols, palette]);

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
    const x = Math.min(cols - 1, Math.floor(((e.clientX - r.left) / r.width) * cols));
    const y = Math.min(rows - 1, Math.floor(((e.clientY - r.top) / r.height) * rows));
    return y * cols + x;
  }

  function onKeyDown(e: KeyboardEvent<HTMLCanvasElement>) {
    const at = cursor ?? Math.floor(rows / 2) * cols + Math.floor(cols / 2);
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols };
    if (e.key in moves) {
      e.preventDefault();
      const next = at + moves[e.key];
      // Left and right stop at the row's edge instead of wrapping onto the next row
      const sameRow = Math.floor(next / cols) === Math.floor(at / cols) || Math.abs(moves[e.key]) === cols;
      if (next >= 0 && next < cols * rows && sameRow) setCursor(next);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      paint(at);
    }
  }

  const x = cursor === null ? null : (cursor % cols) + 1;
  const y = cursor === null ? null : Math.floor(cursor / cols) + 1;

  return (
    <div className="relative size-full">
      {/* Stretched to fill whatever space the screen leaves: everyone shares one grid, so on a
          screen shaped unlike it the pixels come out as rectangles rather than squares */}
      <canvas
        ref={canvas}
        width={cols}
        height={rows}
        tabIndex={0}
        role="img"
        aria-label={`Lienzo compartido de ${cols} por ${rows} píxeles. Muévete con las flechas y pinta con Enter.`}
        onPointerMove={(e) => setCursor(pixelAt(e))}
        onPointerLeave={() => setCursor(null)}
        onClick={(e) => paint(pixelAt(e))}
        onKeyDown={onKeyDown}
        className={`block size-full border-t border-accent bg-black [image-rendering:pixelated] focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-accent ${wait ? "cursor-not-allowed" : "cursor-crosshair"}`}
      />
      <div className="absolute bottom-4 left-4 flex flex-col gap-3 bg-black/80 p-3 font-mono text-xs uppercase sm:left-8">
        <div role="radiogroup" aria-label="Color" className="flex flex-wrap gap-1.5">
          {palette.map((c, i) => (
            <button
              key={c.hex}
              role="radio"
              aria-checked={i === color}
              aria-label={c.name}
              onClick={() => setColor(i)}
              style={{ backgroundColor: c.hex }}
              className="size-7 border-2 border-accent/50 aria-checked:outline-3 aria-checked:outline-offset-2 aria-checked:outline-accent"
            />
          ))}
        </div>
        <p aria-live="polite">
          {wait ? `Puedes volver a pintar en ${wait} s` : "Elige un color y pinta un píxel"}
          {x !== null && ` · ${x}, ${y}`}
        </p>
        {children}
      </div>
    </div>
  );
}
