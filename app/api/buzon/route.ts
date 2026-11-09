import { after, connection } from "next/server";
import { esAdmin } from "@/lib/buzon-clave";
import { COOLDOWN_MS, dejarAudio, leerBuzon, limpiar, MAX_BYTES } from "@/lib/buzon";

// Atajo, como en /api/mensajes: por instancia y por IP
const ultimo = new Map<string, number>();

/** Los aprobados, para escucharlos y para la radio; con la clave, también los pendientes */
export async function GET(request: Request) {
  await connection();
  const audios = await leerBuzon();
  // Así lo caducado se borra aunque nadie deje audios nuevos: la radio pide la lista a menudo
  after(() => limpiar().catch((e) => console.error("[buzon] limpiar:", e)));
  if (esAdmin(request)) return Response.json({ audios });
  return Response.json({ audios: audios.filter((a) => a.aprobado).map(({ id, at }) => ({ id, at })) });
}

/** El cuerpo es el audio tal cual, con su Content-Type */
export async function POST(request: Request) {
  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!type.startsWith("audio/")) return new Response("Eso no es un audio", { status: 415 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) return new Response("Demasiado largo", { status: 413 });
  const who = request.headers.get("x-nf-client-connection-ip") ?? request.headers.get("x-forwarded-for") ?? "local";
  const wait = (ultimo.get(who) ?? 0) + COOLDOWN_MS - Date.now();
  if (wait > 0) return Response.json({ wait }, { status: 429 });
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength) return new Response("Audio vacío", { status: 400 });
  if (bytes.byteLength > MAX_BYTES) return new Response("Demasiado largo", { status: 413 });
  const audio = await dejarAudio(bytes, type);
  if (!audio) return new Response("El buzón está lleno", { status: 503 });
  ultimo.set(who, Date.now());
  return Response.json({ ok: true }, { status: 201 });
}
