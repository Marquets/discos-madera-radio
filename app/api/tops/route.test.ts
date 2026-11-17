import { beforeEach, describe, expect, it, vi } from "vitest";
import { leerEnvios } from "@/lib/tops";

const { POST } = await import("./route");

const ids = Array.from({ length: 10 }, (_, i) => `album${String(i).padStart(17, "0")}`);
const links = ids.map((id, i) => ({ url: `https://open.spotify.com/album/${id}?si=x`, comment: i === 0 ? " Qué disco " : "" }));

let ip = 0;
const post = (body: unknown) => POST(new Request("http://localhost/api/tops", { method: "POST", headers: { "x-forwarded-for": `ip${ip++}` }, body: JSON.stringify(body) }));

beforeEach(() => {
  vi.stubGlobal("fetch", async (url: string) => {
    if (url.includes("accounts.spotify.com")) return Response.json({ access_token: "t", expires_in: 3600 });
    const id = url.split("/albums/")[1];
    if (ids.includes(id)) return Response.json({ name: `Disco ${id}`, artists: [{ name: "Alguien" }], images: [{ url: "portada" }] });
    return new Response(null, { status: 404 });
  });
});

describe("POST /api/tops", () => {
  it("guarda un top 10 sin aprobar, con título, artista y portada de Spotify", async () => {
    expect((await post({ name: " Ana ", discos: links })).status).toBe(200);
    const envio = (await leerEnvios()).at(-1)!;
    expect(envio).toMatchObject({ name: "Ana", aprobado: false });
    expect(envio.discos[0]).toEqual({ title: `Disco ${ids[0]}`, artist: "Alguien", cover: "portada", url: `https://open.spotify.com/album/${ids[0]}`, comment: "Qué disco" });
    expect(envio.discos[1]).not.toHaveProperty("comment");
  });

  it("pide nombre, 10 enlaces de álbum y sin repetir", async () => {
    expect((await (await post({ discos: links })).json()).error).toBe("Falta tu nombre");
    expect((await (await post({ name: "Ana", discos: links.slice(1) })).json()).error).toBe("Tienen que ser 10 discos");
    expect((await (await post({ name: "Ana", discos: links.with(3, { url: "https://open.spotify.com/track/x", comment: "" }) })).json()).error).toBe("El 4 no es un enlace de un álbum de Spotify");
    expect((await (await post({ name: "Ana", discos: links.with(5, links[0]) })).json()).error).toBe("El 6 está repetido");
  });

  it("avisa del disco que Spotify no conoce", async () => {
    const res = await post({ name: "Ana", discos: links.with(2, { url: "https://open.spotify.com/album/noexiste00000000000000", comment: "" }) });
    expect(res.status).toBe(404);
  });
});
