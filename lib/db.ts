import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getStore, type Store } from "@netlify/blobs";
// Imported rather than read from disk: a path built at runtime is invisible to
// Next's dependency tracing, so the file would be missing from the deployed
// function. Without it readDb finds no lastSyncAt and syncPlaylist runs inline,
// which times the request out.
import seed from "../data/db.json";
import type { Cadena } from "./cadenas";

export type Track = {
  id: string;
  title: string;
  artist: string;
  spotifyUri: string;
  durationSec: number;
  cover?: string;
  /** Plays the song on phones; null when YouTube had no match */
  youtubeId?: string | null;
  /** Spotify user id of whoever added it, when the sync reads the Web API */
  addedBy?: string;
  /** When it was added to the playlist, or when the radio first saw it if the sync reads the embed */
  firstSeenAt: string;
};

type Db = { lastSyncAt?: string; tracks: Track[] };

type Key = Cadena["dbKey"];

const file = (key: Key) => path.join(process.cwd(), "data", `${key}.json`);

/**
 * Each channel's songs live under their own key: the blob store is shared by every deploy, and
 * a sync drops whatever isn't in its playlist, so two channels on one key would wipe each other.
 * Only the usual one starts from data/db.json, which holds its songs. The others start empty,
 * with an old lastSyncAt so their first visit syncs after responding, not inline.
 */
const seedFor = (key: Key): Db => (key === "db" ? (seed as Db) : { lastSyncAt: new Date(0).toISOString(), tracks: [] });

/**
 * Netlify injects the Blobs context into deployed functions, where the filesystem is read-only.
 * Locally there is no context, so fall back to the JSON file and `npm run dev` needs no setup.
 */
export function blobs(): Store | null {
  try {
    // Default (eventual) consistency on purpose: a strong read goes through the Blobs API
    // instead of the edge and hangs if that part of the context never reaches the function.
    // Staleness is harmless here, since syncPlaylist already runs after the response.
    return getStore({ name: "radio" });
  } catch {
    return null;
  }
}

/**
 * The page must render even when the store misbehaves. Without this a hanging blob call
 * takes the whole request down with it, which is a worse failure than an outdated list.
 */
export async function withinTimeout<T>(what: string, ms: number, work: Promise<T>): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${what} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } catch (e) {
    console.error(`[db] ${what} failed:`, e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function readFileDb(key: Key): Promise<Db> {
  try {
    return JSON.parse(await readFile(file(key), "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return { tracks: [] };
    throw e;
  }
}

export async function readDb(key: Key): Promise<Db> {
  const store = blobs();
  if (!store) return readFileDb(key);
  // On the first deploy the blob is empty, so start from the db.json committed in the repo
  return (await withinTimeout("read", 3000, store.get(key, { type: "json" }))) ?? seedFor(key);
}

// Only one local server writes the file, so an in-process lock is enough there
let lock: Promise<unknown> = Promise.resolve();

function updateFileDb(key: Key, mutate: (db: Db) => void): Promise<Db> {
  const next = lock.then(async () => {
    const db = await readFileDb(key);
    mutate(db);
    await mkdir(path.dirname(file(key)), { recursive: true });
    await writeFile(file(key), JSON.stringify(db, null, 2));
    return db;
  });
  lock = next.catch(() => {});
  return next;
}

export async function updateDb(key: Key, mutate: (db: Db) => void): Promise<Db> {
  const store = blobs();
  if (!store) return updateFileDb(key, mutate);

  // Several instances can sync at once; a conditional write turns a lost race into a retry
  // rather than a dropped song. `modified: false` means someone else wrote first.
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await withinTimeout("read for update", 3000, store.getWithMetadata(key, { type: "json" }));
    // structuredClone so a mutation never leaks into the imported seed, which is
    // module state shared by every request this instance serves
    const db: Db = current?.data ?? structuredClone(seedFor(key));
    mutate(db);
    const write = await withinTimeout("write", 5000, store.setJSON(key, db, current?.etag ? { onlyIfMatch: current.etag } : { onlyIfNew: true }));
    if (write === null) return db;
    if (write.modified) return db;
  }
  throw new Error("Blob store kept losing the write race after 3 attempts");
}
