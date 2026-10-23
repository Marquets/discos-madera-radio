"use client";

import { useEffect, useRef, useState } from "react";
import { JINGLE_EVERY, JINGLES } from "@/lib/jingles";
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

const SOURCE_KEY = "radio-source";

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
  // Bumped by the Spotify/YouTube switch, so the player is rebuilt with the new choice
  const [choice, setChoice] = useState(0);
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

    const jingle = new Audio();
    // A tab only lets an <audio> start while hidden once it has played; until then a jingle
    // there would wait for the visitor to come back, and the radio with it
    let jingleReady = false;
    let songsSinceJingle = 0;
    let jinglesPlayed = 0;
    let playingIndex = -1;

    // Declarations, not consts, so they can schedule each other
    function playAt(index: number, startAt: number) {
      // Re-tuning after a blocked autoplay would otherwise leave two chains running
      clearTimeout(timer.current);
      jingle.pause();
      // So the new song's first "paused at 0" report isn't taken for the end of the old one
      progress.current = null;
      const track = tracks[index];
      playingIndex = index;
      setCurrent(index);
      controller.current?.load(track, startAt);
      controller.current?.play();

      // Backup for when the player never reports an end, like a 30s preview that waits out
      // the full length. Every song starts a second or two after loading, so this timer
      // alone would cut its ending; it re-arms until the player stops reporting progress.
      let lastPosition = -1;
      function waitForEnd() {
        const p = progress.current;
        if (p && !p.isPaused && p.position < p.duration && p.position !== lastPosition) {
          lastPosition = p.position;
          timer.current = setTimeout(waitForEnd, p.duration - p.position + 250);
          return;
        }
        next();
      }
      timer.current = setTimeout(waitForEnd, (track.durationSec - startAt) * 1000);
    }

    function next() {
      clearTimeout(timer.current);
      progress.current = null;
      // The clock picks the next song in the shuffle, but from the top: by now the clock is a
      // few seconds into it. Each song and jingle adds that delay, so a long session drifts
      // from other listeners; a reload re-syncs.
      const playNext = () => {
        const durations = tracks.map((t) => t.durationSec);
        let np = nowPlaying(durations, Date.now())!;
        // A song that ends a moment before the clock does would otherwise play again
        if (np.index === playingIndex) np = nowPlaying(durations, Date.now() + (durations[np.index] - np.offsetSec) * 1000 + 1)!;
        playAt(np.index, 0);
      };
      if (!JINGLES.length || ++songsSinceJingle < JINGLE_EVERY || (document.hidden && !jingleReady)) return playNext();
      songsSinceJingle = 0;
      jingle.src = JINGLES[jinglesPlayed++ % JINGLES.length];
      jingle.onended = () => {
        jingleReady = true;
        playNext();
      };
      // A jingle that can't play must not stop the radio
      jingle.play().catch(playNext);
      // The song player is paused now, which would bring back the ▶ button mid-jingle
      setPlaying(true);
    }

    function playScheduled() {
      const np = nowPlaying(tracks.map((t) => t.durationSec), Date.now())!;
      playAt(np.index, Math.floor(np.offsetSec));
    }
    tuneIn.current = () => {
      // Phones only let an <audio> play from a tap, so unlock the jingle player on this one
      if (JINGLES.length) {
        jingle.src = JINGLES[0];
        jingle.muted = true;
        jingle.play().then(() => {
          jingle.pause();
          jingle.muted = false;
          jingleReady = true;
        }, () => {});
      }
      playScheduled();
    };

    let tuned = false;
    const onReady = () => {
      if (tuned) return;
      tuned = true;
      playScheduled();
    };
    const onProgress = (p: Progress) => {
      // The ended song keeps reporting "paused" for a while; during a jingle that's noise
      if (!jingle.paused) return;
      const prev = progress.current;
      progress.current = p;
      setPlaying(!p.isPaused);
      // Move on the moment the player says the song ended. Its messages arrive even in a
      // background tab, where Chrome slows timers down so much that the next song never came.
      // Spotify reports the end as paused at 0, YouTube as paused at the full length. Previews
      // last 30s and are left to the timer, or they'd race through the playlist.
      const ended = p.isPaused && (p.position === 0 || p.position >= p.duration - 500);
      if (ended && prev && !prev.isPaused && prev.duration > 35_000 && prev.duration - prev.position < 2000) next();
    };

    (async () => {
      // Spotify has no ads, but its embed needs the visitor signed in to open.spotify.com in
      // that browser, which on a phone nobody is, and it can't start the next song in a hidden
      // tab. YouTube plays for anyone and carries on hidden, with the odd ad. So YouTube is the
      // default on phones, Spotify elsewhere, and the switch in the ticker overrides either.
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(SOURCE_KEY);
      } catch {}
      const youtube = tracks.some((t) => t.youtubeId) && (stored ? stored === "youtube" : matchMedia("(pointer: coarse)").matches);
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
        setSource("spotify");
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
      jingle.pause();
      controller.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tracksKey stands for tracks, see above
  }, [tracksKey, choice]);

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
        {tracks.some((t) => t.youtubeId) && (
          <div role="group" aria-label="Escuchar con" className="flex gap-1 pl-4 text-xs">
            {(["spotify", "youtube"] as const).map((s) => (
              <button
                key={s}
                aria-pressed={source === s}
                onClick={() => {
                  if (source === s) return;
                  try {
                    localStorage.setItem(SOURCE_KEY, s);
                  } catch {}
                  setChoice((c) => c + 1);
                }}
                className="px-1.5 py-0.5 hover:text-white aria-pressed:bg-accent aria-pressed:text-black"
              >
                {s === "spotify" ? "Spotify" : "YouTube"}
              </button>
            ))}
          </div>
        )}
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
