import { esAdmin } from "@/lib/buzon-clave";
import { aprobar, borrar } from "@/lib/tops";

export async function PATCH(request: Request, ctx: RouteContext<"/api/tops/[id]">) {
  if (!esAdmin(request)) return new Response("Clave incorrecta", { status: 401 });
  const { id } = await ctx.params;
  return Response.json({ envios: await aprobar(id) });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/tops/[id]">) {
  if (!esAdmin(request)) return new Response("Clave incorrecta", { status: 401 });
  const { id } = await ctx.params;
  return Response.json({ envios: await borrar(id) });
}
