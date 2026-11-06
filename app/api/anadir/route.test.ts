import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.SPOTIFY_PLAYLIST_ID = "lista";
});
vi.mock("next/headers", () => ({ cookies: async () => ({ has: () => false, get: () => undefined }) }));

const { POST } = await import("./route");

const ID = "4uLU6hMCjMI75M1A2tKUQC";
const added: unknown[] = [];

const post = (body: unknown, ip = "1.1.1.1") => POST(new Request("http://localhost/api/anadir", { method: "POST", headers: { "x-forwarded-for": ip }, body: JSON.stringify(body) }));

beforeEach(() => {
  // data/<key>.json is resolved from the working directory, so the real files stay untouched
  const dir = mkdtempSync(path.join(tmpdir(), "anadir-"));
  vi.spyOn(process, "cwd").mockReturnValue(dir);
  added.length = 0;
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    if (url.includes("accounts.spotify.com")) return Response.json({ access_token: "t", expires_in: 3600 });
    if (url.endsWith(`/tracks/${ID}`))
      return Response.json({ id: ID, name: "Yesterday", uri: `spotify:track:${ID}`, duration_ms: 125000, artists: [{ name: "The Beatles" }], album: { images: [{ url: "big" }, { url: "mid" }, { url: "small" }] } });
    if (url.endsWith("/playlists/lista/items") && init?.method === "POST") return added.push(JSON.parse(String(init.body))), Response.json({});
    return new Response(null, { status: 404 });
  });
});

describe("POST /api/anadir", () => {
  it("adds the song to the playlist and puts it on the radio with who picked it", async () => {
    const res = await post({ id: ID, quien: "Babi Bensusan" });
    expect(res.status).toBe(200);
    expect(added).toEqual([{ uris: [`spotify:track:${ID}`] }]);
    const db = JSON.parse(readFileSync(path.join(process.cwd(), "data", "db.json"), "utf8"));
    expect(db.tracks).toMatchObject([{ id: ID, title: "Yesterday", artist: "The Beatles", cover: "mid", cortesia: "Babi Bensusan" }]);
    expect(db.cortesias).toEqual({ [ID]: "Babi Bensusan" });

    expect((await post({ id: ID, quien: "Babi Bensusan" }, "2.2.2.2")).status).toBe(409);
  });

  it("tidies the name", async () => {
    await post({ id: ID, quien: "  Una   amiga " + "x".repeat(40) }, "3.3.3.3");
    const db = () => JSON.parse(readFileSync(path.join(process.cwd(), "data", "db.json"), "utf8"));
    expect(db().tracks[0].cortesia).toBe(("Una amiga " + "x".repeat(40)).slice(0, 30));
  });

  it("leaves an empty name empty, so it doesn't fall back to the radio's own account", async () => {
    await post({ id: ID }, "4.4.4.4");
    expect(JSON.parse(readFileSync(path.join(process.cwd(), "data", "db.json"), "utf8")).tracks[0].cortesia).toBe("");
  });

  it("refuses an id that isn't one", async () => {
    expect((await post({ id: "../../x", quien: "Babi" }, "5.5.5.5")).status).toBe(400);
    expect(added).toEqual([]);
  });
});
