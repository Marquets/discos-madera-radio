import Image from "next/image";
import type { Top } from "@/lib/lo-mejor-2026";

/** One person's top: the name and the ten covers in order, each with its own speech bubble when there's a comment */
export function TopLista({ top }: { top: Top }) {
  const id = `top-${top.name.replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-8">
      <h2 id={id} className="font-display text-6xl uppercase leading-none sm:text-8xl">
        {top.name}
      </h2>
      <ol className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
        {top.discos.map((d, i) => (
          <li key={d.url} className="flex flex-col gap-4">
            <a href={d.url} target="_blank" rel="noreferrer" className="group flex flex-col gap-2">
              <div className="relative aspect-square w-full overflow-hidden bg-black/10">
                {d.cover && <Image src={d.cover} alt="" fill sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw" className="object-cover transition-transform group-hover:scale-105 motion-reduce:transition-none" />}
                <span aria-hidden className="absolute top-2 left-2 grid size-11 place-items-center rounded-full bg-black font-display text-2xl text-accent">
                  {i + 1}
                </span>
              </div>
              <h3 className="font-display text-xl uppercase leading-tight decoration-2 group-hover:underline">{d.title}</h3>
              <p className="-mt-1 text-xs uppercase">{d.artist}</p>
            </a>
            {d.comment && (
              // A speech bubble whose tail points up at the album
              <blockquote className="relative border-[3px] border-black bg-white px-3 py-2 text-sm shadow-[4px_4px_0_#000]">
                <span aria-hidden className="absolute -top-[9px] left-5 size-4 rotate-45 border-t-[3px] border-l-[3px] border-black bg-white" />
                <p className="relative whitespace-pre-line">{d.comment}</p>
              </blockquote>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
