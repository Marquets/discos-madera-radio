"use client";

import { useEffect, useRef } from "react";
import { useCadena } from "./useCadena";

const PER_PX = 1 / 9000; // flakes per square pixel of window: about 230 on a laptop screen
const MAX_FLAKES = 400;

type Flake = { x: number; y: number; r: number; fall: number; sway: number; phase: number; alpha: number };

/**
 * Snow falling over the whole site, on the channels that have it (`en`, by id). A fixed canvas that lets clicks
 * through, under the player, the menu and the jingle drawings so it never covers them.
 * Bigger flakes fall faster and are brighter, so it reads as depth.
 */
export function Nieve({ en }: { en: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const cadena = useCadena();
  const nieva = cadena !== null && en.includes(cadena);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!nieva) return;
    if (!canvas || !ctx || matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let w = 0;
    let h = 0;
    let flakes: Flake[] = [];

    const flake = (y: number): Flake => {
      const r = 1 + Math.random() ** 2 * 3;
      return {
        x: Math.random() * w,
        y,
        r,
        fall: 20 + r * 18, // px a second
        sway: 10 + Math.random() * 25,
        phase: Math.random() * 2 * Math.PI,
        alpha: 0.45 + (r / 4) * 0.5,
      };
    };

    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = innerWidth;
      h = innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(MAX_FLAKES, Math.round(w * h * PER_PX));
      flakes = flakes.slice(0, count);
      while (flakes.length < count) flakes.push(flake(Math.random() * h));
    };

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      // Capped so a tab coming back from the background doesn't make the snow jump
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#fff";
      for (const f of flakes) {
        f.y += f.fall * dt;
        f.phase += dt;
        if (f.y - f.r > h) Object.assign(f, flake(-f.r));
        ctx.globalAlpha = f.alpha;
        ctx.beginPath();
        ctx.arc(f.x + Math.sin(f.phase) * f.sway, f.y, f.r, 0, 2 * Math.PI);
        ctx.fill();
      }
      frame = requestAnimationFrame(tick);
    };

    resize();
    addEventListener("resize", resize);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("resize", resize);
    };
  }, [nieva]);

  if (!nieva) return null;
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[5] h-full w-full" />;
}
