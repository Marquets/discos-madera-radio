import { isoWeek } from "./dates";
import { blobs, withinTimeout } from "./db";

export const SIZE = 64;
export const COOLDOWN_MS = 30_000;
// The poster's orange and browns first, then a few more to draw with. Index 0 is the
// empty canvas. One hex digit per pixel caps it at 16 colours.
export const PALETTE = [
  { hex: "#000000", name: "negro" },
  { hex: "#f89028", name: "naranja" },
  { hex: "#5a3410", name: "marrón oscuro" },
  { hex: "#8a5520", name: "marrón" },
  { hex: "#ffffff", name: "blanco" },
  { hex: "#e8402a", name: "rojo" },
  { hex: "#f2d64b", name: "amarillo" },
  { hex: "#2f7d4f", name: "verde" },
  { hex: "#2a5bd7", name: "azul" },
  { hex: "#b05fc8", name: "morado" },
];

// Row by row, one hex digit per pixel: 4096 characters, cheap enough to send on every poll
const EMPTY = "0".repeat(SIZE * SIZE);

// A new canvas every ISO week; the old ones stay in the store under their own key
const key = () => `lienzo/${isoWeek(new Date().toISOString()).key}`;

// Locally there is no blob store and a single process, so memory will do (reset on restart)
const local: Map<string, string> = ((globalThis as { lienzo?: Map<string, string> }).lienzo ??= new Map());

export async function readCanvas() {
  const store = blobs();
  if (!store) return local.get(key()) ?? EMPTY;
  return (await withinTimeout("lienzo read", 3000, store.get(key(), { type: "text" }))) ?? EMPTY;
}

export async function paint(index: number, color: number) {
  const k = key();
  const withPixel = (pixels: string) => pixels.slice(0, index) + color.toString(16) + pixels.slice(index + 1);
  const store = blobs();
  if (!store) {
    local.set(k, withPixel(local.get(k) ?? EMPTY));
    return local.get(k)!;
  }
  // Several people paint at once; a conditional write turns a lost race into a retry, as in db.ts
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await withinTimeout("lienzo read for update", 3000, store.getWithMetadata(k, { type: "text" }));
    const pixels = withPixel(current?.data ?? EMPTY);
    const write = await withinTimeout("lienzo write", 5000, store.set(k, pixels, current?.etag ? { onlyIfMatch: current.etag } : { onlyIfNew: true }));
    if (write?.modified) return pixels;
  }
  throw new Error("Lienzo kept losing the write race after 3 attempts");
}
