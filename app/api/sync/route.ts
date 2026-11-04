import { enAntena } from "@/lib/cadenas-server";
import { syncPlaylist } from "@/lib/sync";

/** Meant for a cron (e.g. Vercel Cron): `Authorization: Bearer $CRON_SECRET`. Syncs every channel on air. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const cadenas = enAntena();
  const added = await Promise.all(cadenas.map(syncPlaylist));
  return Response.json(Object.fromEntries(cadenas.map((c, i) => [c.id, added[i]])));
}
