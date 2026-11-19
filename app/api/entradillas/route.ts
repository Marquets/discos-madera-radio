import { connection } from "next/server";
import { MAX_BYTES } from "@/lib/buzon";
import { dejarEntradilla, esTema, leerEntradillas } from "@/lib/entradillas";

// Más corto que el del buzón: grabar entradillas de varias canciones seguidas es lo normal
const COOLDOWN_MS = 30_000;
const ultimo = new Map<string, number>();

/** Todas, para la radio y para /buzon */
export async function GET() {
  await connection();
  return Response.json({ entradillas: (await leerEntradillas()).map(({ id, at, track }) => ({ id, at, track })) });
}

/** El cuerpo es el audio tal cual, con su Content-Type; la canción va en ?track= */
export async function POST(request: Request) {
  const track = new URL(request.url).searchParams.get("track") ?? "";
  if (!esTema(track)) return new Response("Esa canción no existe", { status: 400 });
  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!type.startsWith("audio/")) return new Response("Eso no es un audio", { status: 415 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) return new Response("Demasiado largo", { status: 413 });
  const who = request.headers.get("x-nf-client-connection-ip") ?? request.headers.get("x-forwarded-for") ?? "local";
  const wait = (ultimo.get(who) ?? 0) + COOLDOWN_MS - Date.now();
  if (wait > 0) return Response.json({ wait }, { status: 429 });
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength) return new Response("Audio vacío", { status: 400 });
  if (bytes.byteLength > MAX_BYTES) return new Response("Demasiado largo", { status: 413 });
  if (!(await dejarEntradilla(bytes, type, track))) return new Response("No caben más entradillas", { status: 503 });
  ultimo.set(who, Date.now());
  return Response.json({ ok: true }, { status: 201 });
}
