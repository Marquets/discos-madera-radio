"use client";

import { useEffect, useRef, useState } from "react";
import { nowPlaying } from "@/lib/schedule";

export type RadioTrack = {
  id: string;
  spotifyUri: string;
  title: string;
  artist: string;
  durationSec: number;
};

type EmbedController = {
  loadUri(uri: string, preferVideo: boolean, startAt: number): void;
  play(): void;
  // playback_started is the only way to know the browser actually let us play:
  // the API has no autoplay-blocked event, and play() reports nothing back
  addListener(event: "ready" | "playback_started", handler: () => void): void;
  // The API wraps every payload as { data }, and playback_update is the only event
  // that reports pausing, including a pause done from Spotify's own controls
  addListener(event: "playback_update", handler: (e: { data: { isPaused: boolean } }) => void): void;
  destroy(): void;
};

type IFrameAPI = {
  createController(
    el: HTMLElement,
    opts: { uri: string; width: string; height: number },
    callback: (controller: EmbedController) => void,
  ): void;
};

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: IFrameAPI) => void;
  }
}

let spotifyApi: Promise<IFrameAPI> | undefined;

function loadSpotifyApi() {
  spotifyApi ??= new Promise((resolve) => {
    window.onSpotifyIframeApiReady = resolve;
    const script = document.createElement("script");
    script.src = "https://open.spotify.com/embed/iframe-api/v1";
    document.head.append(script);
  });
  return spotifyApi;
}

export function RadioPlayer({ tracks, thanks }: { tracks: RadioTrack[]; thanks: string[] }) {
  const container = useRef<HTMLDivElement>(null);
  const controller = useRef<EmbedController>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [current, setCurrent] = useState<number | null>(null);
  // Separate from `current`: the browser may refuse to play what we just loaded
  const [playing, setPlaying] = useState(false);

  // Held in a ref so the ▶ button can reach the scheduler that lives inside the effect
  const tuneIn = useRef<() => void>(() => {});

  // Build the player up front so the radio can try to start on its own, and so the
  // button is instant when it can't: browsers only grant autoplay to origins the
  // visitor has already interacted with, so a first-timer still has to press play.
  useEffect(() => {
    if (!tracks.length) return;
    let cancelled = false;

    // A declaration, not a const, so it can schedule itself
    function playScheduled() {
      // Re-tuning after a blocked autoplay would otherwise leave two chains running
      clearTimeout(timer.current);
      const np = nowPlaying(tracks.map((t) => t.durationSec), Date.now())!;
      const track = tracks[np.index];
      setCurrent(np.index);
      controller.current?.loadUri(track.spotifyUri, false, Math.floor(np.offsetSec));
      controller.current?.play();
      // Follow the shared clock rather than player events, so 30s previews stay in sync too
      timer.current = setTimeout(playScheduled, (track.durationSec - np.offsetSec) * 1000 + 500);
    }
    tuneIn.current = playScheduled;

    (async () => {
      const api = await loadSpotifyApi();
      if (cancelled) return;
      // Spotify replaces the target node with its iframe, so give it one React doesn't own
      const target = document.createElement("div");
      container.current!.append(target);
      const first = nowPlaying(tracks.map((t) => t.durationSec), Date.now())!;
      let tuned = false;
      api.createController(target, { uri: tracks[first.index].spotifyUri, width: "100%", height: 80 }, (c) => {
        controller.current = c;
        // The only signal the browser actually let us play; play() itself reports nothing
        c.addListener("playback_started", () => setPlaying(true));
        c.addListener("playback_update", (e) => setPlaying(!e.data.isPaused));
        c.addListener("ready", () => {
          if (tuned) return;
          tuned = true;
          playScheduled();
        });
      });
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer.current);
      controller.current?.destroy();
    };
  }, [tracks]);

  const track = current === null ? null : tracks[current];
  const gracias = thanks.length ? ` · Gracias a ${thanks.join(", ")}` : "";
  const ticker = !tracks.length
    ? "Todavía no suena nada · Añade la primera canción a la playlist"
    : playing && track
      ? `Ahora suena: ${track.title} — ${track.artist} · ¿Solo oyes 30 segundos? Inicia sesión en open.spotify.com${gracias}`
      : `Discos Madera Radio · ${tracks.length} canciones en antena · Pulsa ▶ para sintonizar, o dale al play del reproductor${gracias}`;

  return (
    <>
      <div className="flex items-center bg-black font-mono text-sm uppercase text-accent">
        <p className="sr-only" aria-live="polite">
          {ticker}
        </p>
        <div className="min-w-0 flex-1 overflow-hidden whitespace-nowrap py-2" aria-hidden>
          <div className="marquee flex w-max">
            {[0, 1].map((half) => (
              <span key={half} className="flex">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="px-4">
                    {ticker}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>
        {tracks.length > 0 && !playing && (
          <button onClick={() => tuneIn.current()} aria-label="Sintonizar la radio" className="py-2 pl-4 pr-6 text-lg leading-none hover:text-white">
            ▶
          </button>
        )}
        {playing && (
          <span className="flex items-center gap-2 pl-4 pr-6 text-xs font-bold">
            <span className="size-2 rounded-full bg-accent motion-safe:animate-pulse" /> Live
          </span>
        )}
      </div>
      <div
        ref={container}
        // Visible as soon as a track is loaded, never gated on `playing`: on iOS and Android
        // the gesture has to happen inside Spotify's own iframe, so hiding it until playback
        // is confirmed leaves a phone with no way to ever start the radio.
        className={`fixed right-4 bottom-4 z-10 w-[min(360px,calc(100%-2rem))] overflow-hidden rounded-xl shadow-xl ${current === null ? "invisible" : ""}`}
      />
    </>
  );
}
