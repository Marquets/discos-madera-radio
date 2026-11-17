import { randomUUID } from "node:crypto";
import { blobs, withinTimeout } from "./db";
import type { Top } from "./lo-mejor-2026";

/**
 * Los top 10 que manda la gente desde The very best of 2026. Llegan sin aprobar y solo salen en la
 * página cuando alguien con BUZON_CLAVE los aprueba en /lo-mejor-2026/revisar. Cada uno es un blob
 * suelto, tops2026/<id>, por lo mismo que el buzón: sin índice común, dos envíos a la vez no se pisan.
 */
export type Envio = Top & { id: string; at: string; aprobado: boolean };

export const MAX_PENDIENTES = 40;

const PREFIX = "tops2026/";

// En local no hay blob store, así que basta la memoria (se pierde al reiniciar)
const local: Map<string, Envio> = ((globalThis as { tops?: Map<string, Envio> }).tops ??= new Map());

export async function leerEnvios(): Promise<Envio[]> {
  const store = blobs();
  const envios = store
    ? await Promise.all(
        ((await withinTimeout("tops list", 5000, store.list({ prefix: PREFIX })))?.blobs ?? []).map(
          ({ key }) => withinTimeout("tops get", 3000, store.get(key, { type: "json" })) as Promise<Envio | null>,
        ),
      )
    : [...local.values()];
  return envios.filter((e) => e !== null).toSorted((a, b) => a.at.localeCompare(b.at));
}

async function guardar(envio: Envio) {
  const store = blobs();
  if (store) await store.setJSON(PREFIX + envio.id, envio);
  else local.set(envio.id, envio);
}

export async function nuevoEnvio(top: Top) {
  await guardar({ ...top, id: randomUUID(), at: new Date().toISOString(), aprobado: false });
}

// Lo que devuelven ya lleva el cambio: con la lectura eventual del store, volver a listar justo después puede no verlo
export async function aprobar(id: string) {
  const envios = await leerEnvios();
  const envio = envios.find((e) => e.id === id);
  if (envio) await guardar({ ...envio, aprobado: true });
  return envios.map((e) => (e.id === id ? { ...e, aprobado: true } : e));
}

export async function borrar(id: string) {
  const store = blobs();
  if (store) await store.delete(PREFIX + id);
  else local.delete(id);
  return (await leerEnvios()).filter((e) => e.id !== id);
}
