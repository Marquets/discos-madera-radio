import { MAX_SEMANA, REVISAR } from "./buzon-reglas";
import { blobs, withinTimeout } from "./db";

/**
 * El buzón de voz de la portada: mensajes de hasta 30 segundos para la radio. Entran aprobados,
 * o esperan a que alguien los apruebe si REVISAR (buzon-reglas.ts); los aprobados se pueden
 * escuchar desde la portada y suenan en antena detrás de una cortinilla. Todos se borran a la
 * semana de grabarse.
 *
 * Cada mensaje es un blob suelto, buzon/<id>, con su hora y si está aprobado en los metadatos, y
 * la lista sale de listar ese prefijo. No hay un índice común: con la lectura eventual del blob
 * store, dos personas que grababan casi a la vez leían el índice viejo, la escritura condicional
 * fallaba tres veces y el segundo mensaje se quedaba fuera.
 */
export type Audio = { id: string; at: string; type: string; aprobado: boolean };

// 30 s de Opus a 64 kbps son unos 240 KB; Safari graba AAC y no siempre hace caso al bitrate
export const MAX_BYTES = 1_000_000;
export const COOLDOWN_MS = 5 * 60_000;
export const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
// Con tantos esperando revisión (o, sin revisión, tantos en la semana) se deja de aceptar, para
// que nadie inunde el buzón mientras no miras
export const MAX_PENDIENTES = 40;

const PREFIX = "buzon/";
const key = (id: string) => `${PREFIX}${id}`;
// El índice de antes: solo se lee para dar hora a los audios guardados con él
const INDICE_VIEJO = "buzon";

// En local no hay blob store y hay un solo proceso, así que basta la memoria (se pierde al reiniciar)
type Local = { audios?: Map<string, Audio & { bytes: ArrayBuffer }> };
const local: Local = ((globalThis as { buzon?: Local }).buzon ??= {});
local.audios ??= new Map();

export const fresco = (a: Audio, now = Date.now()) => now - Date.parse(a.at) < MAX_AGE_MS;

/** Todo lo guardado, caducado incluido, de más viejo a más nuevo */
async function todos(): Promise<Audio[]> {
  const store = blobs();
  if (!store) return [...local.audios!.values()].map(({ id, at, type, aprobado }) => ({ id, at, type, aprobado })).toSorted((a, b) => a.at.localeCompare(b.at));
  const lista = await withinTimeout("buzon list", 5000, store.list({ prefix: PREFIX }));
  if (!lista) return [];
  let viejo: Audio[] | undefined;
  const audios = await Promise.all(
    lista.blobs.map(async ({ key: k }): Promise<Audio | null> => {
      const id = k.slice(PREFIX.length);
      const meta = (await withinTimeout("buzon meta", 3000, store.getMetadata(k)))?.metadata;
      if (!meta) return null;
      if (typeof meta.at === "string") return { id, at: meta.at, type: String(meta.type ?? "audio/webm"), aprobado: meta.aprobado !== false };
      // Guardado con el índice de antes, o huérfano de una escritura de índice que falló: la
      // hora sale del índice si está, y si no, de ahora (así vive otra semana). Se pasa al
      // formato nuevo para no tener que volver a mirarlo.
      viejo ??= ((await withinTimeout("buzon old index", 3000, store.get(INDICE_VIEJO, { type: "json" }))) as Audio[] | null) ?? [];
      const at = viejo.find((a) => a.id === id)?.at ?? new Date().toISOString();
      const audio: Audio = { id, at, type: String(meta.type ?? "audio/webm"), aprobado: true };
      await reescribir(audio);
      return audio;
    }),
  );
  return audios.filter((a) => a !== null).toSorted((a, b) => a.at.localeCompare(b.at));
}

/** Vuelve a guardar el audio con estos metadatos: el blob store no cambia metadatos sin los bytes */
async function reescribir(audio: Audio) {
  const store = blobs();
  if (!store) {
    const actual = local.audios!.get(audio.id);
    if (actual) local.audios!.set(audio.id, { ...actual, ...audio });
    return;
  }
  const actual = await leerAudio(audio.id);
  if (actual) await withinTimeout("buzon rewrite", 5000, store.set(key(audio.id), actual.bytes, { metadata: meta(audio) }));
}

const meta = ({ at, type, aprobado }: Audio) => ({ at, type, aprobado });

/** Lo que sigue vivo, de más viejo a más nuevo */
export async function leerBuzon(): Promise<Audio[]> {
  return (await todos()).filter((a) => fresco(a));
}

/** Guarda un audio nuevo; null si el buzón ya está lleno */
export async function dejarAudio(bytes: ArrayBuffer, type: string): Promise<Audio | null> {
  const hay = await leerBuzon();
  if (REVISAR ? hay.filter((a) => !a.aprobado).length >= MAX_PENDIENTES : hay.length >= MAX_SEMANA) return null;
  const audio: Audio = { id: crypto.randomUUID(), at: new Date().toISOString(), type, aprobado: !REVISAR };
  const store = blobs();
  if (!store) local.audios!.set(audio.id, { ...audio, bytes });
  else if (!(await withinTimeout("buzon write", 8000, store.set(key(audio.id), bytes, { metadata: meta(audio) })))) throw new Error("No se ha podido guardar el audio");
  return audio;
}

export async function aprobar(id: string): Promise<Audio[]> {
  const audio = (await leerBuzon()).find((a) => a.id === id);
  if (audio && !audio.aprobado) await reescribir({ ...audio, aprobado: true });
  return leerBuzon();
}

async function quitar(id: string) {
  const store = blobs();
  if (!store) local.audios!.delete(id);
  else await withinTimeout("buzon delete", 3000, store.delete(key(id)));
}

export async function borrar(id: string): Promise<Audio[]> {
  await quitar(id);
  return (await leerBuzon()).filter((a) => a.id !== id);
}

/** Quita del almacén lo caducado; se llama de vez en cuando, para que se borre aunque nadie deje audios nuevos */
export async function limpiar() {
  await Promise.all((await todos()).filter((a) => !fresco(a)).map((a) => quitar(a.id)));
}

export async function leerAudio(id: string): Promise<{ bytes: ArrayBuffer; type: string } | null> {
  const store = blobs();
  if (!store) {
    const a = local.audios!.get(id);
    return a ? { bytes: a.bytes, type: a.type } : null;
  }
  const blob = await withinTimeout("buzon audio read", 5000, store.getWithMetadata(key(id), { type: "arrayBuffer" }));
  return blob ? { bytes: blob.data, type: String(blob.metadata.type ?? "audio/webm") } : null;
}
