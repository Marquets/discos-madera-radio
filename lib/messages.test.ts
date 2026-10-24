import { describe, expect, it } from "vitest";
import { POST } from "../app/api/mensajes/route";
import { KEEP, MAX_LENGTH, addMessage, clean, readMessages } from "./messages";

const post = (body: unknown, ip: string) =>
  POST(new Request("http://localhost/api/mensajes", { method: "POST", headers: { "x-forwarded-for": ip }, body: JSON.stringify(body) }));

describe("mensajes", () => {
  it("keeps messages on one line and within the limit", () => {
    expect(clean("  hola\n\n  radio  ")).toBe("hola radio");
    expect(clean("a".repeat(200))).toHaveLength(MAX_LENGTH);
    expect(clean(42)).toBe("");
  });

  it("keeps only the newest ones", async () => {
    for (let i = 0; i < KEEP + 5; i++) await addMessage(`mensaje ${i}`);
    const messages = await readMessages();
    expect(messages).toHaveLength(KEEP);
    expect(messages.at(-1)!.text).toBe(`mensaje ${KEEP + 4}`);
  });

  it("rejects empty messages and makes the same visitor wait", async () => {
    expect((await post({ text: "   " }, "a")).status).toBe(400);
    expect((await post({ text: "hola" }, "b")).status).toBe(200);
    const again = await post({ text: "otra vez" }, "b");
    expect(again.status).toBe(429);
    expect((await again.json()).wait).toBeGreaterThan(0);
  });
});
