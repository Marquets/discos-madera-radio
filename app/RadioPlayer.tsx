"use client";

import { useEffect, useRef, useState } from "react";
import { nowPlaying } from "@/lib/schedule";
import { createYoutubePlayer } from "./youtubePlayer";

export type RadioTrack = {
  id: string;
  spotifyUri: string;
  youtubeId?: string | null;
  title: string;
  artist: string;
  durationSec: number;
};

// position and duration in ms
export type Progress = { isPaused: boolean; position: number; duration: number };

export type Player = { load(track: RadioTrack, startAt: number): void; play(): void; destroy(): void };

type EmbedController = {
  loadUri(uri: string, preferVideo: boolean, startAt: number): void;
  play(): void;
  // playback_started is the only way to know the browser actually let us play:
  // the API has no autoplay-blocked event, and play() reports nothing back
  addListener(event: "ready" | "playback_started", handler: () => void): void;
  // The API wraps every payload as { data }, and playback_update is the only event
  // that reports pausing, including a pause done from Spotify's own controls
  addListener(event: "playback_update", handler: (e: { data: Progress }) => void): void;
  destroy(): void;
};

type IFrameAPI = {
  createController(
    el: HTMLElement,
    // theme dark is the only look the API exposes: flat dark instead of a background
    // tinted from the cover art. There is no compact or hide-controls option.
    opts: { uri: string; width: string; height: number; theme?: "dark" },
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
  const controller = useRef<Player>(null);
  const [source, setSource] = useState<"spotify" | "youtube">("spotify");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const progress = useRef<Progress>(null);
  const [current, setCurrent] = useState<number | null>(null);
  // Separate from `current`: the browser may refuse to play what we just loaded
  const [playing, setPlaying] = useState(false);

  // Held in a ref so the ▶ button can reach the scheduler that lives inside the effect
  const tuneIn = useRef<() => void>(() => {});

  // The layout hands over a fresh array whenever the server re-renders it, even with the
  // same songs, and rebuilding the player on that would cut the music mid-song
  const tracksKey = tracks.map((t) => `${t.id}:${t.durationSec}:${t.youtubeId}`).join();

  // Build the player up front so the radio can try to start on its own, and so the
  // button is instant when it can't: browsers only grant autoplay to origins the
  // visitor has already interacted with, so a first-timer still has to press play.
  useEffect(() => {
    if (!tracks.length) return;
    let cancelled = false;

    // Declarations, not consts, so they can schedule each other
    function playAt(index: number, startAt: number) {
      // Re-tuning after a blocked autoplay would otherwise leave two chains running
      clearTimeout(timer.current);
      const track = tracks[index];
      setCurrent(index);
      controller.current?.load(track, startAt);
      controller.current?.play();

      // Every song starts a second or two after loading, so a timer alone cuts its ending.
      // The timer still drives the change, so a 30s preview waits out the full length as before.
      let lastPosition = -1;
      function waitForEnd() {
        const p = progress.current;
        // An unchanged position means the player stopped reporting, i.e. the song is over
        if (p && !p.isPaused && p.position < p.duration && p.position !== lastPosition) {
          lastPosition = p.position;
          timer.current = setTimeout(waitForEnd, p.duration - p.position + 250);
          return;
        }
        // The clock picks the next song in the shuffle, but from the top: by now the clock is a
        // few seconds into it. Each song adds that delay, so a long session drifts from other
        // listeners; a reload re-syncs.
        playAt(nowPlaying(tracks.map((t) => t.durationSec), Date.now())!.index, 0);
      }
      timer.current = setTimeout(waitForEnd, (track.durationSec - startAt) * 1000);
    }

    function playScheduled() {
      const np = nowPlaying(tracks.map((t) => t.durationSec), Date.now())!;
      playAt(np.index, Math.floor(np.offsetSec));
    }
    tuneIn.current = playScheduled;

    let tuned = false;
    const onReady = () => {
      if (tuned) return;
      tuned = true;
      playScheduled();
    };
    const onProgress = (p: Progress) => {
      progress.current = p;
      setPlaying(!p.isPaused);
    };

    (async () => {
      // Spotify's embed needs the visitor signed in to open.spotify.com in that browser,
      // which on a phone nobody is (they use the app), so it stays silent there. YouTube
      // plays for anyone; it only takes over once the sync has found videos to play.
      const youtube = matchMedia("(pointer: coarse)").matches && tracks.some((t) => t.youtubeId);
      // Both players replace the target node with their iframe, so give them one React doesn't own
      const target = document.createElement("div");
      // Always here, never in the page: moving an iframe reloads it and cuts the music,
      // so globals.css lays this box over the front page's slot instead
      container.current!.append(target);
      if (youtube) {
        const player = await createYoutubePlayer(target, { ready: onReady, progress: onProgress });
        if (cancelled) return player.destroy();
        controller.current = player;
        setSource("youtube");
      } else {
        const api = await loadSpotifyApi();
        if (cancelled) return;
        const first = nowPlaying(tracks.map((t) => t.durationSec), Date.now())!;
        api.createController(target, { uri: tracks[first.index].spotifyUri, width: "100%", height: 80, theme: "dark" }, (c) => {
          controller.current = { load: (t, startAt) => c.loadUri(t.spotifyUri, false, startAt), play: () => c.play(), destroy: () => c.destroy() };
          // The only signal the browser actually let us play; play() itself reports nothing
          c.addListener("playback_started", () => setPlaying(true));
          c.addListener("playback_update", (e) => onProgress(e.data));
          c.addListener("ready", onReady);
        });
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer.current);
      controller.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tracksKey stands for tracks, see above
  }, [tracksKey]);

  const track = current === null ? null : tracks[current];
  const gracias = thanks.length ? ` · Gracias a ${thanks.join(", ")}` : "";
  const ticker = !tracks.length
    ? "Todavía no suena nada · Añade la primera canción a la playlist"
    : playing && track
      ? `Ahora suena: ${track.title} — ${track.artist}${source === "spotify" ? " · ¿Solo oyes 30 segundos? Inicia sesión en open.spotify.com" : ""}${gracias}`
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
        id="radio"
        data-source={source}
        // Visible as soon as a track is loaded, never gated on `playing`: on iOS and Android
        // the gesture has to happen inside Spotify's own iframe, so hiding it until playback
        // is confirmed leaves a phone with no way to ever start the radio.
        // YouTube needs a video-shaped box; Spotify's iframe sets its own 80px height
        className={`fixed right-4 bottom-4 z-10 w-[min(360px,calc(100%-2rem))] overflow-hidden rounded-xl shadow-xl empty:hidden ${source === "youtube" ? "aspect-video" : ""} ${current === null ? "invisible" : ""}`}
      />
    </>
  );
}
