import { connection } from "next/server";
import { COOLDOWN_MS, addMessage, clean, readMessages } from "@/lib/messages";

// shortcut: per function instance and keyed by IP, as in the canvas; move it to the blob
// store if people start flooding the hero
const lastMessage = new Map<string, number>();

export async function GET() {
  await connection();
  return Response.json({ messages: await readMessages() });
}

export async function POST(request: Request) {
  const { text } = await request.json().catch(() => ({}));
  const message = clean(text);
  if (!message) return new Response("Empty message", { status: 400 });
  const who = request.headers.get("x-nf-client-connection-ip") ?? request.headers.get("x-forwarded-for") ?? "local";
  const wait = (lastMessage.get(who) ?? 0) + COOLDOWN_MS - Date.now();
  if (wait > 0) return Response.json({ wait }, { status: 429 });
  lastMessage.set(who, Date.now());
  return Response.json({ messages: await addMessage(message) });
}
