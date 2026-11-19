import { blobs, withinTimeout } from "./db";

/**
 * Entradillas: alguien presentando una canción concreta, como un locutor, con la grabadora del
 * buzón. Suenan encima del arranque de esa canción cada vez que sale en la radio (si tiene
 * varias, una al azar). No caducan: se borran a mano en /buzon.
 *
 * Como los audios del buzón (buzon.ts), cada una es un blob suelto, entradilla/<id>, con la
 * canción y la hora en los metadatos, y la lista sale de listar ese prefijo.
 */
export type Entradilla = { id: string; at: string; type: string; track: string };

// Sin caducidad, un tope para que nadie llene el almacén
export const MAX_ENTRADILLAS = 300;
/** Un id de canción de Spotify, que es como la radio las guarda */
export const esTema = (id: string) => /^[A-Za-z0-9]{22}$/.test(id);

const PREFIX = "entradilla/";
const key = (id: string) => `${PREFIX}${id}`;

type Local = { entradillas?: Map<string, Entradilla & { bytes: ArrayBuffer }> };
const local: Local = ((globalThis as { entradillas?: Local }).entradillas ??= {});
local.entradillas ??= new Map();

/** Todas, de más vieja a más nueva */
export async function leerEntradillas(): Promise<Entradilla[]> {
  const store = blobs();
  if (!store) return [...local.entradillas!.values()].map(({ id, at, type, track }) => ({ id, at, type, track })).toSorted((a, b) => a.at.localeCompare(b.at));
  const lista = await withinTimeout("entradillas list", 5000, store.list({ prefix: PREFIX }));
  if (!lista) return [];
  const todas = await Promise.all(
    lista.blobs.map(async ({ key: k }): Promise<Entradilla | null> => {
      const meta = (await withinTimeout("entradilla meta", 3000, store.getMetadata(k)))?.metadata;
      if (typeof meta?.at !== "string" || typeof meta.track !== "string") return null;
      return { id: k.slice(PREFIX.length), at: meta.at, type: String(meta.type ?? "audio/webm"), track: meta.track };
    }),
  );
  return todas.filter((e) => e !== null).toSorted((a, b) => a.at.localeCompare(b.at));
}

/** Guarda una nueva; null si ya hay demasiadas */
export async function dejarEntradilla(bytes: ArrayBuffer, type: string, track: string): Promise<Entradilla | null> {
  if ((await leerEntradillas()).length >= MAX_ENTRADILLAS) return null;
  const e: Entradilla = { id: crypto.randomUUID(), at: new Date().toISOString(), type, track };
  const store = blobs();
  if (!store) local.entradillas!.set(e.id, { ...e, bytes });
  else if (!(await withinTimeout("entradilla write", 8000, store.set(key(e.id), bytes, { metadata: { at: e.at, type, track } })))) throw new Error("No se ha podido guardar la entradilla");
  return e;
}

export async function borrarEntradilla(id: string): Promise<Entradilla[]> {
  const store = blobs();
  if (!store) local.entradillas!.delete(id);
  else await withinTimeout("entradilla delete", 3000, store.delete(key(id)));
  return (await leerEntradillas()).filter((e) => e.id !== id);
}

export async function leerAudioEntradilla(id: string): Promise<{ bytes: ArrayBuffer; type: string } | null> {
  const store = blobs();
  if (!store) {
    const e = local.entradillas!.get(id);
    return e ? { bytes: e.bytes, type: e.type } : null;
  }
  const blob = await withinTimeout("entradilla read", 5000, store.getWithMetadata(key(id), { type: "arrayBuffer" }));
  return blob ? { bytes: blob.data, type: String(blob.metadata.type ?? "audio/webm") } : null;
}
