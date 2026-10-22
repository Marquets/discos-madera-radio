import { syncPlaylist } from "@/lib/sync";

/** Meant for a cron (e.g. Vercel Cron): `Authorization: Bearer $CRON_SECRET`. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json({ tracks: await syncPlaylist() });
}
