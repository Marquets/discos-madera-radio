import type { Player, Progress, RadioTrack } from "./RadioPlayer";

type YTPlayer = {
  loadVideoById(opts: { videoId: string; startSeconds: number }): void;
  playVideo(): void;
  stopVideo(): void;
  getPlayerState(): number;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
};

declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement, opts: object) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const PLAYING = 1;
const BUFFERING = 3;

let youtubeApi: Promise<void> | undefined;

function loadYoutubeApi() {
  youtubeApi ??= new Promise((resolve) => {
    window.onYouTubeIframeAPIReady = resolve;
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.append(script);
  });
  return youtubeApi;
}

/** Same shape as the Spotify player, so the radio's scheduling doesn't care which one plays */
export async function createYoutubePlayer(el: HTMLElement, on: { ready(): void; progress(p: Progress): void }): Promise<Player> {
  await loadYoutubeApi();
  let poll: ReturnType<typeof setInterval> | undefined;

  const report = () =>
    on.progress({
      // Buffering counts as playing, or the ▶ button would flash on every song change
      isPaused: ![PLAYING, BUFFERING].includes(player.getPlayerState()),
      position: player.getCurrentTime() * 1000,
      duration: player.getDuration() * 1000,
    });

  const player = new window.YT!.Player(el, {
    width: "100%",
    height: "100%",
    // Without playsinline an iPhone opens every song fullscreen
    playerVars: { playsinline: 1 },
    events: {
      onReady() {
        // This API has no progress event like Spotify's playback_update, so poll for one
        poll = setInterval(report, 1000);
        on.ready();
      },
      onStateChange: report,
    },
  });

  return {
    load(track: RadioTrack, startAt: number) {
      // A song YouTube had no match for plays as silence until the clock moves on
      if (track.youtubeId) player.loadVideoById({ videoId: track.youtubeId, startSeconds: startAt });
      else player.stopVideo();
    },
    play: () => player.playVideo(),
    destroy() {
      clearInterval(poll);
      player.destroy();
    },
  };
}
