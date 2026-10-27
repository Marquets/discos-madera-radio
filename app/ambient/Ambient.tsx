"use client";

import { useEffect, useRef, useState, type ComponentProps, type PointerEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { KEYS, MODES, passed, touchDegree } from "@/lib/ambient";
import { createEngine, type Channel, type Echo, type Engine, type Reverb, type Synth } from "./engine";
import { Knob } from "./Knob";
import { DEFAULT_BINDINGS, noteDegree } from "./midi";
import { MAX_STARS, skyColors, startSky } from "./sky";

const CHANNELS: { channel: Channel; label: string }[] = [
  { channel: "pad", label: "Pad" },
  { channel: "drone", label: "Drone" },
  { channel: "lluvia", label: "Lluvia" },
  // The notes that fall by themselves, and the ones played by hand or by MIDI
  { channel: "notas", label: "Azar" },
  { channel: "lienzo", label: "Tus notas" },
];
const LEVELS: Record<Channel, number> = { pad: 0.6, drone: 0.4, lluvia: 0.15, notas: 0.5, lienzo: 0.6 };
const ECHO: Echo = { amount: 0.3, time: 0.6, repeats: 0.45, color: 2500 };
const REVERB: Reverb = { amount: 0.4, size: 5, color: 6000 };
const MASTER = { volume: 0.8, light: 0.5, pitch: 0 };
const SYNTH: Synth = { wave: "sine", attack: 0.01, decay: 3.5, cutoff: 6000, resonance: 1 };
const WAVES: { wave: OscillatorType; label: string; symbol: string }[] = [
  { wave: "sine", label: "Seno", symbol: "∿" },
  { wave: "triangle", label: "Triángulo", symbol: "△" },
  { wave: "sawtooth", label: "Sierra", symbol: "⩘" },
  { wave: "square", label: "Cuadrada", symbol: "⊓" },
];
// Only the picture: chaos is how much the arc writhes
const VISUAL = { chaos: 1, saturation: 1 };
// How long nobody touches anything before the sky takes the whole screen
const IDLE_MS = 20_000;
// How long the full-screen sky takes to fade out, and back in in its place; duration-700 on the canvas
const FADE_MS = 700;
// How long the controls stay up over the full-screen sky after the last move
const BAR_MS = 3000;
const MIDI_KEY = "ambient-midi";
// The panel's wooden cheeks: grain over a walnut gradient
const WOOD = {
  backgroundImage: "repeating-linear-gradient(90deg, rgb(0 0 0 / 0.18) 0 1px, transparent 1px 5px), linear-gradient(#8a5a33, #5c3519 60%, #3d220f)",
};
// Empty, recording the first pass, playing it round, or playing it while recording on top
type Looper = "empty" | "recording" | "playing" | "overdub";
const LOOPER_LABELS: Record<Looper, string> = { empty: "", recording: "● Rec", playing: "⟳ Loop", overdub: "● Encima" };
const POWER = "M12 3v9M6.3 6.3a8 8 0 1 0 11.4 0";
const EXPAND = "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5";
const SHRINK = "M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5";
const INFO = "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 8h.01M12 11v5";
// The sky in its place, full screen after a while untouched, fading out of that, back in its place
// still hidden, or full screen because it was asked for
type View = "normal" | "idle" | "leaving" | "returning" | "full";
const percent = (v: number) => `${Math.round(v * 100)}%`;
const seconds = (v: number) => (v < 1 ? `${Math.round(v * 1000)}ms` : `${v.toFixed(1)}s`);
const kHz = (v: number) => `${(v / 1000).toFixed(1)}k`;

type Settings = { key: number; scale: number[]; levels: typeof LEVELS; echo: Echo; reverb: Reverb; master: typeof MASTER; synth: Synth };

function sync(e: Engine, { key, scale, levels, echo, reverb, master, synth }: Settings) {
  e.setKey(key, scale);
  for (const { channel } of CHANNELS) e.setLevel(channel, levels[channel]);
  e.setEcho(echo);
  e.setReverb(reverb);
  e.setVolume(master.volume);
  e.setLight(master.light);
  e.setPitch(master.pitch);
  e.setSynth(synth);
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
  const [midi, setMidi] = useState<"off" | "on" | "unavailable">("off");
  // Not assigning (false), assigning with no knob picked yet (null), or the knob waiting for a control
  const [learn, setLearn] = useState<string | null | false>(false);
  // The one panel section showing its fine knobs, if any
  const [fold, setFold] = useState<string | null>(null);
  const access = useRef<MIDIAccess>(null);
  // Which knob each controller number turns, by its label
  const bindings = useRef(DEFAULT_BINDINGS);
  const onMidi = useRef<(data: Uint8Array) => void>(() => {});
  const info = useRef<HTMLDialogElement>(null);
  // The computer keyboard's octave, moved with Z and X
  const octave = useRef(0);
  const [looper, setLooper] = useState<Looper>("empty");
  // The loop's notes, each at its time (ms) from the loop's start and in the layer it was recorded
  // in, the first pass being 0; one recorded on top keeps when it was played, so the pass it was
  // played in doesn't play it again straight away
  const loop = useRef<{
    start: number;
    length: number;
    layer: number;
    notes: { t: number; degree: number; brightness: number; layer: number; at?: number }[];
  }>({ start: 0, length: 0, layer: 0, notes: [] });
  const manual = view === "full";
  const [levels, setLevels] = useState(LEVELS);
  const [echo, setEcho] = useState(ECHO);
  const [reverb, setReverb] = useState(REVERB);
  const [master, setMaster] = useState(MASTER);
  const [visual, setVisual] = useState(VISUAL);
  const [synth, setSynth] = useState(SYNTH);
  const [key, setKey] = useState(9);
  const [mode, setMode] = useState("Dórico");
  const scale = MODES[mode];

  useEffect(() => {
    if (engine.current) sync(engine.current, { key, scale, levels, echo, reverb, master, synth });
  }, [key, scale, levels, echo, reverb, master, synth]);
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
        // A hidden tab aborts the transition; the change still applies, so the rejection is no news
        if (document.startViewTransition && !reduced()) document.startViewTransition(apply).ready.catch(() => {});
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

  // Every connected input, and any plugged in later, feeds the handler above
  useEffect(() => {
    const a = access.current;
    if (midi !== "on" || !a) return;
    const listen = (e: MIDIMessageEvent) => e.data && onMidi.current(e.data);
    const attach = () => a.inputs.forEach((input) => (input.onmidimessage = listen));
    attach();
    a.onstatechange = attach;
    return () => {
      a.onstatechange = null;
      a.inputs.forEach((input) => (input.onmidimessage = null));
    };
  }, [midi]);

  async function connectMidi() {
    if (midi === "on") return setLearn(learn === false ? null : false);
    // A click is the only moment the browser lets sound start, and MIDI notes come later
    start();
    try {
      access.current = await navigator.requestMIDIAccess();
      try {
        bindings.current = { ...DEFAULT_BINDINGS, ...JSON.parse(localStorage.getItem(MIDI_KEY) ?? "{}") };
      } catch {}
      setMidi("on");
    } catch {
      // No Web MIDI (Safari), or the visitor said no
      setMidi("unavailable");
    }
  }

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
      // A MIDI note can land past the canvas's two octaves; it wraps back into them
      const columns = 2 * scale.length;
      for (const r of ripples.current) {
        for (let k = 0; k <= echoes && n < MAX_STARS; k++) {
          const age = now - r.at - k * echoMs;
          if (age < 0 || age > linger) continue;
          stars.set([((((r.degree % columns) + columns) % columns) + 0.5) / columns, 1 - r.y, age / linger, k === 0 ? 1 : Math.min(1, echo.repeats ** k * echo.amount * 2)], n++ * 4);
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
    if (!engine.current) sync((engine.current = createEngine()), { key, scale, levels, echo, reverb, master, synth });
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
    const now = performance.now();
    ripples.current.push({ degree, y: 1 - brightness, at: now });
    const l = loop.current;
    if (looper === "recording") l.notes.push({ t: now - l.start, degree, brightness, layer: 0 });
    if (looper === "overdub") l.notes.push({ t: (now - l.start) % l.length, degree, brightness, layer: l.layer, at: now });
  }

  // Space, like a looper pedal: record, close the loop and play it round, record on top, stop
  // recording on top. Closing a pass with nothing in it leaves the looper empty.
  function pedal() {
    const now = performance.now();
    const l = loop.current;
    if (looper === "empty") {
      if (!on) start();
      loop.current = { start: now, length: 0, layer: 0, notes: [] };
      return setLooper("recording");
    }
    if (looper === "recording") {
      if (!l.notes.length) return setLooper("empty");
      l.length = now - l.start;
      l.start = now;
      return setLooper("playing");
    }
    if (looper === "playing") l.layer++;
    setLooper(looper === "playing" ? "overdub" : "playing");
  }

  // Ctrl/Cmd+Z takes off the last layer: the one being recorded on top, or the newest one kept;
  // taking off the first pass empties the looper
  function undo() {
    const l = loop.current;
    if (looper === "empty") return;
    if (looper === "recording") return setLooper("empty");
    const top = looper === "overdub" ? l.layer : Math.max(...l.notes.map((n) => n.layer));
    l.notes = l.notes.filter((n) => n.layer !== top);
    if (!l.notes.length) return setLooper("empty");
    l.layer = Math.max(...l.notes.map((n) => n.layer));
    setLooper("playing");
  }

  // Plays the loop's notes as the clock passes them, coming round again at its end.
  // shortcut: a 20 ms tick, so notes land up to that late and a hidden tab bunches them; scheduling
  // on the audio clock would be exact if it ever matters
  const looping = looper === "playing" || looper === "overdub";
  useEffect(() => {
    if (!looping) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const { start, length, notes } = loop.current;
      const from = (last - start) % length;
      const to = (now - start) % length;
      last = now;
      for (const n of notes) {
        if (!passed(n.t, from, to) || (n.at !== undefined && now - n.at < 100)) continue;
        engine.current?.touch(n.degree, n.brightness);
        ripples.current.push({ degree: n.degree, y: 1 - n.brightness, at: now });
      }
    }, 20);
    return () => clearInterval(id);
  }, [looping]);

  function onPointer(e: PointerEvent<HTMLCanvasElement>) {
    if (e.type === "pointermove" && e.buttons === 0) return;
    const box = e.currentTarget.getBoundingClientRect();
    const degree = touchDegree((e.clientX - box.left) / box.width, scale.length);
    // Dragging plays a note each time it crosses into a new column, not on every pixel
    if (e.type === "pointermove" && degree === lastDegree.current) return;
    lastDegree.current = degree;
    play(degree, 1 - Math.min(1, Math.max(0, (e.clientY - box.top) / box.height)));
  }

  // 1 to 9 and 0 play ten degrees anywhere on the page, unless typing or choosing in a field;
  // Z and X move them down and up an octave, two each way at most
  useEffect(() => {
    const press = (e: globalThis.KeyboardEvent) => {
      if (e.repeat || (e.target as HTMLElement).closest("input, select, textarea")) return;
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        return undo();
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const shift = { z: -1, x: 1 }[e.key.toLowerCase()];
      if (shift) octave.current = Math.min(2, Math.max(-2, octave.current + shift));
      const n = "1234567890".indexOf(e.key);
      if (n >= 0) play(n + octave.current * scale.length, 0.5);
      // Not on a focused button or the settings toggle, where Space already means press
      if (e.code === "Space" && !(e.target as HTMLElement).closest("button, summary")) {
        e.preventDefault();
        pedal();
      }
      if (e.key === "Backspace") setLooper("empty");
    };
    addEventListener("keydown", press);
    return () => removeEventListener("keydown", press);
  });

  const signed = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}`;

  // The main knobs: the mix and its sounds, then what colours them. Laid out beside the sky, and
  // again small along the bottom of it when it fills the screen
  const sounds: ComponentProps<typeof Knob>[] = [
    { label: "Volumen", value: master.volume, min: 0, max: 1, initial: MASTER.volume, onChange: (volume) => setMaster((s) => ({ ...s, volume })), format: percent },
    ...CHANNELS.map(({ channel, label }) => ({
      label,
      value: levels[channel],
      min: 0,
      max: 1,
      initial: LEVELS[channel],
      onChange: (v: number) => setLevels((s) => ({ ...s, [channel]: v })),
      format: percent,
    })),
  ];
  const shades: ComponentProps<typeof Knob>[] = [
    // Turned all the way down is darkness
    { label: "Luz", value: master.light, min: 0, max: 1, initial: MASTER.light, onChange: (light) => setMaster((s) => ({ ...s, light })), format: percent },
    { label: "Pitch", value: master.pitch, min: -12, max: 12, initial: MASTER.pitch, onChange: (pitch) => setMaster((s) => ({ ...s, pitch })), format: signed },
    { label: "Eco", value: echo.amount, min: 0, max: 1, initial: ECHO.amount, onChange: (amount) => setEcho((s) => ({ ...s, amount })), format: percent },
    { label: "Reverb", value: reverb.amount, min: 0, max: 1, initial: REVERB.amount, onChange: (amount) => setReverb((s) => ({ ...s, amount })), format: percent },
  ];
  const synthKnobs: ComponentProps<typeof Knob>[] = [
    { label: "Ataque", value: synth.attack, min: 0.005, max: 2, initial: SYNTH.attack, onChange: (attack) => setSynth((s) => ({ ...s, attack })), format: seconds },
    { label: "Caída", value: synth.decay, min: 0.3, max: 8, initial: SYNTH.decay, onChange: (decay) => setSynth((s) => ({ ...s, decay })), format: seconds },
    { label: "Filtro", value: synth.cutoff, min: 200, max: 12000, initial: SYNTH.cutoff, onChange: (cutoff) => setSynth((s) => ({ ...s, cutoff })), format: kHz },
    { label: "Resonancia", value: synth.resonance, min: 0.5, max: 15, initial: SYNTH.resonance, onChange: (resonance) => setSynth((s) => ({ ...s, resonance })), format: (v) => v.toFixed(1) },
  ];
  const waves = (
    <div role="radiogroup" aria-label="Onda" className="flex flex-wrap justify-center gap-1">
      {WAVES.map(({ wave, label, symbol }) => (
        <button
          key={wave}
          role="radio"
          aria-checked={synth.wave === wave}
          aria-label={label}
          title={label}
          onClick={() => setSynth((s) => ({ ...s, wave }))}
          className="flex size-7 items-center justify-center border border-current text-base leading-none normal-case hover:opacity-80 aria-checked:bg-white aria-checked:text-black"
        >
          {symbol}
        </button>
      ))}
    </div>
  );
  const extras: ComponentProps<typeof Knob>[] = [
    { label: "Tiempo eco", value: echo.time, min: 0.05, max: 1.5, initial: ECHO.time, onChange: (time) => setEcho((s) => ({ ...s, time })), format: (v) => `${Math.round(v * 1000)}ms` },
    { label: "Repeticiones", value: echo.repeats, min: 0, max: 0.9, initial: ECHO.repeats, onChange: (repeats) => setEcho((s) => ({ ...s, repeats })), format: percent },
    { label: "Color eco", value: echo.color, min: 400, max: 8000, initial: ECHO.color, onChange: (color) => setEcho((s) => ({ ...s, color })), format: kHz },
    { label: "Tamaño reverb", value: reverb.size, min: 1, max: 10, initial: REVERB.size, onChange: (size) => setReverb((s) => ({ ...s, size })), format: (v) => `${v.toFixed(1)}s` },
    { label: "Color reverb", value: reverb.color, min: 400, max: 12000, initial: REVERB.color, onChange: (color) => setReverb((s) => ({ ...s, color })), format: kHz },
    { label: "Caos", value: visual.chaos, min: 0, max: 4, initial: VISUAL.chaos, onChange: (chaos) => setVisual((s) => ({ ...s, chaos })), format: (v) => v.toFixed(1) },
    { label: "Saturación", value: visual.saturation, min: 0, max: 1.5, initial: VISUAL.saturation, onChange: (saturation) => setVisual((s) => ({ ...s, saturation })), format: percent },
  ];
  // Clicking a knob picks it while assigning MIDI
  const learnable = (knob: ComponentProps<typeof Knob>) => ({ ...knob, selected: learn === knob.label, onSelect: learn === false ? undefined : () => setLearn(knob.label) });

  // A note plays like a touch on the sky; a control turns the knob bound to it, or binds to the
  // one picked while assigning. Refreshed every render so it always sees the latest state.
  useEffect(() => {
    onMidi.current = ([status, a, b]) => {
      const type = status & 0xf0;
      if (type === 0x90 && b > 0) return play(noteDegree(a, key, scale), b / 127);
      if (type !== 0xb0) return;
      if (learn) {
        bindings.current = { ...Object.fromEntries(Object.entries(bindings.current).filter(([, label]) => label !== learn)), [a]: learn };
        try {
          localStorage.setItem(MIDI_KEY, JSON.stringify(bindings.current));
        } catch {}
        return setLearn(null);
      }
      const knob = [...sounds, ...shades, ...extras, ...synthKnobs].find((k) => k.label === bindings.current[a]);
      knob?.onChange(knob.min + (b / 127) * (knob.max - knob.min));
    };
  });

  // Shared by the controls beside the sky and the bar over it in full screen
  const tuning = (
    <>
      <label className="flex flex-col gap-1">
        Tono
        <select value={key} onChange={(e) => setKey(Number(e.target.value))} className="border border-current bg-black px-2 py-1 hd:px-1">
          {KEYS.map((k, i) => (
            <option key={k} value={i}>
              {k}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        Modo
        <select value={mode} onChange={(e) => setMode(e.target.value)} className="border border-current bg-black px-2 py-1 hd:px-1">
          {Object.keys(MODES).map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>
    </>
  );
  const midiButton = (
    <button
      onClick={connectMidi}
      aria-pressed={learn !== false}
      className="border border-current px-2 py-1 hover:text-white aria-pressed:bg-white aria-pressed:text-black"
    >
      {midi !== "on" ? "Conectar MIDI" : learn === false ? "Asignar MIDI" : "Hecho"}
    </button>
  );

  const full = view === "idle" || view === "leaving" || manual;
  const fading = view === "leaving" || view === "returning";

  const byLabel = Object.fromEntries([...sounds, ...shades, ...extras, ...synthKnobs].map((knob) => [knob.label, knob]));
  const knob = (label: string, size?: "small" | "big") => <Knob key={label} {...learnable(byLabel[label])} small={size === "small"} big={size === "big"} />;
  const fine = (labels: string[]) => labels.map((label) => knob(label, "small"));
  const midiControls = (
    <div className="flex flex-col items-center gap-1">
      {midiButton}
      <p className="max-w-40 text-center normal-case" aria-live="polite">
        {midi === "unavailable"
          ? "Este navegador no tiene MIDI; prueba con Chrome"
          : learn === null
            ? "Pulsa un knob y mueve un mando del controlador"
            : learn
              ? `Mueve un mando para ${learn}`
              : midi === "on"
                ? "Teclado y knobs conectados"
                : ""}
      </p>
    </div>
  );

  return (
    // A panel after the Minimoog's over the sky: sections left to right in the order the sound
    // flows, each with its big knobs and a row of fine ones, between wooden cheeks
    <div className="flex w-full flex-col gap-4">
      {/* The sky's box: in its place, or fixed over everything when full screen */}
      <div
        style={{ viewTransitionName: "cielo" }}
        className={`transition-opacity duration-700 motion-reduce:transition-none ${fading ? "pointer-events-none opacity-0" : ""} ${
          full
            ? `fixed inset-0 z-50 h-svh w-screen bg-black ${manual && bar ? "" : "cursor-none"}`
            : "relative aspect-[4/5] w-full min-w-0 overflow-hidden rounded-xl bg-white/5 sm:aspect-[4/3] lg:aspect-auto lg:h-[50svh] hd:h-[calc(100svh-var(--chrome)-3rem)]"
        }`}
      >
        <canvas
          ref={canvas}
          tabIndex={0}
          role="application"
          aria-label="Cielo: toca o arrastra para soltar notas, más agudas a la derecha y más brillantes arriba. Con el teclado, las teclas del 1 al 0 en cualquier parte de la página."
          onPointerDown={onPointer}
          onPointerMove={onPointer}
          onPointerUp={() => (lastDegree.current = null)}
          className="block h-full w-full touch-none -outline-offset-4 focus-visible:outline-2 focus-visible:outline-accent"
        />
        <p aria-live="polite" className="absolute top-3 left-3 font-mono text-xs text-white uppercase drop-shadow">
          {LOOPER_LABELS[looper]}
        </p>
        {!full && (
          <div className="absolute top-2 right-2 text-white drop-shadow">
            <RoundButton bare label="Pantalla completa" path={EXPAND} onClick={enterFull} />
          </div>
        )}
      </div>
      {/* Over the sky the panel sits between wooden cheeks; from hd (globals.css) up it moves into the
          logo's band, measured like globals.css's --chrome, each section's fine knobs dropping below it */}
      <div className="order-first flex items-stretch overflow-hidden rounded-xl hd:absolute hd:inset-x-0 hd:-top-36 hd:h-36 hd:overflow-visible">
        <span aria-hidden className="hidden w-5 shrink-0 sm:block hd:hidden" style={WOOD} />
        <div className="flex flex-1 flex-wrap justify-center gap-x-5 gap-y-5 bg-black px-4 py-4 font-mono text-[10px] uppercase sm:border-y sm:border-accent/30 hd:grid hd:grid-cols-[1fr_20rem_1fr] hd:items-center hd:border-0 hd:bg-transparent hd:px-8 hd:py-0 hd:text-[9px] hd2:text-[10px]">
          <div className="contents hd:col-start-1 hd:flex hd:justify-evenly hd:gap-3 hd:pl-12">
            <Section title="Mezclador" className="order-3 hd:order-none">
              {CHANNELS.map(({ label }) => knob(label))}
              {knob("Pitch")}
            </Section>
            <Section title="Le Jazz" className="order-1 hd:order-none">
              {/* Side by side reads better, but beside the logo there's only room for that from hd2 */}
              <div className="grid w-40 grid-cols-2 gap-2 hd:w-20 hd:grid-cols-1 hd:gap-1 hd2:w-40 hd2:grid-cols-2 hd2:gap-2">{tuning}</div>
            </Section>
          </div>
          <div className="contents hd:col-start-3 hd:flex hd:justify-evenly hd:gap-3">
            <Section title="Oscilador" open={fold === "Oscilador"} onToggle={() => setFold(fold === "Oscilador" ? null : "Oscilador")} className="order-2 hd:order-none" fine={fine(["Ataque", "Caída"])}>
              <div className="w-16 self-center">{waves}</div>
              {knob("Filtro")}
              {knob("Resonancia")}
            </Section>
            <Section
              title="Efectos"
              open={fold === "Efectos"}
              onToggle={() => setFold(fold === "Efectos" ? null : "Efectos")}
              className="order-4 hd:order-none"
              fine={
                <div className="flex flex-col items-center gap-2">
                  <div className="flex gap-3">{fine(["Tiempo eco", "Repeticiones", "Color eco"])}</div>
                  <div className="flex gap-3">{fine(["Tamaño reverb", "Color reverb"])}</div>
                </div>
              }
            >
              {knob("Eco")}
              {knob("Reverb")}
            </Section>
            <Section title="Cielo" open={fold === "Cielo"} onToggle={() => setFold(fold === "Cielo" ? null : "Cielo")} className="order-5 hd:order-none" fine={fine(["Saturación"])}>
              {knob("Luz")}
              {knob("Caos")}
            </Section>
            <Section title="Salida" open={fold === "Salida"} onToggle={() => setFold(fold === "Salida" ? null : "Salida")} className="order-6 hd:order-none" fine={midiControls}>
              {knob("Volumen", "big")}
              <div className="flex flex-col items-center gap-2 self-center">
                <RoundButton label={on ? "Apagar" : "Encender"} path={POWER} pressed={on} onClick={toggle} />
                <RoundButton bare label="Cómo funciona" path={INFO} onClick={() => info.current?.showModal()} />
              </div>
            </Section>
          </div>
        </div>
        <span aria-hidden className="hidden w-5 shrink-0 sm:block hd:hidden" style={WOOD} />
      </div>
      {manual && (
        // Every control, small and white along the bottom of the asked-for full-screen sky, in the
        // panel's sections with their fine knobs out; wraps where it doesn't fit, hides while nothing moves
        <div
          className={`fixed inset-x-0 bottom-0 z-[60] flex flex-wrap items-start justify-center gap-x-6 gap-y-3 bg-linear-to-t from-black/70 to-transparent px-4 pt-12 pb-4 font-mono text-[9px] text-white uppercase transition-opacity duration-700 motion-reduce:transition-none ${bar ? "" : "pointer-events-none opacity-0"}`}
        >
          <Section title="Le Jazz" small>
            <div className="grid w-40 grid-cols-2 gap-2">{tuning}</div>
          </Section>
          <Section title="Oscilador" small>
            <div className="w-16 self-center">{waves}</div>
            {fine(["Filtro", "Resonancia", "Ataque", "Caída"])}
          </Section>
          <Section title="Mezclador" small>
            {fine([...CHANNELS.map(({ label }) => label), "Pitch"])}
          </Section>
          <Section title="Efectos" small>
            {fine(["Eco", "Reverb", "Tiempo eco", "Repeticiones", "Color eco", "Tamaño reverb", "Color reverb"])}
          </Section>
          <Section title="Cielo" small>
            {fine(["Luz", "Caos", "Saturación"])}
          </Section>
          <Section title="Salida" small>
            {knob("Volumen", "small")}
            <div className="flex flex-col items-center gap-2 self-center">
              <RoundButton label={on ? "Apagar" : "Encender"} path={POWER} pressed={on} onClick={toggle} />
              {midiButton}
              <RoundButton bare label="Salir de pantalla completa" path={SHRINK} onClick={() => setView("normal")} />
            </div>
          </Section>
        </div>
      )}
      {/* A click on the backdrop closes it too; the padding lives inside, so a click there doesn't */}
      <dialog
        ref={info}
        aria-labelledby="como-funciona"
        onClick={(e) => e.target === e.currentTarget && info.current?.close()}
        className="m-auto max-w-md rounded-xl border border-accent/40 bg-black text-sm text-accent backdrop:bg-black/70"
      >
        <div className="p-6">
          <h2 id="como-funciona" className="font-display text-3xl uppercase">
            Cómo funciona
          </h2>
          <ul className="mt-4 flex flex-col gap-3 font-mono">
            <li>
              <strong>Enciéndelo</strong> con ⏻ y gira los knobs arrastrando arriba o abajo, o con las flechas. Doble clic y vuelven a su valor inicial.
            </li>
            <li>
              <strong>Toca el cielo</strong> para soltar notas: más agudas a la derecha, más brillantes arriba. Arrastrando tocas varias seguidas.
            </li>
            <li>
              <strong>Con el teclado</strong>, las teclas del 1 al 0 tocan diez notas de la escala, y Z y X bajan y suben una octava.
            </li>
            <li>
              <strong>Espacio graba un loop</strong> de las notas que toques: púlsalo para empezar, otra vez para cerrarlo y que suene en bucle, y otra para grabar encima. Ctrl+Z (o Cmd+Z) quita la última capa y Retroceso lo borra entero.
            </li>
            <li>
              <strong>Azar</strong> es el volumen de las notas que caen solas; <strong>Tus notas</strong>, el de las que tocas tú.
            </li>
            <li>
              <strong>Por MIDI</strong>, conecta un teclado o un controlador desde la sección Salida (en Chrome, Edge o Firefox). Los knobs de un Akai MPK mini funcionan sin configurar nada, y con Asignar MIDI enlazas cualquier mando a cualquier knob.
            </li>
            <li>
              <strong>Pantalla completa</strong> con el icono de la esquina. Si no tocas nada en un rato, el cielo se queda solo.
            </li>
          </ul>
          <button onClick={() => info.current?.close()} className="mt-6 border border-current px-3 py-1 font-mono uppercase hover:text-white">
            Cerrar
          </button>
        </div>
      </dialog>
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

// One section of the panel, its title printed over it like the Minimoog's: the big knobs, then the fine ones
// A section with fine knobs folds them away behind a triangle by its title, one open at a time:
// open, they sit under its big knobs over the sky, or drop below it beside the logo, where there's no room
// small: the full-screen bar's, with a smaller title
type SectionProps = { title: string; fine?: ReactNode; open?: boolean; onToggle?(): void; small?: boolean; className?: string; children: ReactNode };

function Section({ title, fine, open, onToggle, small, className, children }: SectionProps) {
  return (
    <section aria-label={title} className={`relative flex flex-col items-center border-t border-current/40 ${small ? "gap-2 pt-1" : "gap-3 pt-2 hd:gap-2 hd:pt-1"} ${className ?? ""}`}>
      <h2 className={`flex items-center gap-1 font-display tracking-[0.2em] ${small ? "text-xs" : "text-base hd:text-xs hd2:text-sm"}`}>
        <span aria-hidden>{title}</span>
        {fine && (
          <button onClick={onToggle} aria-expanded={open} aria-label={`Más controles de ${title}`} className="px-1 font-mono text-[10px] hover:text-white">
            {open ? "▾" : "▸"}
          </button>
        )}
      </h2>
      <div className={`flex items-start justify-center ${small ? "gap-2" : "gap-4 hd:gap-2"}`}>{children}</div>
      {fine && open && (
        <div className="flex items-start justify-center gap-3 hd:absolute hd:top-full hd:left-1/2 hd:z-20 hd:mt-2 hd:w-max hd:-translate-x-1/2 hd:rounded-lg hd:border hd:border-accent/40 hd:bg-black hd:p-3">{fine}</div>
      )}
    </section>
  );
}
