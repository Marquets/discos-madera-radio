import Image from "next/image";
import type { Track } from "@/lib/db";

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Madrid" }).replaceAll("/", ".");

export function TrackGrid({ tracks }: { tracks: Track[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
      {tracks.map((t) => (
        <li key={t.id}>
          <a href={`https://open.spotify.com/track/${t.id}`} target="_blank" rel="noreferrer" className="group flex flex-col items-center gap-2 text-center">
            <div className="relative aspect-square w-full overflow-hidden bg-black/10">
              {t.cover && (
                <Image src={t.cover} alt="" fill sizes="(min-width: 1024px) 16vw, (min-width: 640px) 33vw, 50vw" className="object-cover transition-transform group-hover:scale-105 motion-reduce:transition-none" />
              )}
            </div>
            <h3 className="font-display text-xl uppercase leading-tight decoration-2 group-hover:underline">
              {t.title}
              <br />
              {shortDate(t.firstSeenAt)}
            </h3>
            <ul className="flex flex-wrap justify-center gap-1">
              {t.artist.split(/,\s*/).map((artist) => (
                <li key={artist} className="rounded-full bg-black px-2.5 text-accent py-1 text-[10px] uppercase leading-none">
                  {artist}
                </li>
              ))}
            </ul>
          </a>
        </li>
      ))}
    </ul>
  );
}
