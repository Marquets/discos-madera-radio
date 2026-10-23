import { describe, expect, it } from "vitest";
import { POST } from "../app/api/lienzo/route";
import { COLS, ROWS, paint, readCanvas } from "./canvas";

const post = (body: unknown, ip: string) =>
  POST(new Request("http://localhost/api/lienzo", { method: "POST", headers: { "x-forwarded-for": ip }, body: JSON.stringify(body) }));

describe("lienzo", () => {
  it("paints one pixel and leaves the rest alone", async () => {
    const pixels = await paint(COLS + 2, 9);
    expect(pixels).toHaveLength(COLS * ROWS);
    expect(pixels[COLS + 2]).toBe("9");
    expect(pixels.replaceAll("0", "")).toBe("9");
    expect(await readCanvas()).toBe(pixels);
  });

  it("rejects pixels and colours outside the canvas", async () => {
    expect((await post({ index: COLS * ROWS, color: 1 }, "a")).status).toBe(400);
    expect((await post({ index: 0, color: 99 }, "b")).status).toBe(400);
    expect((await post({ index: "0", color: 1 }, "c")).status).toBe(400);
  });

  it("makes the same visitor wait between pixels", async () => {
    expect((await post({ index: 5, color: 1 }, "d")).status).toBe(200);
    const again = await post({ index: 6, color: 1 }, "d");
    expect(again.status).toBe(429);
    expect((await again.json()).wait).toBeGreaterThan(0);
    expect((await post({ index: 6, color: 1 }, "e")).status).toBe(200);
  });
});
