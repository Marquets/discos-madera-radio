import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getStore, type Store } from "@netlify/blobs";
// Imported rather than read from disk: a path built at runtime is invisible to
// Next's dependency tracing, so the file would be missing from the deployed
// function. Without it readDb finds no lastSyncAt and syncPlaylist runs inline,
// which times the request out.
import seed from "../data/db.json";

export type Track = {
  id: string;
  title: string;
  artist: string;
  spotifyUri: string;
  durationSec: number;
  cover?: string;
  /** When the radio first saw it in the playlist (Spotify's embed doesn't expose the real added date) */
  firstSeenAt: string;
};

type Db = { lastSyncAt?: string; tracks: Track[] };

const KEY = "db";
const FILE = path.join(process.cwd(), "data", "db.json");
const SEED = seed as Db;

/**
 * Netlify injects the Blobs context into deployed functions, where the filesystem is read-only.
 * Locally there is no context, so fall back to the JSON file and `npm run dev` needs no setup.
 */
function blobs(): Store | null {
  try {
    // Strong consistency: an eventually consistent read can drop a song that was just synced
    return getStore({ name: "radio", consistency: "strong" });
  } catch {
    return null;
  }
}

async function readFileDb(): Promise<Db> {
  try {
    return JSON.parse(await readFile(FILE, "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return { tracks: [] };
    throw e;
  }
}

export async function readDb(): Promise<Db> {
  const store = blobs();
  if (!store) return readFileDb();
  // On the first deploy the blob is empty, so start from the db.json committed in the repo
  return (await store.get(KEY, { type: "json" })) ?? SEED;
}

// Only one local server writes the file, so an in-process lock is enough there
let lock: Promise<unknown> = Promise.resolve();

function updateFileDb(mutate: (db: Db) => void): Promise<Db> {
  const next = lock.then(async () => {
    const db = await readFileDb();
    mutate(db);
    await mkdir(path.dirname(FILE), { recursive: true });
    await writeFile(FILE, JSON.stringify(db, null, 2));
    return db;
  });
  lock = next.catch(() => {});
  return next;
}

export async function updateDb(mutate: (db: Db) => void): Promise<Db> {
  const store = blobs();
  if (!store) return updateFileDb(mutate);

  // Several instances can sync at once; a conditional write turns a lost race into a retry
  // rather than a dropped song. `modified: false` means someone else wrote first.
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await store.getWithMetadata(KEY, { type: "json" });
    // structuredClone so a mutation never leaks into the imported seed, which is
    // module state shared by every request this instance serves
    const db: Db = current?.data ?? structuredClone(SEED);
    mutate(db);
    const { modified } = await store.setJSON(KEY, db, current?.etag ? { onlyIfMatch: current.etag } : { onlyIfNew: true });
    if (modified) return db;
  }
  throw new Error("Blob store kept losing the write race after 3 attempts");
}
