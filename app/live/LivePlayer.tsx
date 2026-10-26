"use client";

import { useEffect, useRef, useState } from "react";
import type { Live } from "@/lib/lives";
import { nowPlaying } from "@/lib/schedule";
import type { Player, Progress } from "../RadioPlayer";
import { createYoutubePlayer } from "../youtubePlayer";

/** The live sets as a second radio: same clock and shuffle, so everyone watches the same moment */
export function LivePlayer({ sets }: { sets: Live[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let player: Player | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let last: Progress | null = null;
    let playing = -1;
    const durations = sets.map((s) => s.durationSec);

    function playNow() {
      clearTimeout(timer);
      last = null;
      let np = nowPlaying(durations, Date.now())!;
      // A set that ends a moment before the clock does would otherwise start over
      if (np.index === playing && durations[np.index] - np.offsetSec < 10) np = nowPlaying(durations, Date.now() + (durations[np.index] - np.offsetSec) * 1000 + 1)!;
      const set = sets[np.index];
      playing = np.index;
      setCurrent(np.index);
      player!.load({ id: set.id, youtubeId: set.id, spotifyUri: "", title: set.title, artist: "", durationSec: set.durationSec }, Math.floor(np.offsetSec));
      player!.play();
      // Backup for when the end is never reported; the player's own report usually comes first
      timer = setTimeout(playNow, (set.durationSec - np.offsetSec) * 1000 + 2000);
    }

    function onProgress(p: Progress) {
      // YouTube reports the end as paused at the full length
      const ended = p.isPaused && p.duration > 0 && p.position >= p.duration - 500;
      if (ended && last && !last.isPaused) playNow();
      else last = p;
    }

    // The player replaces its target node with an iframe, so give it one React doesn't own
    const target = document.createElement("div");
    box.current!.append(target);
    createYoutubePlayer(target, { ready: playNow, progress: onProgress }).then((p) => {
      if (cancelled) return p.destroy();
      player = p;
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      player?.destroy();
      target.remove();
    };
  }, [sets]);

  return (
    // As wide as the page, but never taller than the screen left under the header and the title
    <div className="mx-auto w-[min(100%,calc((100svh-var(--chrome)-7rem)*16/9))]">
      <div ref={box} className="aspect-video w-full overflow-hidden rounded-xl bg-white/5" />
      <p className="mt-4 text-center font-mono text-sm uppercase" aria-live="polite">
        {current === null ? "Sintonizando…" : sets[current].title}
      </p>
    </div>
  );
}
