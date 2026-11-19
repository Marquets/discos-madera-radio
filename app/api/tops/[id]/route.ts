import { esAdmin } from "@/lib/buzon-clave";
import { borrar, editar, limpiarComentario, limpiarNombre } from "@/lib/tops";

/** Cómo queda, entero: { name, comments: string[], aprobado }, un comentario por disco. Aprobar también pasa por aquí */
export async function PUT(request: Request, ctx: RouteContext<"/api/tops/[id]">) {
  if (!esAdmin(request)) return new Response("Clave incorrecta", { status: 401 });
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const name = limpiarNombre(body.name);
  if (!name) return Response.json({ error: "Falta el nombre" }, { status: 400 });
  const comments = Array.isArray(body.comments) ? body.comments.slice(0, 10).map(limpiarComentario) : [];
  return Response.json({ envios: await editar(id, name, comments, body.aprobado === true) });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/tops/[id]">) {
  if (!esAdmin(request)) return new Response("Clave incorrecta", { status: 401 });
  const { id } = await ctx.params;
  return Response.json({ envios: await borrar(id) });
}
