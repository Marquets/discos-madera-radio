import { createHash, timingSafeEqual } from "node:crypto";

const hash = (s: string) => createHash("sha256").update(s).digest();

/**
 * La cola del buzón solo la ve quien sabe BUZON_CLAVE, que llega en la cabecera x-clave.
 * Sin la variable no entra nadie, salvo en `npm run dev`, donde vale cualquier clave no vacía.
 */
export function esAdmin(request: Request) {
  const clave = process.env.BUZON_CLAVE;
  const dada = request.headers.get("x-clave") ?? "";
  if (!clave) return process.env.NODE_ENV === "development" && dada !== "";
  return timingSafeEqual(hash(dada), hash(clave));
}
