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
  addListener(event: "ready", handler: () => void): void;
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

export function RadioPlayer({ tracks }: { tracks: RadioTrack[] }) {
  const container = useRef<HTMLDivElement>(null);
  const controller = useRef<EmbedController>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [current, setCurrent] = useState<number | null>(null);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      controller.current?.destroy();
    },
    [],
  );

  function playScheduled() {
    const np = nowPlaying(tracks.map((t) => t.durationSec), Date.now())!;
    const track = tracks[np.index];
    setCurrent(np.index);
    controller.current!.loadUri(track.spotifyUri, false, Math.floor(np.offsetSec));
    controller.current!.play();
    // Follow the shared clock rather than player events, so 30s previews stay in sync too
    timer.current = setTimeout(playScheduled, (track.durationSec - np.offsetSec) * 1000 + 500);
  }

  async function tuneIn() {
    const api = await loadSpotifyApi();
    // Spotify replaces the target node with its iframe, so give it one React doesn't own
    const target = document.createElement("div");
    container.current!.append(target);
    const first = nowPlaying(tracks.map((t) => t.durationSec), Date.now())!;
    let started = false;
    api.createController(target, { uri: tracks[first.index].spotifyUri, width: "100%", height: 80 }, (c) => {
      controller.current = c;
      c.addListener("ready", () => {
        if (started) return;
        started = true;
        playScheduled();
      });
    });
  }

  const track = current === null ? null : tracks[current];
  const ticker = !tracks.length
    ? "Todavía no suena nada · Añade la primera canción a la playlist"
    : track
      ? `Ahora suena: ${track.title} — ${track.artist} · ¿Solo oyes 30 segundos? Inicia sesión en open.spotify.com`
      : `Discos Madera Radio · ${tracks.length} canciones en antena · Pulsa ▶ para sintonizar`;

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
        {tracks.length > 0 && current === null && (
          <button onClick={tuneIn} aria-label="Sintonizar la radio" className="px-4 py-2 text-lg leading-none hover:text-white">
            ▶
          </button>
        )}
        {current !== null && (
          <span className="flex items-center gap-2 px-4 text-xs font-bold">
            <span className="size-2 rounded-full bg-accent motion-safe:animate-pulse" /> Live
          </span>
        )}
      </div>
      <div
        ref={container}
        className={`fixed right-4 bottom-4 z-10 w-[min(360px,calc(100%-2rem))] overflow-hidden rounded-xl shadow-xl ${current === null ? "invisible" : ""}`}
      />
    </>
  );
}
