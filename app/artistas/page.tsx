import Image from "next/image";
import { latestReleases } from "@/lib/artists";

export default async function ArtistsPage() {
  const releases = await latestReleases();

  return (
    <div className="px-4 pb-16 sm:px-8">
      <h1 className="pt-8 pb-10 text-center font-display text-7xl uppercase leading-none sm:text-9xl">Artistas</h1>
      {releases.length ? (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {releases.map((r) => (
            <li key={r.url}>
              <a href={r.url} target="_blank" rel="noreferrer" className="group flex flex-col items-center gap-2 text-center">
                <div className="relative aspect-square w-full overflow-hidden bg-black/10">
                  {r.cover && <Image src={r.cover} alt="" fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw" className="object-cover transition-transform group-hover:scale-105 motion-reduce:transition-none" />}
                </div>
                <h2 className="font-display text-3xl uppercase leading-none decoration-2 group-hover:underline">{r.artist}</h2>
                <p className="text-sm">
                  {r.title} · {r.date.split("-").reverse().join(".")}
                </p>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-center uppercase">Aún no hay lanzamientos.</p>
      )}
    </div>
  );
}
