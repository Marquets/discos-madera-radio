"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { JINGLE_EVERY, JINGLES } from "@/lib/jingles";
import { nowPlaying } from "@/lib/schedule";
import { useStored } from "./useStored";
import { createYoutubePlayer } from "./youtubePlayer";

export type RadioTrack = {
  id: string;
  spotifyUri: string;
  youtubeId?: string | null;
  title: string;
  artist: string;
  durationSec: number;
};

// position and duration in ms; title only from YouTube, the video's own
export type Progress = { isPaused: boolean; position: number; duration: number; title?: string };

// setVolume takes 0–100. Spotify's embed has no volume or mute, so its player leaves both out.
export type Player = {
  load(track: RadioTrack, startAt: number): void;
  play(): void;
  setVolume?(volume: number): void;
  setMuted?(muted: boolean): void;
  destroy(): void;
};

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
const VOLUME_KEY = "radio-volume";
const JINGLE_KEY = "radio-cortinilla";
const ANIM_KEY = "radio-animacion";
// The logo's animations while a jingle plays, one per jingle in this order; globals.css has each one
const LOGO_ANIMS = ["baile", "ondas", "cinta", "neon", "glitch", "dibujo"];

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
  // On a phone the player docks at the bottom of every page but the front one, and folds away
  const [folded, setFolded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const progress = useRef<Progress>(null);
  const [current, setCurrent] = useState<number | null>(null);
  // Separate from `current`: the browser may refuse to play what we just loaded
  const [playing, setPlaying] = useState(false);
  const [videoTitle, setVideoTitle] = useState<string>();
  // /live plays its own sets, and two things sounding at once would be noise
  const live = usePathname() === "/live";

  // Held in a ref so the ▶ button can reach the scheduler that lives inside the effect
  const tuneIn = useRef<() => void>(() => {});
  const [storedVolume, setStoredVolume] = useStored(VOLUME_KEY);
  const volume = storedVolume !== null && /^\d+$/.test(storedVolume) ? Math.min(100, Number(storedVolume)) : 100;
  // The effect builds the players once, so it reads the latest volume from here
  const volumeRef = useRef(volume);
  const applyVolume = useRef<(volume: number) => void>(() => {});
  // Not remembered: coming back to a silent radio would look broken
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const applyMute = useRef<(muted: boolean) => void>(() => {});

  function toggleMute() {
    mutedRef.current = !muted;
    setMuted(!muted);
    applyMute.current(!muted);
  }
  useEffect(() => {
    volumeRef.current = volume;
    applyVolume.current(volume);
  }, [volume]);

  // The layout hands over a fresh array whenever the server re-renders it, even with the
  // same songs, and rebuilding the player on that would cut the music mid-song
  const tracksKey = tracks.map((t) => `${t.id}:${t.durationSec}:${t.youtubeId}`).join();

  // Build the player up front so the radio can try to start on its own, and so the
  // button is instant when it can't: browsers only grant autoplay to origins the
  // visitor has already interacted with, so a first-timer still has to press play.
  useEffect(() => {
    if (!tracks.length || live) return;
    let cancelled = false;

    const jingle = new Audio();
    // globals.css makes the logo dance while this is on; the logo lives in the header, out of reach
    const showJingle = (on: boolean) => {
      const root = document.documentElement;
      if (on) {
        // How far the logo has to travel to sit in the middle of the screen, wherever the page is scrolled
        const logo = document.querySelector('header a[href="/"]')?.getBoundingClientRect();
        if (logo) {
          root.style.setProperty("--logo-dx", `${innerWidth / 2 - (logo.left + logo.width / 2)}px`);
          root.style.setProperty("--logo-dy", `${innerHeight / 2 - (logo.top + logo.height / 2)}px`);
        }
      }
      root.toggleAttribute("data-cortinilla", on);
      if (!on) return root.removeAttribute("data-anim");
      // One of the logo's animations for the whole jingle, taking turns; remembered like the
      // jingles' order, so a new visit carries on with the next one
      root.style.setProperty("--fase", `${Number.isFinite(jingle.duration) ? jingle.duration : 16}s`);
      let turn = 0;
      try {
        turn = Number(localStorage.getItem(ANIM_KEY)) || 0;
      } catch {}
      root.dataset.anim = LOGO_ANIMS[turn % LOGO_ANIMS.length];
      try {
        localStorage.setItem(ANIM_KEY, String((turn + 1) % LOGO_ANIMS.length));
      } catch {}
    };
    jingle.volume = volumeRef.current / 100;
    applyVolume.current = (v) => {
      jingle.volume = v / 100;
      controller.current?.setVolume?.(v);
    };
    // A tab only lets an <audio> start while hidden once it has played; until then a jingle
    // there would wait for the visitor to come back, and the radio with it
    let jingleReady = false;
    let songsSinceJingle = 0;
    // Remembered in the browser, so the order carries on across visits instead of starting
    // over with the first one every time
    let jinglesPlayed = 0;
    try {
      jinglesPlayed = Number(localStorage.getItem(JINGLE_KEY)) || 0;
    } catch {}
    let playingIndex = -1;
    // Only YouTube has a mute; with Spotify the button isn't shown
    let usingYoutube = false;
    applyMute.current = (m) => {
      jingle.muted = m;
      controller.current?.setMuted?.(m);
    };

    // Declarations, not consts, so they can schedule each other
    function playAt(index: number, startAt: number) {
      // Re-tuning after a blocked autoplay would otherwise leave two chains running
      clearTimeout(timer.current);
      jingle.pause();
      showJingle(false);
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
      try {
        localStorage.setItem(JINGLE_KEY, String(jinglesPlayed % JINGLES.length));
      } catch {}
      jingle.onended = () => {
        jingleReady = true;
        playNext();
      };
      // A jingle that can't play must not stop the radio
      const forced = jingleForced;
      jingleForced = false;
      jingle.play().then(
        () => showJingle(true),
        () => {
          // Autoplay said no to a forced one; the ▶ button tries it again
          if (forced) forceJingle = true;
          playNext();
        },
      );
      // The song player is paused now, which would bring back the ▶ button mid-jingle
      setPlaying(true);
    }

    function playScheduled() {
      const np = nowPlaying(tracks.map((t) => t.durationSec), Date.now())!;
      playAt(np.index, Math.floor(np.offsetSec));
    }
    // ?cortinilla in the address plays a jingle right away instead of waiting for it, to try them out
    let forceJingle = JINGLES.length > 0 && new URLSearchParams(location.search).has("cortinilla");
    let jingleForced = false;
    function start() {
      if (!forceJingle) return playScheduled();
      forceJingle = false;
      jingleForced = true;
      songsSinceJingle = JINGLE_EVERY - 1;
      next();
    }

    tuneIn.current = () => {
      // Phones only let an <audio> play from a tap, so unlock the jingle player on this one
      if (JINGLES.length && !forceJingle) {
        jingle.src = JINGLES[0];
        jingle.muted = true;
        jingle.play().then(() => {
          jingle.pause();
          jingle.muted = usingYoutube && mutedRef.current;
          jingleReady = true;
        }, () => {});
      }
      start();
    };

    let tuned = false;
    const onReady = () => {
      if (tuned) return;
      tuned = true;
      start();
    };
    const onProgress = (p: Progress) => {
      // The ended song keeps reporting "paused" for a while; during a jingle that's noise
      if (!jingle.paused) return;
      const prev = progress.current;
      progress.current = p;
      setPlaying(!p.isPaused);
      setVideoTitle(p.title);
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
      // tab. YouTube plays for anyone and carries on hidden, with the odd ad. So phones (a touch
      // screen, or one as narrow as the mobile layout) always play YouTube; elsewhere Spotify
      // is the default and the switch in the ticker can change it.
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(SOURCE_KEY);
      } catch {}
      const youtube = tracks.some((t) => t.youtubeId) && (matchMedia("(pointer: coarse), (max-width: 639px)").matches || stored === "youtube");
      // Both players replace the target node with their iframe, so give them one React doesn't own
      const target = document.createElement("div");
      // Always here, never in the page: moving an iframe reloads it and cuts the music,
      // so globals.css lays this box over the front page's slot instead
      container.current!.append(target);
      if (youtube) {
        const player = await createYoutubePlayer(target, { ready: onReady, progress: onProgress });
        if (cancelled) return player.destroy();
        controller.current = player;
        usingYoutube = true;
        applyVolume.current(volumeRef.current);
        applyMute.current(mutedRef.current);
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
      showJingle(false);
      controller.current?.destroy();
      setPlaying(false);
      setCurrent(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tracksKey stands for tracks, see above
  }, [tracksKey, choice, live]);

  const track = current === null ? null : tracks[current];
  const gracias = thanks.length ? ` · Gracias a ${thanks.join(", ")}` : "";
  const ticker = live
    ? "Live · Directos del colectivo Discos Madera"
    : !tracks.length
      ? "Todavía no suena nada · Añade la primera canción a la playlist"
      : playing && track
        ? `Ahora suena: ${(source === "youtube" && videoTitle) || `${track.title} — ${track.artist}`}${source === "spotify" ? " · ¿Solo oyes 30 segundos? Inicia sesión en open.spotify.com" : ""}${gracias}`
        : `Discos Madera Radio · ${tracks.length} canciones en antena · Pulsa ▶ para sintonizar, o dale al play del reproductor${gracias}`;

  return (
    <>
      <div className="ticker flex items-center bg-black font-mono text-sm uppercase text-accent">
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
        {/* Phones always play YouTube, so they get no switch */}
        {!live && tracks.some((t) => t.youtubeId) && (
          <div role="group" aria-label="Escuchar con" className="flex gap-1 pl-4 text-xs pointer-coarse:hidden max-sm:hidden">
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
        {/* Spotify's embed can't be turned down from outside, so only YouTube gets a slider */}
        {!live && source === "youtube" && (
          // A phone has its own volume buttons, and the ticker needs the room
          <label className="hidden items-center gap-2 pl-4 text-xs sm:flex">
            <span aria-hidden>Vol</span>
            <input
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => setStoredVolume(e.target.value)}
              aria-label="Volumen"
              className="w-20 accent-accent"
            />
          </label>
        )}
        {source === "youtube" && playing && (
          <button onClick={toggleMute} aria-pressed={muted} aria-label={muted ? "Activar el sonido" : "Silenciar"} className="py-2 pl-4 hover:text-white">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
              {muted ? <path d="M16 9l6 6M22 9l-6 6" /> : <path d="M16 8.5a5 5 0 0 1 0 7M19 5.5a9 9 0 0 1 0 13" />}
            </svg>
          </button>
        )}
        {!live && tracks.length > 0 && !playing && (
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
        data-on={current !== null || undefined}
        data-folded={folded || undefined}
        // Visible as soon as a track is loaded, never gated on `playing`: on iOS and Android
        // the gesture has to happen inside Spotify's own iframe, so hiding it until playback
        // is confirmed leaves a phone with no way to ever start the radio.
        // YouTube needs a video-shaped box; Spotify's iframe sets its own 80px height
        className={`fixed right-4 bottom-4 z-10 w-[min(360px,calc(100%-2rem))] overflow-hidden rounded-xl shadow-xl empty:hidden ${source === "youtube" ? "aspect-video" : ""} ${current === null ? "invisible" : ""}`}
      />
      {/* Only shown by globals.css, on a phone and away from the front page */}
      <button onClick={() => setFolded(!folded)} aria-expanded={!folded} aria-controls="radio" className="radio-toggle fixed right-3 z-10 hidden items-center rounded-t-md bg-black px-3 py-1.5 font-mono text-xs uppercase text-accent">
        {folded ? "▴ Reproductor" : "▾ Ocultar"}
      </button>
    </>
  );
}
