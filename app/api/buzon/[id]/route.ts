import { esAdmin } from "@/lib/buzon-clave";
import { aprobar, borrar, leerAudio, leerBuzon } from "@/lib/buzon";

/** El audio en sí; sin la clave, solo si está aprobado y no ha caducado */
export async function GET(request: Request, ctx: RouteContext<"/api/buzon/[id]">) {
  const { id } = await ctx.params;
  const admin = esAdmin(request);
  const entrada = (await leerBuzon()).find((a) => a.id === id);
  if (!entrada || (!entrada.aprobado && !admin)) return new Response("No está", { status: 404 });
  const audio = await leerAudio(id);
  if (!audio) return new Response("No está", { status: 404 });
  return new Response(audio.bytes, {
    headers: { "Content-Type": audio.type, "Cache-Control": admin ? "no-store" : "private, max-age=3600" },
  });
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/buzon/[id]">) {
  if (!esAdmin(request)) return new Response("Clave incorrecta", { status: 401 });
  const { id } = await ctx.params;
  return Response.json({ audios: await aprobar(id) });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/buzon/[id]">) {
  if (!esAdmin(request)) return new Response("Clave incorrecta", { status: 401 });
  const { id } = await ctx.params;
  return Response.json({ audios: await borrar(id) });
}
