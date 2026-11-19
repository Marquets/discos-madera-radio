import { esAdmin } from "@/lib/buzon-clave";
import { borrarEntradilla, leerAudioEntradilla } from "@/lib/entradillas";

/** El audio en sí; nunca cambia, así que el navegador lo guarda */
export async function GET(_request: Request, ctx: RouteContext<"/api/entradillas/[id]">) {
  const { id } = await ctx.params;
  const audio = await leerAudioEntradilla(id);
  if (!audio) return new Response("No está", { status: 404 });
  return new Response(audio.bytes, { headers: { "Content-Type": audio.type, "Cache-Control": "private, max-age=86400" } });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/entradillas/[id]">) {
  if (!esAdmin(request)) return new Response("Clave incorrecta", { status: 401 });
  const { id } = await ctx.params;
  const entradillas = await borrarEntradilla(id);
  return Response.json({ entradillas: entradillas.map(({ id, at, track }) => ({ id, at, track })) });
}
