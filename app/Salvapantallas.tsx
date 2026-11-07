"use client";

import { useEffect } from "react";

// Half a minute untouched with the radio on, and the front page turns into just the logo, the tape
// deck and the player: for leaving it on a TV or a laptop across the room. Not on phones, where
// nobody leaves the screen on untouched and it would only get in the way.
const IDLE_MS = 30_000;
// A nudge of the mouse on the desk is not someone coming back
const MOVE_PX = 12;
const ATTR = "data-salvapantallas";

const isScreen = () => matchMedia("(pointer: fine) and (min-width: 640px)").matches;
const radioOn = () => !!document.querySelector("#radio[data-on]");

export function Salvapantallas() {
  useEffect(() => {
    const root = document.documentElement;
    let idle: ReturnType<typeof setTimeout> | undefined;
    let moved = 0;

    function on() {
      if (!isScreen() || !radioOn()) return arm();
      // The hero is exactly one screen tall from the top, so that's the frame
      scrollTo({ top: 0 });
      root.setAttribute(ATTR, "");
      // The deck puts its trunk back between the reels, whatever drawing a hover left there (TapeDeck.tsx)
      dispatchEvent(new Event("radio:salvapantallas"));
      moved = 0;
    }
    function off() {
      root.removeAttribute(ATTR);
      arm();
    }
    function arm() {
      clearTimeout(idle);
      idle = setTimeout(() => on(), IDLE_MS);
    }
    function activity(e: Event) {
      if (!root.hasAttribute(ATTR)) return arm();
      if (e instanceof PointerEvent && e.type === "pointermove") {
        moved += Math.abs(e.movementX) + Math.abs(e.movementY);
        if (moved < MOVE_PX) return;
      }
      off();
    }

    const events = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"] as const;
    for (const e of events) addEventListener(e, activity, { passive: true });
    arm();
    return () => {
      clearTimeout(idle);
      for (const e of events) removeEventListener(e, activity);
      root.removeAttribute(ATTR);
    };
  }, []);

  return null;
}
