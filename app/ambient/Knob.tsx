"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  initial: number;
  small?: boolean;
  // While MIDI is being assigned, a press picks the knob instead of turning it
  selected?: boolean;
  onSelect?(): void;
  onChange(value: number): void;
  format(value: number): string;
};

// Pixels of vertical drag that sweep the whole range, and arrow presses that do
const TRAVEL = 150;
const STEPS = 24;

/** Turned by dragging up or down; arrows step through it, a double click puts it back where it started */
export function Knob({ label, value, min, max, initial, small, selected, onSelect, onChange, format }: Props) {
  const drag = useRef<{ y: number; value: number }>(null);
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const step = (max - min) / STEPS;
  const angle = ((value - min) / (max - min)) * 270 - 135;

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (onSelect) return onSelect();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y: e.clientY, value };
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (drag.current) onChange(clamp(drag.current.value + ((drag.current.y - e.clientY) / TRAVEL) * (max - min)));
  }

  function onKeyDown(e: KeyboardEvent) {
    if (onSelect && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      return onSelect();
    }
    const next = { ArrowUp: value + step, ArrowRight: value + step, ArrowDown: value - step, ArrowLeft: value - step, Home: min, End: max }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    onChange(clamp(next));
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={format(value)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => (drag.current = null)}
        onDoubleClick={() => onChange(initial)}
        onKeyDown={onKeyDown}
        className={`relative ${small ? "size-9" : "size-14 xl:size-11"} ${onSelect ? "cursor-pointer" : "cursor-ns-resize"} ${selected ? "ring-2 ring-white ring-offset-2 ring-offset-black" : ""} touch-none rounded-full border-2 border-current bg-white/5 outline-offset-4 focus-visible:outline-2 focus-visible:outline-accent`}
      >
        <div className="absolute inset-0" style={{ rotate: `${angle}deg` }}>
          <span className="absolute top-1 left-1/2 h-3.5 w-0.5 -translate-x-1/2 bg-current" />
        </div>
      </div>
      <span aria-hidden className="text-center leading-tight">
        {label}
        <br />
        {format(value)}
      </span>
    </div>
  );
}
