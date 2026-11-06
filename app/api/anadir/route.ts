import { cadenaActual } from "@/lib/cadenas-server";
import { readDb, updateDb } from "@/lib/db";
import { addToPlaylist, getTrack } from "@/lib/spotify";

const COOLDOWN_MS = 20_000;
// shortcut: per function instance and keyed by IP, as for the messages; enough to stop a double tap
const lastAdd = new Map<string, number>();

/** Adds a song to the playlist of the channel on air, and remembers who picked it for "cortesía de" */
export async function POST(request: Request) {
  const { id, quien: nombre } = await request.json().catch(() => ({}));
  if (typeof id !== "string" || !/^[A-Za-z0-9]{22}$/.test(id)) return Response.json({ error: "Esa canción no existe" }, { status: 400 });
  // Optional: left empty the song stays a mystery, since Spotify would say the radio's own account added it
  const quien = typeof nombre === "string" ? nombre.replace(/\s+/g, " ").trim().slice(0, 30) : "";

  const cadena = await cadenaActual();
  if (!cadena.playlistId) return Response.json({ error: "Esta cadena no tiene playlist" }, { status: 503 });
  if ((await readDb(cadena.dbKey)).tracks.some((t) => t.id === id)) return Response.json({ error: "Ya está en la radio" }, { status: 409 });

  const who = request.headers.get("x-nf-client-connection-ip") ?? request.headers.get("x-forwarded-for") ?? "local";
  const wait = (lastAdd.get(who) ?? 0) + COOLDOWN_MS - Date.now();
  if (wait > 0) return Response.json({ error: "Espera un momento antes de poner otra", wait }, { status: 429 });

  const track = await getTrack(id);
  if (!track) return Response.json({ error: "Esa canción no existe" }, { status: 404 });
  try {
    await addToPlaylist(cadena.playlistId, track.spotifyUri);
  } catch (e) {
    console.error("[anadir]", e);
    return Response.json({ error: "Spotify no ha dejado añadirla" }, { status: 502 });
  }
  lastAdd.set(who, Date.now());

  // On the radio right away, without waiting for the next sync to see it in the playlist
  await updateDb(cadena.dbKey, (db) => {
    db.cortesias = { ...db.cortesias, [id]: quien };
    if (!db.tracks.some((t) => t.id === id)) db.tracks.push({ ...track, cortesia: quien, firstSeenAt: new Date().toISOString() });
  });
  return Response.json({ track });
}
