import { MAX_SEMANA, REVISAR } from "./buzon-reglas";
import { blobs, withinTimeout } from "./db";

/**
 * El buzón de voz de la portada: mensajes de hasta 30 segundos para la radio. Llegan sin aprobar;
 * los aprobados se pueden escuchar desde la portada y suenan en antena en el hueco de una
 * cortinilla. Todos se borran a la semana de grabarse.
 */
export type Audio = { id: string; at: string; type: string; aprobado: boolean };

// 30 s de Opus a 64 kbps son unos 240 KB; Safari graba AAC y no siempre hace caso al bitrate
export const MAX_BYTES = 1_000_000;
export const COOLDOWN_MS = 5 * 60_000;
export const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
// Con tantos esperando revisión (o, sin revisión, tantos en la semana) se deja de aceptar, para
// que nadie inunde el buzón mientras no miras
export const MAX_PENDIENTES = 40;

const INDEX = "buzon";
const key = (id: string) => `buzon/${id}`;

// En local no hay blob store y hay un solo proceso, así que basta la memoria (se pierde al reiniciar)
type Local = { index?: Audio[]; audios?: Map<string, { bytes: ArrayBuffer; type: string }> };
const local: Local = ((globalThis as { buzon?: Local }).buzon ??= {});
local.audios ??= new Map();

export const fresco = (a: Audio, now = Date.now()) => now - Date.parse(a.at) < MAX_AGE_MS;

async function leerIndice(): Promise<{ data: Audio[]; etag?: string }> {
  const store = blobs();
  if (!store) return { data: local.index ?? [] };
  const current = await withinTimeout("buzon read", 3000, store.getWithMetadata(INDEX, { type: "json" }));
  return { data: (current?.data as Audio[] | undefined) ?? [], etag: current?.etag };
}

/** Lo que sigue vivo, de más viejo a más nuevo */
export async function leerBuzon(): Promise<Audio[]> {
  return (await leerIndice()).data.filter((a) => fresco(a));
}

/**
 * Cambia el índice y borra los audios que se quedan fuera, tanto los que quita el cambio como
 * los caducados. Varias personas escriben a la vez; una escritura condicional convierte una
 * carrera perdida en un reintento, como en messages.ts.
 */
async function cambiar(change: (audios: Audio[]) => Audio[]): Promise<Audio[]> {
  const store = blobs();
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, etag } = await leerIndice();
    const next = change(data.filter((a) => fresco(a)));
    const fuera = data.filter((a) => !next.some((n) => n.id === a.id));
    if (!store) {
      local.index = next;
      for (const a of fuera) local.audios!.delete(a.id);
      return next;
    }
    const write = await withinTimeout("buzon write", 5000, store.setJSON(INDEX, next, etag ? { onlyIfMatch: etag } : { onlyIfNew: true }));
    if (!write?.modified) continue;
    await Promise.all(fuera.map((a) => withinTimeout("buzon delete", 3000, store.delete(key(a.id)))));
    return next;
  }
  throw new Error("El buzón ha perdido la carrera de escritura 3 veces");
}

/** Guarda un audio nuevo, sin aprobar; null si la cola ya está llena */
export async function dejarAudio(bytes: ArrayBuffer, type: string): Promise<Audio | null> {
  const hay = await leerBuzon();
  if (REVISAR ? hay.filter((a) => !a.aprobado).length >= MAX_PENDIENTES : hay.length >= MAX_SEMANA) return null;
  const audio: Audio = { id: crypto.randomUUID(), at: new Date().toISOString(), type, aprobado: !REVISAR };
  const store = blobs();
  // El audio primero: un índice que apunta a un audio que no está sería peor que un audio huérfano
  if (store) await store.set(key(audio.id), bytes, { metadata: { type } });
  else local.audios!.set(audio.id, { bytes, type });
  await cambiar((audios) => [...audios, audio]);
  return audio;
}

export const aprobar = (id: string) => cambiar((audios) => audios.map((a) => (a.id === id ? { ...a, aprobado: true } : a)));

export const borrar = (id: string) => cambiar((audios) => audios.filter((a) => a.id !== id));

/** Quita del almacén lo caducado; se llama de vez en cuando, para que se borre aunque nadie deje audios nuevos */
export async function limpiar() {
  const { data } = await leerIndice();
  if (data.some((a) => !fresco(a))) await cambiar((audios) => audios);
}

export async function leerAudio(id: string): Promise<{ bytes: ArrayBuffer; type: string } | null> {
  const store = blobs();
  if (!store) return local.audios!.get(id) ?? null;
  const blob = await withinTimeout("buzon audio read", 5000, store.getWithMetadata(key(id), { type: "arrayBuffer" }));
  return blob ? { bytes: blob.data, type: String(blob.metadata.type ?? "audio/webm") } : null;
}
