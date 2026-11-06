import { connection } from "next/server";
import { searchTracks } from "@/lib/spotify";

export async function GET(request: Request) {
  await connection();
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100);
  return Response.json({ tracks: q ? await searchTracks(q) : [] });
}
