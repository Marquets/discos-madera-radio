"use client";

import { useEffect, useRef, useState } from "react";
import { quienLoTrajo } from "@/lib/contributors";
import { ENERGY, type Energy } from "@/lib/franjas";
import { nowPlaying } from "@/lib/schedule";
import { DRAWINGS } from "./CortinillaDibus";

type DeckTrack = { id: string; title: string; artist: string; durationSec: number; firstSeenAt: string; addedBy?: string; cortesia?: string; energy?: Energy | null };

// Discos Madera poster palette, from the theme colours in globals.css
const CREAM = "var(--color-accent)";
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

// The meter over the head. The players live in Spotify's and YouTube's iframes, which don't
// let the page hear the music, so the bars dance to a made-up signal instead: a beat at the
// song's pace plus a wobble per bar, livelier the livelier the song (lib/franjas.ts).
const METER = {
  // floor + amp is the most it reaches: calm songs stay mid-height, lively ones reach the top
  tranquila: { bps: 1.1, floor: 0.12, amp: 0.6 },
  media: { bps: 1.6, floor: 0.2, amp: 0.75 },
  animada: { bps: 2.1, floor: 0.28, amp: 0.8 },
} as const;
// The bars stand on a common base and grow upwards; lengths at rest, least and most, the middle
// one longer. The base sits just clear of the drawing under it (y 133.5)
const METER_BASE = 122;
const BAR = { rest: 12, min: 2, max: 38 };
const BAR_MID = { rest: 18, min: 4, max: 44 };

function meterLength(i: number, t: number, energy: Energy) {
  const { bps, floor, amp } = METER[energy];
  const bar = i === 0 ? BAR_MID : BAR;
  // A kick on every beat that dies away, a little late on the outer bars
  const beat = Math.exp(-(((t * bps - Math.abs(i) * 0.06) % 1) + 1) % 1 * 4);
  // Each bar wobbles at its own speeds, so they never move in step
  const wobble = 0.5 + 0.25 * Math.sin(t * (3.1 + i * 0.7) + i * 1.9) + 0.25 * Math.sin(t * (7.3 - i * 1.1) + i * 4.2);
  const level = Math.min(1, floor + amp * (0.6 * beat + 0.4 * wobble));
  return bar.min + (bar.max - bar.min) * level;
}

function MeterBar({ i, length }: { i: number; length: number }) {
  const x = HEAD_X + i * 18;
  return <line x1={x} x2={x} y1={METER_BASE} y2={METER_BASE - length} stroke={i === 0 ? CREAM : WIRE} strokeWidth="3" />;
}

/** Whether the radio has a song loaded, from the player's box in the layout (RadioPlayer.tsx) */
function useSonando() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const check = () => setOn(!!document.querySelector("#radio[data-on]"));
    check();
    const watch = new MutationObserver(check);
    watch.observe(document.body, { subtree: true, childList: true, attributeFilter: ["data-on"] });
    return () => watch.disconnect();
  }, []);
  return on;
}

type Point = [number, number];

/**
 * Where the tape leaves a reel's pack for a guide post: the outer tangent of the two circles,
 * on the side away from the deck's middle (`side` -1 left, 1 right). Returns the point on the
 * pack and the point on the post.
 */
function tapeTangent(pack: Point, packR: number, post: Point, postR: number, side: -1 | 1): [Point, Point] {
  // A line n·x = c touching both circles from the same side has n·(pack − post) = packR − postR
  const vx = pack[0] - post[0];
  const vy = pack[1] - post[1];
  const base = Math.atan2(vy, vx);
  const turn = Math.acos((packR - postR) / Math.hypot(vx, vy));
  const normals = [base + turn, base - turn].map((a) => [Math.cos(a), Math.sin(a)] as Point);
  // The touching points are centre − r·n, so the outer side wants n pointing back inwards
  const [nx, ny] = normals.sort((a, b) => side * (a[0] - b[0]))[0];
  return [
    [pack[0] - packR * nx, pack[1] - packR * ny],
    [post[0] - postR * nx, post[1] - postR * ny],
  ];
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
        <circle r="24" fill="var(--color-black)" />
        {[0, 120, 240].map((a) => (
          <rect key={a} x="-3" y="-32" width="6" height="12" fill="var(--color-black)" transform={`rotate(${a})`} />
        ))}
        <circle r="5" fill={CREAM} />
      </g>
    </g>
  );
}

const dibuUrl = (n: number) => `url(/dibus/${String(n).padStart(2, "0")}.webp)`;
const TRUNK = 25; // the tree trunk with a face, the one it shows to begin with

/**
 * One of Adri's drawings in the gap between the reels, the trunk to begin with. Hovering
 * the tape deck or the logo runs through all of them like a gif; leaving stops on
 * whichever was showing.
 */
function ReelDibu() {
  const [n, setN] = useState(TRUNK);
  const spot = useRef<SVGForeignObjectElement>(null);

  useEffect(() => {
    const deck = spot.current?.ownerSVGElement;
    const logo = document.querySelector('header a[href="/"]');
    const areas = [deck, logo].filter((el): el is Element => !!el);
    let timer: ReturnType<typeof setInterval> | undefined;

    const hovered = () => areas.some((el) => el.matches(":hover"));
    const stop = () => {
      clearInterval(timer);
      timer = undefined;
    };
    const play = () => {
      if (timer) return;
      timer = setInterval(() => {
        // Going straight into the player's iframe never reports leaving, so check
        if (!hovered()) return stop();
        setN((m) => (m % DRAWINGS) + 1);
      }, 110);
    };
    // Moving from one area to the other leaves one first, so look before stopping
    const leave = () => setTimeout(() => !hovered() && stop());
    // The screensaver always shows the trunk (Salvapantallas.tsx)
    const trunk = () => {
      stop();
      setN(TRUNK);
    };
    addEventListener("radio:salvapantallas", trunk);

    for (const el of areas) {
      el.addEventListener("pointerenter", play);
      el.addEventListener("pointerleave", leave);
    }
    return () => {
      stop();
      removeEventListener("radio:salvapantallas", trunk);
      for (const el of areas) {
        el.removeEventListener("pointerenter", play);
        el.removeEventListener("pointerleave", leave);
      }
    };
  }, []);

  return (
    // Between the reels' rims (x 295 to 445), under the meter and over the tape head
    <foreignObject ref={spot} x="327.5" y="133.5" width="85" height="85">
      {/* All stacked and only one visible: swapping the mask's url revalidated it on every
          frame (public/ is served with max-age=0) and it showed nothing meanwhile */}
      <div className="grid h-full grid-rows-1">
        {Array.from({ length: DRAWINGS }, (_, i) => (
          <div key={i} className="dibu-bobinas col-start-1 row-start-1" style={{ "--dibu": dibuUrl(i + 1), visibility: i + 1 === n ? "visible" : "hidden" } as React.CSSProperties} />
        ))}
      </div>
    </foreignObject>
  );
}

/**
 * Who added the song stays a little secret: now and then an eye opens on the tape head, and
 * hovering it (or tapping, on a phone) shows their first name under it.
 */
function QuienLoTrajo({ name }: { name: string }) {
  const first = name.split(" ")[0];
  return (
    <g className="quien" tabIndex={0}>
      <rect x={HEAD_X - 17} y="260" width="34" height="28" fill={CREAM} />
      <g className="quien-ojo">
        <path d={`M${HEAD_X - 12} 274Q${HEAD_X} 263 ${HEAD_X + 12} 274Q${HEAD_X} 285 ${HEAD_X - 12} 274Z`} fill="var(--color-black)" />
        <circle cx={HEAD_X} cy="274" r="4.5" fill={CREAM} />
        <circle cx={HEAD_X} cy="274" r="2" fill="var(--color-black)" />
      </g>
      <g className="quien-cartel">
        <text x={HEAD_X} y="311" textAnchor="middle" fill={CREAM} className="uppercase">
          <tspan fontSize="8" letterSpacing="2" className="font-mono">
            cortesía de{" "}
          </tspan>
          <tspan fontSize={Math.min(14, 170 / first.length)} className="font-display">
            {first}
          </tspan>
        </text>
      </g>
    </g>
  );
}

export function TapeDeck({ tracks }: { tracks: DeckTrack[] }) {
  const { now, reduced } = useClock();
  const np = now === null ? null : nowPlaying(tracks, now);
  const track = np ? tracks[np.index] : null;
  const elapsed = np?.offsetSec ?? 0;
  const progress = track ? elapsed / track.durationSec : 0;

  // Tape moves from the left reel to the right one; the emptier reel spins faster, like a real deck
  const left = REEL.empty + (REEL.full - REEL.empty) * (1 - progress);
  const right = REEL.empty + (REEL.full - REEL.empty) * progress;
  const spin = reduced ? 0 : elapsed * 6000;
  const adder = track && quienLoTrajo(track);
  const sonando = useSonando();
  const energy = track ? (ENERGY[track.id] ?? track.energy ?? "media") : "media";
  const dancing = sonando && !reduced && track;

  return (
    <figure className="mx-auto w-full max-w-4xl">
      {/* Recortado por arriba: el lienzo guardaba el hueco del minutero que ya no está */}
      <svg viewBox="0 58 736 262" role="img" aria-label={track ? `Sonando: ${track.title} de ${track.artist}${adder ? `, cortesía de ${adder}` : ""}` : "Magnetófono de la radio"} className="block w-full rounded-xl bg-black">
        {[-2, -1, 0, 1, 2].map((i) => (
          <MeterBar key={i} i={i} length={dancing ? meterLength(i, elapsed, energy) : (i === 0 ? BAR_MID : BAR).rest} />
        ))}

        {/* The tape: off the outside of the left pack, round the guides and the head, onto the right
            pack. Under the reels, so it comes out from under the pack's edge */}
        <polyline points={[...tapeTangent([200, 160], left, [195, 287], 7, -1), [195, 287], [255, 282], [HEAD_X, 272], [480, 282], [540, 287], ...tapeTangent([540, 160], right, [540, 287], 7, 1).toReversed()].map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ")} fill="none" stroke={TAPE} strokeWidth="3" strokeLinejoin="round" />
        <Reel cx={200} tape={left} angle={spin / left} />
        <Reel cx={540} tape={right} angle={spin / right} />

        <circle cx="195" cy="287" r="7" fill={WIRE} />
        <circle cx="255" cy="282" r="12" fill="var(--color-black)" stroke={CREAM} strokeWidth="2.5" />
        <circle cx="480" cy="282" r="12" fill="var(--color-black)" stroke={CREAM} strokeWidth="2.5" />
        <circle cx="540" cy="287" r="7" fill={WIRE} />
        {adder ? <QuienLoTrajo name={adder} /> : <rect x={HEAD_X - 17} y="260" width="34" height="28" fill={CREAM} />}
        <ReelDibu />
      </svg>
    </figure>
  );
}
