import { describe, expect, it, vi } from "vitest";
import { leerEnvios, nuevoEnvio } from "@/lib/tops";

vi.stubEnv("BUZON_CLAVE", "x");
const { PUT } = await import("./route");

const disco = (n: number) => ({ title: `Disco ${n}`, artist: "Alguien", cover: "portada", url: `https://open.spotify.com/album/${n}`, ...(n === 0 && { comment: "Viejo" }) });
const put = (id: string, body: unknown, clave = "x") =>
  PUT(new Request(`http://localhost/api/tops/${id}`, { method: "PUT", headers: { "x-clave": clave }, body: JSON.stringify(body) }), { params: Promise.resolve({ id }) });

describe("PUT /api/tops/[id]", () => {
  it("cambia el nombre y los comentarios, y quita los que se dejan vacíos", async () => {
    await nuevoEnvio({ name: "Ana", discos: Array.from({ length: 10 }, (_, i) => disco(i)) });
    const { id } = (await leerEnvios()).at(-1)!;
    const res = await put(id, { name: "  Ana  María ", comments: ["", " Qué disco "] });
    expect(res.status).toBe(200);
    const envio = (await res.json()).envios.find((e: { id: string }) => e.id === id);
    expect(envio.name).toBe("Ana María");
    expect(envio.discos[0]).not.toHaveProperty("comment");
    expect(envio.discos[1].comment).toBe("Qué disco");
    expect(envio.discos[1].title).toBe("Disco 1");
  });

  it("pide la clave y un nombre", async () => {
    expect((await put("x", { name: "Ana" }, "")).status).toBe(401);
    expect((await put("x", { name: "  " })).status).toBe(400);
  });
});
