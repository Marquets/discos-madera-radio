import { after, connection } from "next/server";
import { cache } from "react";
import { readDb, updateDb, type Track } from "./db";
import { playlistTracks, trackCover } from "./spotify";
import { findVideo } from "./youtube";

const STALE_MS = 60 * 1000;

const isStale = (lastSyncAt?: string) => !lastSyncAt || Date.now() - Date.parse(lastSyncAt) > STALE_MS;

/**
 * Adds new playlist songs and never removes old ones, so the playlist can be trimmed
 * below Spotify's 100-song embed limit without losing the radio's history.
 */
export async function syncPlaylist() {
  const fresh = await playlistTracks();
  const now = new Date().toISOString();
  let added = 0;

  const db = await updateDb((db) => {
    const known = new Set(db.tracks.map((t) => t.id));
    for (const t of fresh) {
      if (known.has(t.id)) continue;
      db.tracks.push({ ...t, firstSeenAt: now });
      added++;
    }
    db.lastSyncAt = now;
  });
  await fillCovers(db.tracks.filter((t) => !t.cover));
  if (process.env.YOUTUBE_API_KEY) await fillVideos(db.tracks.filter((t) => t.youtubeId === undefined));
  return added;
}

async function fillVideos(tracks: Track[]) {
  // A failed search (quota, network) stays undefined and is retried on the next sync
  const ids = await Promise.all(tracks.map((t) => findVideo(t.title, t.artist).catch(() => undefined)));
  await updateDb((db) => {
    tracks.forEach(({ id }, i) => {
      const t = db.tracks.find((x) => x.id === id);
      if (t && ids[i] !== undefined) t.youtubeId = ids[i];
    });
  });
}

async function fillCovers(tracks: { id: string }[]) {
  const covers = await Promise.all(tracks.map((t) => trackCover(t.id).catch(() => undefined)));
  await updateDb((db) => {
    tracks.forEach(({ id }, i) => {
      const t = db.tracks.find((x) => x.id === id);
      if (t && covers[i]) t.cover = covers[i];
    });
  });
}

/** Shared by layout and page within one request; syncs inline only on the very first visit. */
export const getTracks = cache(async () => {
  await connection();
  const db = await readDb();
  if (!db.lastSyncAt) {
    await syncPlaylist();
    return (await readDb()).tracks;
  }
  // Pick up new playlist songs without blocking this visit; the next one shows them
  if (isStale(db.lastSyncAt)) after(syncPlaylist);
  return db.tracks;
});
