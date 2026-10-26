import Link from "next/link";
import { isoWeek, month } from "@/lib/dates";
import type { Track } from "@/lib/db";
import { getTracks } from "@/lib/sync";
import { TrackGrid } from "../TrackGrid";

// The stored list resolves in milliseconds; the playlist refresh happens after the response
export const instant = false;

export default async function ArchivePage({ searchParams }: PageProps<"/archivo">) {
  const byMonth = (await searchParams).vista === "mes";
  const period = byMonth ? month : isoWeek;

  const groups = new Map<string, { label: string; tracks: Track[] }>();
  for (const t of (await getTracks()).toSorted((a, b) => b.firstSeenAt.localeCompare(a.firstSeenAt))) {
    const { key, label } = period(t.firstSeenAt);
    if (!groups.has(key)) groups.set(key, { label, tracks: [] });
    groups.get(key)!.tracks.push(t);
  }

  return (
    <div className="px-4 pb-16 sm:px-8">
      <h1 className="pt-8 text-center font-display text-7xl uppercase leading-none sm:text-9xl">Archivo</h1>
      <nav className="flex justify-center gap-6 pb-8 pt-4 font-display text-2xl uppercase">
        <Link href="/archivo" aria-current={!byMonth ? "page" : undefined} className="decoration-4 underline-offset-4 hover:underline aria-[current=page]:underline">
          Semanal
        </Link>
        <Link href="/archivo?vista=mes" aria-current={byMonth ? "page" : undefined} className="decoration-4 underline-offset-4 hover:underline aria-[current=page]:underline">
          Mensual
        </Link>
      </nav>
      {groups.size === 0 && <p className="text-center uppercase">Aún no hay canciones.</p>}
      <div className="flex flex-col gap-12">
        {[...groups].map(([key, g]) => (
          <section key={key}>
            <h2 className="mb-4 border-b-2 border-black pb-1 font-display text-3xl uppercase">
              {g.label} <span className="font-mono text-sm">· {g.tracks.length} canciones</span>
            </h2>
            <TrackGrid tracks={g.tracks} />
          </section>
        ))}
      </div>
    </div>
  );
}
