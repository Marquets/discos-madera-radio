import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

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

const FILE = path.join(process.cwd(), "data", "db.json");

// shortcut: JSON file + in-process lock, only valid for one local server; move to Supabase/Postgres before deploying
let lock: Promise<unknown> = Promise.resolve();

export async function readDb(): Promise<Db> {
  try {
    return JSON.parse(await readFile(FILE, "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return { tracks: [] };
    throw e;
  }
}

export function updateDb(mutate: (db: Db) => void): Promise<Db> {
  const next = lock.then(async () => {
    const db = await readDb();
    mutate(db);
    await mkdir(path.dirname(FILE), { recursive: true });
    await writeFile(FILE, JSON.stringify(db, null, 2));
    return db;
  });
  lock = next.catch(() => {});
  return next;
}
