import { connection } from "next/server";
import { COOLDOWN_MS, PALETTE, SIZE, paint, readCanvas } from "@/lib/canvas";

// shortcut: per function instance and keyed by IP, so it's easy to dodge on purpose;
// move it to the blob store if people start flooding the canvas
const lastPaint = new Map<string, number>();

export async function GET() {
  await connection();
  return Response.json({ pixels: await readCanvas() });
}

export async function POST(request: Request) {
  const { index, color } = await request.json().catch(() => ({}));
  if (!Number.isInteger(index) || index < 0 || index >= SIZE * SIZE || !Number.isInteger(color) || color < 0 || color >= PALETTE.length) {
    return new Response("Bad pixel", { status: 400 });
  }
  const who = request.headers.get("x-nf-client-connection-ip") ?? request.headers.get("x-forwarded-for") ?? "local";
  const wait = (lastPaint.get(who) ?? 0) + COOLDOWN_MS - Date.now();
  if (wait > 0) return Response.json({ wait }, { status: 429 });
  lastPaint.set(who, Date.now());
  return Response.json({ pixels: await paint(index, color) });
}
