"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { nowPlaying } from "@/lib/schedule";

type DeckTrack = { title: string; artist: string; durationSec: number; cover?: string };

// Discos Madera poster palette: orange on black
const CREAM = "#f89028";
const TAPE = "#5a3410";
const WIRE = "#8a5520";
const HEAD_X = 368;
const REEL = { empty: 52, full: 92 };

function useClock() {
  const [now, setNow] = useState<number | null>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(reduce);
    if (reduce) {
      setNow(Date.now());
      const id = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(id);
    }
    let frame = requestAnimationFrame(function tick() {
      setNow(Date.now());
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return { now, reduced };
}

function Reel({ cx, tape, angle }: { cx: number; tape: number; angle: number }) {
  return (
    <g transform={`translate(${cx} 160)`}>
      <circle r="95" fill="none" stroke={CREAM} strokeWidth="3" />
      <circle r={tape} fill={TAPE} />
      <g transform={`rotate(${angle})`}>
        <line y1="-95" y2="-52" stroke={CREAM} strokeWidth="3" />
        <line y1="52" y2="95" stroke={CREAM} strokeWidth="3" />
        <circle r="50" fill={CREAM} />
        <circle r="24" fill="#000" />
        {[0, 120, 240].map((a) => (
          <rect key={a} x="-3" y="-32" width="6" height="12" fill="#000" transform={`rotate(${a})`} />
        ))}
        <circle r="5" fill={CREAM} />
      </g>
    </g>
  );
}

export function TapeDeck({ tracks }: { tracks: DeckTrack[] }) {
  const { now, reduced } = useClock();
  const np = now === null ? null : nowPlaying(tracks.map((t) => t.durationSec), now);
  const track = np ? tracks[np.index] : null;
  const elapsed = np?.offsetSec ?? 0;
  const progress = track ? elapsed / track.durationSec : 0;

  // Tape moves from the left reel to the right one; the emptier reel spins faster, like a real deck
  const left = REEL.empty + (REEL.full - REEL.empty) * (1 - progress);
  const right = REEL.empty + (REEL.full - REEL.empty) * progress;
  const spin = reduced ? 0 : elapsed * 6000;

  return (
    <figure className="mx-auto w-full max-w-4xl">
      {/* Recortado por arriba: el lienzo guardaba el hueco del minutero que ya no está */}
      <svg viewBox="0 58 736 262" role="img" aria-label={track ? `Sonando: ${track.title} de ${track.artist}` : "Magnetófono de la radio"} className="block w-full rounded-xl bg-black">
        {[-2, -1, 0, 1, 2].map((i) => (
          <line key={i} x1={HEAD_X + i * 18} x2={HEAD_X + i * 18} y1="88" y2={i === 0 ? "106" : "100"} stroke={i === 0 ? CREAM : WIRE} strokeWidth="3" />
        ))}
        <path d="M352 145 l18 -12 v24 z M372 145 l18 -12 v24 z" fill={CREAM} transform="rotate(180 371 145)" />

        <Reel cx={200} tape={left} angle={spin / left} />
        <Reel cx={540} tape={right} angle={spin / right} />

        <polyline points={`${200 - 40},${160 + left * 0.9} 195,287 255,282 ${HEAD_X},272 480,282 540,287 ${540 + 40},${160 + right * 0.9}`} fill="none" stroke={WIRE} strokeWidth="2" />
        <circle cx="195" cy="287" r="7" fill={WIRE} />
        <circle cx="255" cy="282" r="12" fill="#000" stroke={CREAM} strokeWidth="2.5" />
        <circle cx="480" cy="282" r="12" fill="#000" stroke={CREAM} strokeWidth="2.5" />
        <circle cx="540" cy="287" r="7" fill={WIRE} />
        <rect x={HEAD_X - 17} y="260" width="34" height="28" fill={CREAM} />
      </svg>
      {track && (
        <figcaption className="mt-4 flex items-center justify-center gap-4 uppercase">
          {track.cover && <Image src={track.cover} alt="" width={64} height={64} className="size-16 shrink-0 object-cover" />}
          <span className="flex flex-col gap-1">
            <span className="flex items-center gap-2 font-mono text-[10px] tracking-[0.3em]">
              <span className="size-1.5 rounded-full bg-black motion-safe:animate-pulse" /> Now playing
            </span>
            <span className="font-display text-2xl leading-tight">
              {track.title} <span className="font-mono text-lg">— {track.artist}</span>
            </span>
          </span>
        </figcaption>
      )}
    </figure>
  );
}
