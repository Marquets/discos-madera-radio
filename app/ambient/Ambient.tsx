"use client";

import { useEffect, useRef, useState, type ComponentProps, type KeyboardEvent, type PointerEvent } from "react";
import { flushSync } from "react-dom";
import { KEYS, MODES, touchDegree } from "@/lib/ambient";
import { createEngine, type Channel, type Echo, type Engine, type Reverb } from "./engine";
import { Knob } from "./Knob";
import { MAX_STARS, skyColors, startSky } from "./sky";

const CHANNELS: { channel: Channel; label: string }[] = [
  { channel: "pad", label: "Pad" },
  { channel: "drone", label: "Drone" },
  { channel: "lluvia", label: "Lluvia" },
  { channel: "notas", label: "Notas" },
  { channel: "lienzo", label: "Lienzo" },
];
const LEVELS: Record<Channel, number> = { pad: 0.6, drone: 0.4, lluvia: 0.15, notas: 0.5, lienzo: 0.6 };
const ECHO: Echo = { amount: 0.3, time: 0.6, repeats: 0.45, color: 2500 };
const REVERB: Reverb = { amount: 0.4, size: 5, color: 6000 };
const MASTER = { volume: 0.8, light: 0.5, pitch: 0 };
// Only the picture: chaos is how much the arc writhes
const VISUAL = { chaos: 1, saturation: 1 };
// How long nobody touches anything before the sky takes the whole screen
const IDLE_MS = 20_000;
// How long the full-screen sky takes to fade out, and back in in its place; duration-700 on the canvas
const FADE_MS = 700;
// How long the controls stay up over the full-screen sky after the last move
const BAR_MS = 3000;
const POWER = "M12 3v9M6.3 6.3a8 8 0 1 0 11.4 0";
const EXPAND = "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5";
const SHRINK = "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5";
// The sky in its place, full screen after a while untouched, fading out of that, back in its place
// still hidden, or full screen because it was asked for
type View = "normal" | "idle" | "leaving" | "returning" | "full";
const percent = (v: number) => `${Math.round(v * 100)}%`;
const kHz = (v: number) => `${(v / 1000).toFixed(1)}k`;

type Settings = { key: number; scale: number[]; levels: typeof LEVELS; echo: Echo; reverb: Reverb; master: typeof MASTER };

function sync(e: Engine, { key, scale, levels, echo, reverb, master }: Settings) {
  e.setKey(key, scale);
  for (const { channel } of CHANNELS) e.setLevel(channel, levels[channel]);
  e.setEcho(echo);
  e.setReverb(reverb);
  e.setVolume(master.volume);
  e.setLight(master.light);
  e.setPitch(master.pitch);
}

// A note's star, kept as a degree so one set off with an older scale still lands in a column
type Ripple = { degree: number; y: number; at: number };

export function Ambient() {
  const engine = useRef<Engine>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const ripples = useRef<Ripple[]>([]);
  const lastDegree = useRef<number>(null);
  const [on, setOn] = useState(false);
  const [view, setView] = useState<View>("normal");
  const [bar, setBar] = useState(true);
  const manual = view === "full";
  const [levels, setLevels] = useState(LEVELS);
  const [echo, setEcho] = useState(ECHO);
  const [reverb, setReverb] = useState(REVERB);
  const [master, setMaster] = useState(MASTER);
  const [visual, setVisual] = useState(VISUAL);
  const [key, setKey] = useState(9);
  const [mode, setMode] = useState("Dórico");
  const scale = MODES[mode];

  useEffect(() => {
    if (engine.current) sync(engine.current, { key, scale, levels, echo, reverb, master });
  }, [key, scale, levels, echo, reverb, master]);
  useEffect(() => () => engine.current?.destroy(), []);

  // While it plays, a while without a move, a tap or a key lets the sky fill the screen, morphed
  // in with a view transition where there is one. Any of them fades it out, and it fades back in
  // in its place. Reduced motion skips both.
  useEffect(() => {
    if (!on || manual) return;
    let timer: ReturnType<typeof setTimeout>;
    let current: View = "normal";
    const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
    const show = (next: View) => {
      current = next;
      setView(next);
    };
    const settle = () => {
      show("normal");
      timer = setTimeout(() => {
        const apply = () => flushSync(() => show("idle"));
        if (document.startViewTransition && !reduced()) document.startViewTransition(apply);
        else apply();
      }, IDLE_MS);
    };
    const wake = () => {
      if (current === "normal") {
        clearTimeout(timer);
        return settle();
      }
      if (current !== "idle") return;
      if (reduced()) return settle();
      show("leaving");
      // Back in its place still transparent, then a frame later fading in
      timer = setTimeout(() => {
        show("returning");
        requestAnimationFrame(() => requestAnimationFrame(settle));
      }, FADE_MS);
    };
    const events = ["pointermove", "pointerdown", "keydown", "wheel"] as const;
    for (const e of events) addEventListener(e, wake);
    settle();
    return () => {
      clearTimeout(timer);
      for (const e of events) removeEventListener(e, wake);
      // Turned off mid-fade, it would stay full screen and invisible
      setView((v) => (v === "full" ? v : "normal"));
    };
  }, [on, manual]);

  // Asked-for full screen: the controls show along the bottom on any move and hide after a while
  // still; Escape, the exit button or the browser leaving full screen bring the sky back
  useEffect(() => {
    if (!manual) return;
    let timer: ReturnType<typeof setTimeout>;
    const wake = () => {
      setBar(true);
      clearTimeout(timer);
      timer = setTimeout(() => setBar(false), BAR_MS);
    };
    const onKey = (e: globalThis.KeyboardEvent) => e.key === "Escape" && setView("normal");
    const onChange = () => !document.fullscreenElement && setView("normal");
    const events = ["pointermove", "pointerdown", "wheel"] as const;
    for (const e of events) addEventListener(e, wake);
    addEventListener("keydown", wake);
    addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onChange);
    wake();
    return () => {
      clearTimeout(timer);
      for (const e of events) removeEventListener(e, wake);
      removeEventListener("keydown", wake);
      removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onChange);
      if (document.fullscreenElement) document.exitFullscreen();
    };
  }, [manual]);

  function enterFull() {
    // Hides the browser's own bars too where it can; an iPhone can't, and gets the sky over the page
    document.documentElement.requestFullscreen?.().catch(() => {});
    setView("full");
  }

  // What the horizon reads each frame; a ref, so turning a knob doesn't restart the loop
  const look = useRef({ levels, echo, reverb, master, visual, mode });
  useEffect(() => {
    look.current = { levels, echo, reverb, master, visual, mode };
  }, [levels, echo, reverb, master, visual, mode]);

  // The sky follows the sound: the drone is the wind, the mode picks its colours and the light runs
  // them from night through dawn and day to sunset, the pad and how loud it plays thicken the
  // clouds, pitch warms or cools them, the reverb's size softens them, chaos makes them writhe and
  // lluvia rains from them. Every note you play lights the cloud where you touched from within and
  // parts it, pulsed again by the eco and spread by the reverb. Reduced motion holds the sky still.
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const stars = new Float32Array(MAX_STARS * 4);
    let time = 0;
    let pulse = 0;
    let last = performance.now();
    return startSky(canvas.current!, () => {
      const { levels, echo, reverb, master, visual, mode } = look.current;
      const now = performance.now();
      const still = reduced.matches;
      if (!still) time += ((now - last) / 1000) * (0.3 + levels.drone * 1.5);
      last = now;
      // Eased, so the arc breathes with the sound instead of flickering on every sample
      pulse += (Math.min(1, (engine.current?.level() ?? 0) * 4) - pulse) * (still ? 0 : 0.15);

      const linger = 1500 + reverb.amount * reverb.size * 500;
      const echoes = echo.amount > 0.01 ? Math.round(echo.repeats * 10) : 0;
      const echoMs = echo.time * 1000;
      ripples.current = ripples.current.filter((r) => now - r.at < linger + echoes * echoMs);
      stars.fill(1);
      let n = 0;
      for (const r of ripples.current) {
        for (let k = 0; k <= echoes && n < MAX_STARS; k++) {
          const age = now - r.at - k * echoMs;
          if (age < 0 || age > linger) continue;
          stars.set([(r.degree + 0.5) / (2 * scale.length), 1 - r.y, age / linger, k === 0 ? 1 : Math.min(1, echo.repeats ** k * echo.amount * 2)], n++ * 4);
        }
      }

      return {
        time,
        colors: skyColors(mode, master.light, master.pitch),
        rain: levels.lluvia,
        clock: still ? 0 : now / 1000,
        pad: levels.pad,
        halo: reverb.amount,
        warp: visual.chaos,
        width: 0.4 + (reverb.size / 10) * 1.2,
        pulse,
        saturation: visual.saturation,
        stars,
      };
    });
  }, [scale.length]);

  function start() {
    // iOS keeps Web Audio silent with the ringer switch off unless the page asks to play like media
    const session = (navigator as { audioSession?: { type: string } }).audioSession;
    if (session) session.type = "playback";
    // Synced here too, not left to the effect: a first tap on the canvas plays its note straight away
    if (!engine.current) sync((engine.current = createEngine()), { key, scale, levels, echo, reverb, master });
    engine.current.resume();
    setOn(true);
  }

  function toggle() {
    if (!on) return start();
    engine.current?.pause();
    setOn(false);
  }

  function play(degree: number, brightness: number) {
    if (!on) start();
    engine.current!.touch(degree, brightness);
    ripples.current.push({ degree, y: 1 - brightness, at: performance.now() });
  }

  function onPointer(e: PointerEvent<HTMLCanvasElement>) {
    if (e.type === "pointermove" && e.buttons === 0) return;
    const box = e.currentTarget.getBoundingClientRect();
    const degree = touchDegree((e.clientX - box.left) / box.width, scale.length);
    // Dragging plays a note each time it crosses into a new column, not on every pixel
    if (e.type === "pointermove" && degree === lastDegree.current) return;
    lastDegree.current = degree;
    play(degree, 1 - Math.min(1, Math.max(0, (e.clientY - box.top) / box.height)));
  }

  // 1 to 9 and 0 play the first ten degrees, for anyone without a pointer
  function onKey(e: KeyboardEvent) {
    const n = "1234567890".indexOf(e.key);
    if (n < 0 || n >= 2 * scale.length) return;
    e.preventDefault();
    play(n, 0.5);
  }

  const signed = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}`;

  // The main knobs: the mix and its sounds, then what colours them. Laid out beside the sky, and
  // again small along the bottom of it when it fills the screen
  const sounds: ComponentProps<typeof Knob>[] = [
    { label: "Volumen", value: master.volume, min: 0, max: 1, initial: MASTER.volume, onChange: (volume) => setMaster({ ...master, volume }), format: percent },
    ...CHANNELS.map(({ channel, label }) => ({
      label,
      value: levels[channel],
      min: 0,
      max: 1,
      initial: LEVELS[channel],
      onChange: (v: number) => setLevels({ ...levels, [channel]: v }),
      format: percent,
    })),
  ];
  const shades: ComponentProps<typeof Knob>[] = [
    // Turned all the way down is darkness
    { label: "Luz", value: master.light, min: 0, max: 1, initial: MASTER.light, onChange: (light) => setMaster({ ...master, light }), format: percent },
    { label: "Pitch", value: master.pitch, min: -12, max: 12, initial: MASTER.pitch, onChange: (pitch) => setMaster({ ...master, pitch }), format: signed },
    { label: "Eco", value: echo.amount, min: 0, max: 1, initial: ECHO.amount, onChange: (amount) => setEcho({ ...echo, amount }), format: percent },
    { label: "Reverb", value: reverb.amount, min: 0, max: 1, initial: REVERB.amount, onChange: (amount) => setReverb({ ...reverb, amount }), format: percent },
  ];
  const full = view === "idle" || view === "leaving" || manual;
  const fading = view === "leaving" || view === "returning";

  return (
    // The sky takes the screen; on a wide one the controls are a narrow column beside it (or
    // flank the logo, wider still), so playing and turning happen together; on a phone they follow below
    <div className="flex w-full flex-col gap-6 lg:h-[calc(100svh-var(--chrome)-3rem)] lg:flex-row">
      {/* The sky's box: in its place, or fixed over everything when full screen */}
      <div
        style={{ viewTransitionName: "cielo" }}
        className={`transition-opacity duration-700 motion-reduce:transition-none ${fading ? "pointer-events-none opacity-0" : ""} ${
          full
            ? `fixed inset-0 z-50 h-svh w-screen bg-black ${manual && bar ? "" : "cursor-none"}`
            : "relative aspect-[4/5] w-full min-w-0 overflow-hidden rounded-xl bg-white/5 sm:aspect-[4/3] lg:aspect-auto lg:h-full lg:flex-1"
        }`}
      >
        <canvas
          ref={canvas}
          tabIndex={0}
          role="application"
          aria-label="Cielo: toca o arrastra para soltar notas, más agudas a la derecha y más brillantes arriba. Con el teclado, las teclas del 1 al 0."
          onPointerDown={onPointer}
          onPointerMove={onPointer}
          onPointerUp={() => (lastDegree.current = null)}
          onKeyDown={onKey}
          className="block h-full w-full touch-none -outline-offset-4 focus-visible:outline-2 focus-visible:outline-accent"
        />
        {!full && (
          <div className="absolute top-2 right-2 text-white drop-shadow">
            <RoundButton bare label="Pantalla completa" path={EXPAND} onClick={enterFull} />
          </div>
        )}
      </div>
      {/* From xl up the controls flank the logo in the header band, measured like globals.css's --chrome:
          the sounds on its left, the rest on its right, and the sky gets the whole width below */}
      <div className="flex flex-col gap-6 font-mono text-[10px] uppercase lg:w-72 lg:shrink-0 xl:absolute xl:inset-x-0 xl:-top-36 xl:grid xl:h-36 xl:w-auto xl:grid-cols-[1fr_20rem_1fr] xl:items-center xl:px-8">
        <div className="grid grid-cols-3 justify-items-center gap-y-5 xl:col-start-1 xl:flex xl:gap-5 xl:justify-self-end">
          {sounds.map((knob, i) => (
            // The whole mix first, set a little apart from the sounds it holds
            <div key={knob.label} className={i === 0 ? "xl:mr-4" : "contents"}>
              <Knob {...knob} />
            </div>
          ))}
        </div>
        <div className="contents xl:col-start-3 xl:flex xl:items-center xl:gap-6 xl:justify-self-start">
          <div className="grid grid-cols-4 justify-items-center xl:flex xl:gap-6">
            {shades.map((knob) => (
              <Knob key={knob.label} {...knob} />
            ))}
          </div>
          {/* In the column layouts the button and selects go first and the extra settings last */}
          <div className="contents xl:flex xl:w-36 xl:flex-col xl:gap-3">
            <div className="order-first grid grid-cols-2 gap-3 text-sm xl:order-none xl:gap-2 xl:text-[10px]">
              <label className="flex flex-col gap-1">
                Tono
                <select value={key} onChange={(e) => setKey(Number(e.target.value))} className="border border-accent bg-black px-2 py-1 xl:px-1">
                  {KEYS.map((k, i) => (
                    <option key={k} value={i}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                Modo
                <select value={mode} onChange={(e) => setMode(e.target.value)} className="border border-accent bg-black px-2 py-1 xl:px-1">
                  {Object.keys(MODES).map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
            </div>
            {/* Beside the logo the extra settings and the power button share the last row */}
            <div className="contents xl:flex xl:items-center xl:justify-between">
              <details className="relative order-last border-t border-accent/40 pt-3 xl:order-none xl:border-0 xl:pt-0">
                <summary className="cursor-pointer text-center text-xs hover:text-white xl:text-[10px]">Más ajustes</summary>
                {/* Beside the logo there's no room below, so it drops over the sky */}
                <div className="mt-4 grid grid-cols-3 justify-items-center gap-y-4 xl:absolute xl:top-full xl:right-0 xl:z-20 xl:mt-2 xl:w-72 xl:rounded-lg xl:border xl:border-accent/40 xl:bg-black xl:p-4">
                  <Knob small label="Tiempo eco" value={echo.time} min={0.05} max={1.5} initial={ECHO.time} onChange={(time) => setEcho({ ...echo, time })} format={(v) => `${Math.round(v * 1000)}ms`} />
                  <Knob small label="Repeticiones" value={echo.repeats} min={0} max={0.9} initial={ECHO.repeats} onChange={(repeats) => setEcho({ ...echo, repeats })} format={percent} />
                  <Knob small label="Color eco" value={echo.color} min={400} max={8000} initial={ECHO.color} onChange={(color) => setEcho({ ...echo, color })} format={kHz} />
                  <Knob small label="Tamaño reverb" value={reverb.size} min={1} max={10} initial={REVERB.size} onChange={(size) => setReverb({ ...reverb, size })} format={(v) => `${v.toFixed(1)}s`} />
                  <Knob small label="Color reverb" value={reverb.color} min={400} max={12000} initial={REVERB.color} onChange={(color) => setReverb({ ...reverb, color })} format={kHz} />
                  <Knob small label="Caos" value={visual.chaos} min={0} max={4} initial={VISUAL.chaos} onChange={(chaos) => setVisual({ ...visual, chaos })} format={(v) => v.toFixed(1)} />
                  <Knob small label="Saturación" value={visual.saturation} min={0} max={1.5} initial={VISUAL.saturation} onChange={(saturation) => setVisual({ ...visual, saturation })} format={percent} />
                </div>
              </details>
              <div className="order-first flex gap-2 self-end xl:order-none">
                <RoundButton label={on ? "Apagar" : "Encender"} path={POWER} pressed={on} onClick={toggle} />
              </div>
            </div>
          </div>
        </div>
      </div>
      {manual && (
        // Small and white along the bottom of the asked-for full-screen sky, hidden while nothing moves
        <div
          className={`fixed inset-x-0 bottom-0 z-[60] flex items-end justify-center gap-4 bg-linear-to-t from-black/40 to-transparent px-4 pt-10 pb-4 font-mono text-[9px] text-white uppercase transition-opacity duration-700 motion-reduce:transition-none ${bar ? "" : "pointer-events-none opacity-0"}`}
        >
          <div className="self-center">
            <RoundButton label={on ? "Apagar" : "Encender"} path={POWER} pressed={on} onClick={toggle} />
          </div>
          {[...sounds, ...shades].map((knob) => (
            <Knob key={knob.label} small {...knob} />
          ))}
          <div className="self-center">
            <RoundButton bare label="Salir de pantalla completa" path={SHRINK} onClick={() => setView("normal")} />
          </div>
        </div>
      )}
    </div>
  );
}

// Ringed, or bare (just the icon) where it sits over the sky
function RoundButton({ label, path, pressed, bare, onClick }: { label: string; path: string; pressed?: boolean; bare?: boolean; onClick(): void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      className={`group flex size-8 shrink-0 items-center justify-center rounded-full hover:opacity-80 ${bare ? "" : "border-2 border-current aria-pressed:bg-current"}`}
    >
      <svg viewBox="0 0 24 24" className={`group-aria-pressed:text-black ${bare ? "size-5" : "size-4"}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
        <path d={path} />
      </svg>
    </button>
  );
}
