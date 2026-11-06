import { after, connection } from "next/server";
import { cache } from "react";
import { cadenaActual, type CadenaEnAntena } from "./cadenas-server";
import { readDb, updateDb, type Track } from "./db";
import { trackMeasures } from "./reccobeats";
import { playlistTracks, trackCover } from "./spotify";
import { VIDEO_OVERRIDES } from "./videos";
import { findVideo } from "./youtube";

const STALE_MS = 60 * 1000;

const isStale = (lastSyncAt?: string) => !lastSyncAt || Date.now() - Date.parse(lastSyncAt) > STALE_MS;

/** Mirrors a channel's playlist: new songs are added and songs taken off it stop playing. */
export async function syncPlaylist({ dbKey, playlistId }: CadenaEnAntena) {
  if (!playlistId) return 0;
  const fresh = await playlistTracks(playlistId);
  const now = new Date().toISOString();
  let added = 0;

  const db = await updateDb(dbKey, (db) => {
    // An empty list is more likely an embed glitch than an emptied playlist, and would wipe every stored video
    if (fresh.length) {
      const current = new Set(fresh.map((t) => t.id));
      db.tracks = db.tracks.filter((t) => current.has(t.id));
    }
    const byId = new Map(fresh.map((t) => [t.id, t]));
    for (const t of db.tracks) t.addedBy = byId.get(t.id)?.addedBy ?? t.addedBy;
    const known = new Set(db.tracks.map((t) => t.id));
    for (const { addedAt, ...t } of fresh) {
      if (known.has(t.id)) continue;
      db.tracks.push({ ...t, cortesia: db.cortesias?.[t.id], firstSeenAt: addedAt ?? now });
      added++;
    }
    for (const t of db.tracks) if (VIDEO_OVERRIDES[t.id]) t.youtubeId = VIDEO_OVERRIDES[t.id];
    db.lastSyncAt = now;
  });
  await fillCovers(dbKey, db.tracks.filter((t) => !t.cover));
  await fillMeasures(dbKey, db.tracks.filter((t) => t.nocturna === undefined));
  if (process.env.YOUTUBE_API_KEY) await fillVideos(dbKey, db.tracks.filter((t) => t.youtubeId === undefined));
  return added;
}

async function fillVideos(dbKey: string, tracks: Track[]) {
  // A failed search (quota, network) stays undefined and is retried on the next sync
  const ids = await Promise.all(tracks.map((t) => findVideo(t.title, t.artist).catch(() => undefined)));
  await updateDb(dbKey, (db) => {
    tracks.forEach(({ id }, i) => {
      const t = db.tracks.find((x) => x.id === id);
      if (t && ids[i] !== undefined) t.youtubeId = ids[i];
    });
  });
}

async function fillMeasures(dbKey: string, tracks: { id: string }[]) {
  if (!tracks.length) return;
  // A failed request (network, API down) leaves them undefined, so the next sync asks again
  const measures = await trackMeasures(tracks.map((t) => t.id)).catch(() => undefined);
  if (!measures) return;
  await updateDb(dbKey, (db) => {
    for (const t of db.tracks) {
      const m = measures.get(t.id);
      if (m) Object.assign(t, m);
    }
  });
}

async function fillCovers(dbKey: string, tracks: { id: string }[]) {
  const covers = await Promise.all(tracks.map((t) => trackCover(t.id).catch(() => undefined)));
  await updateDb(dbKey, (db) => {
    tracks.forEach(({ id }, i) => {
      const t = db.tracks.find((x) => x.id === id);
      if (t && covers[i]) t.cover = covers[i];
    });
  });
}

/**
 * The songs of the channel this visitor is on. Shared by layout and page within one request;
 * syncs inline only on the very first visit.
 */
export const getTracks = cache(async () => {
  await connection();
  const cadena = await cadenaActual();
  const db = await readDb(cadena.dbKey);
  if (!db.lastSyncAt) {
    await syncPlaylist(cadena);
    return (await readDb(cadena.dbKey)).tracks;
  }
  // Pick up new playlist songs without blocking this visit; the next one shows them
  if (isStale(db.lastSyncAt)) after(() => syncPlaylist(cadena));
  return db.tracks;
});
