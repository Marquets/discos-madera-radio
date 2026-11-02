"use client";

import { useEffect, useRef } from "react";

const EVERY_MS = 280; // a new drawing this often
const RING = [0.55, 1.6]; // how far from the logo's centre, in logo widths

/**
 * The "dibus" jingle animation: while it plays, Adri's drawings keep popping up round the
 * logo in the middle of the screen, wobble a little and fade. RadioPlayer only sets
 * data-anim on <html>, so this watches for it.
 */
export function CortinillaDibus() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = ref.current;
    if (!layer || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    let timer: ReturnType<typeof setInterval> | undefined;
    let angle = Math.random() * 2 * Math.PI;

    const pop = () => {
      // The logo has travelled to the middle of the screen by now
      const logo = document.querySelector('header a[href="/"] svg')?.getBoundingClientRect();
      if (!logo) return;
      // Round the logo by a bit more than a third of a turn each time, so they spread out
      angle += 2.2 + Math.random() * 0.6;
      const reach = logo.width * (RING[0] + Math.random() * (RING[1] - RING[0]));
      popDibu(layer, logo.left + logo.width / 2 + Math.cos(angle) * reach, logo.top + logo.height / 2 + Math.sin(angle) * reach * 0.7);
    };

    const watch = new MutationObserver(() => {
      const on = root.dataset.anim === "dibus";
      if (on && !timer) timer = setInterval(pop, EVERY_MS);
      if (!on && timer) {
        clearInterval(timer);
        timer = undefined;
      }
    });
    watch.observe(root, { attributes: true, attributeFilter: ["data-anim"] });
    return () => {
      watch.disconnect();
      clearInterval(timer);
    };
  }, []);

  return <div ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[15] overflow-hidden" />;
}

export const DRAWINGS = 32; // public/dibus/01.webp … 32.webp, Adri's drawings
let previous = 0;

/** A random one of Adri's drawings as a CSS url(), never the same twice in a row. */
export function randomDibu() {
  let n = previous;
  while (n === previous) n = 1 + Math.floor(Math.random() * DRAWINGS);
  previous = n;
  return `url(/dibus/${String(n).padStart(2, "0")}.webp)`;
}

/** One of Adri's drawings popping up at x, y in a layer, wobbling and fading (.dibu in globals.css). */
export function popDibu(layer: HTMLElement, x: number, y: number) {
  // The drawing cuts out an orange square, so it comes out the logo's exact colour
  const dibu = document.createElement("div");
  dibu.className = "dibu";
  dibu.style.setProperty("--dibu", randomDibu());
  dibu.style.left = `${x}px`;
  dibu.style.top = `${y}px`;
  dibu.style.setProperty("--turn", `${Math.random() * 40 - 20}deg`);
  dibu.addEventListener("animationend", () => dibu.remove());
  layer.append(dibu);
}
