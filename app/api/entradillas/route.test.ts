import { describe, expect, it } from "vitest";
import { leerEntradillas } from "@/lib/entradillas";

const { POST } = await import("./route");

const TEMA = "4uLU6hMCjMI75M1A2tKUQC";
let ip = 0;
const post = (track: string, type = "audio/webm", body: BodyInit = new Uint8Array([1, 2, 3])) =>
  POST(new Request(`http://localhost/api/entradillas?track=${track}`, { method: "POST", headers: { "content-type": type, "x-forwarded-for": `ip${ip++}` }, body }));

describe("/api/entradillas", () => {
  it("guarda la entradilla con su canción", async () => {
    expect((await post(TEMA)).status).toBe(201);
    expect((await leerEntradillas()).at(-1)).toMatchObject({ track: TEMA, type: "audio/webm" });
  });

  it("rechaza una canción que no es un id de Spotify, lo que no es audio y el audio vacío", async () => {
    expect((await post("../buzon")).status).toBe(400);
    expect((await post(TEMA, "text/plain")).status).toBe(415);
    expect((await post(TEMA, "audio/webm", new Uint8Array())).status).toBe(400);
  });

  it("hace esperar a quien acaba de mandar una", async () => {
    const req = () => POST(new Request(`http://localhost/api/entradillas?track=${TEMA}`, { method: "POST", headers: { "content-type": "audio/webm", "x-forwarded-for": "repe" }, body: new Uint8Array([1]) }));
    expect((await req()).status).toBe(201);
    expect((await req()).status).toBe(429);
  });
});
