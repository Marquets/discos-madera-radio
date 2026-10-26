import { cacheLife } from "next/cache";

export type Live = { id: string; title: string; durationSec: number };

/** ISO 8601 durations as the Data API gives them, e.g. PT1H2M3S */
export function isoSeconds(duration: string) {
  const [, d = 0, h = 0, m = 0, s = 0] = duration.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/) ?? [];
  return ((Number(d) * 24 + Number(h)) * 60 + Number(m)) * 60 + Number(s);
}

async function youtube<T>(resource: string, params: Record<string, string>) {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${resource}?${new URLSearchParams({ ...params, key: process.env.YOUTUBE_API_KEY! })}`);
  // A bad playlist id or a spent quota leaves /live on "Coming soon" instead of failing the build
  if (!res.ok) {
    console.error(`YouTube ${resource} ${res.status}`);
    return [];
  }
  return ((await res.json()) as { items: T[] }).items;
}

/**
 * The collective's live sets, mirrored from a YouTube playlist like the radio mirrors Spotify's.
 * Title and length of each one for 2 quota units, asked again every hour.
 */
export async function liveSets(): Promise<Live[]> {
  "use cache";
  cacheLife("hours");
  const playlistId = process.env.YOUTUBE_LIVES_PLAYLIST_ID;
  if (!playlistId || !process.env.YOUTUBE_API_KEY) return [];
  // shortcut: only the first 50 videos of the playlist; page through nextPageToken if it grows past that
  const entries = await youtube<{ contentDetails: { videoId: string } }>("playlistItems", { part: "contentDetails", playlistId, maxResults: "50" });
  const ids = entries.map((e) => e.contentDetails.videoId);
  if (!ids.length) return [];
  const items = await youtube<{ id: string; snippet: { title: string }; contentDetails: { duration: string } }>("videos", { part: "snippet,contentDetails", id: ids.join(",") });
  // In the playlist's order, so every server hands out the same shuffle. Private and deleted
  // videos don't come back, and a stream still on air has no length yet.
  return ids.flatMap((id) => {
    const item = items.find((i) => i.id === id);
    const durationSec = item ? isoSeconds(item.contentDetails.duration) : 0;
    return item && durationSec ? [{ id, title: item.snippet.title, durationSec }] : [];
  });
}
