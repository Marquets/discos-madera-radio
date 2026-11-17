import { esAdmin } from "@/lib/buzon-clave";
import { albumIdFrom, getAlbum } from "@/lib/spotify";
import { leerEnvios, MAX_PENDIENTES, nuevoEnvio } from "@/lib/tops";

const COOLDOWN_MS = 60_000;
// shortcut: per function instance and keyed by IP, as for the messages; enough to stop a double send
const lastSend = new Map<string, number>();

/** Todos los envíos, pendientes incluidos; solo con la clave */
export async function GET(request: Request) {
  if (!esAdmin(request)) return new Response("Clave incorrecta", { status: 401 });
  return Response.json({ envios: await leerEnvios() });
}

/** Un top 10 nuevo: entra sin aprobar */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.replace(/\s+/g, " ").trim().slice(0, 30) : "";
  const entradas: { url?: unknown; comment?: unknown }[] = Array.isArray(body.discos) ? body.discos.map((d: unknown) => (d && typeof d === "object" ? d : {})) : [];
  if (!name) return Response.json({ error: "Falta tu nombre" }, { status: 400 });
  if (entradas.length !== 10) return Response.json({ error: "Tienen que ser 10 discos" }, { status: 400 });

  const ids = entradas.map(({ url }) => (typeof url === "string" ? albumIdFrom(url) : undefined));
  const comments = entradas.map(({ comment }) => (typeof comment === "string" ? comment.trim().slice(0, 280) : ""));
  const mal = ids.findIndex((id) => !id);
  if (mal >= 0) return Response.json({ error: `El ${mal + 1} no es un enlace de un álbum de Spotify` }, { status: 400 });
  const repe = ids.findIndex((id, i) => ids.indexOf(id) !== i);
  if (repe >= 0) return Response.json({ error: `El ${repe + 1} está repetido` }, { status: 400 });

  const who = request.headers.get("x-nf-client-connection-ip") ?? request.headers.get("x-forwarded-for") ?? "local";
  const wait = (lastSend.get(who) ?? 0) + COOLDOWN_MS - Date.now();
  if (wait > 0) return Response.json({ error: "Espera un momento antes de mandar otro", wait }, { status: 429 });
  if ((await leerEnvios()).filter((e) => !e.aprobado).length >= MAX_PENDIENTES)
    return Response.json({ error: "Hay muchos esperando revisión, prueba más tarde" }, { status: 503 });

  let discos;
  try {
    discos = await Promise.all(ids.map((id) => getAlbum(id!)));
  } catch (e) {
    console.error("[tops]", e);
    return Response.json({ error: "Spotify no responde, prueba en un rato" }, { status: 502 });
  }
  const falta = discos.findIndex((d) => !d);
  if (falta >= 0) return Response.json({ error: `El ${falta + 1} no existe en Spotify` }, { status: 404 });

  lastSend.set(who, Date.now());
  await nuevoEnvio({ name, discos: discos.map((d, i) => ({ ...d!, ...(comments[i] && { comment: comments[i] }) })) });
  return Response.json({ ok: true });
}
