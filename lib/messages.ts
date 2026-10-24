import { blobs, withinTimeout } from "./db";

export type Message = { id: string; text: string; at: string };

export const MAX_LENGTH = 80;
// Only the newest ones float: more than this and the hero turns into a wall of text
export const KEEP = 30;
export const COOLDOWN_MS = 60_000;

const KEY = "mensajes";

// Locally there is no blob store and a single process, so memory will do (reset on restart)
const local: { messages?: Message[] } = ((globalThis as { mensajes?: { messages?: Message[] } }).mensajes ??= {});

/** Single line, no runs of spaces, cut to MAX_LENGTH; empty when nothing is left to show */
export function clean(text: unknown) {
  return typeof text === "string" ? text.replace(/\s+/g, " ").trim().slice(0, MAX_LENGTH) : "";
}

export async function readMessages(): Promise<Message[]> {
  const store = blobs();
  if (!store) return local.messages ?? [];
  return (await withinTimeout("mensajes read", 3000, store.get(KEY, { type: "json" }))) ?? [];
}

export async function addMessage(text: string) {
  const message: Message = { id: crypto.randomUUID(), text, at: new Date().toISOString() };
  const withMessage = (messages: Message[]) => [...messages, message].slice(-KEEP);
  const store = blobs();
  if (!store) return (local.messages = withMessage(local.messages ?? []));
  // Several people write at once; a conditional write turns a lost race into a retry, as in db.ts
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await withinTimeout("mensajes read for update", 3000, store.getWithMetadata(KEY, { type: "json" }));
    const messages = withMessage((current?.data as Message[] | undefined) ?? []);
    const write = await withinTimeout("mensajes write", 5000, store.setJSON(KEY, messages, current?.etag ? { onlyIfMatch: current.etag } : { onlyIfNew: true }));
    if (write?.modified) return messages;
  }
  throw new Error("Mensajes kept losing the write race after 3 attempts");
}
