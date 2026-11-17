import type { Metadata } from "next";
import Image from "next/image";
import type { CSSProperties } from "react";
import { connection } from "next/server";
import { Suspense } from "react";
import { TOPS } from "@/lib/lo-mejor-2026";
import { leerEnvios } from "@/lib/tops";
import { Boom } from "../Boom";
import { SubeTuTop } from "./SubeTuTop";
import { TopLista } from "./TopLista";

export const metadata: Metadata = { title: "The very best of 2026 · Discos Madera Radio" };

// Where the covers land as they fly out of the blast: offset from the centre (vw, svh) and tilt
const VUELO = [
  [-36, -24, -14],
  [34, -26, 12],
  [-40, 6, 8],
  [39, 4, -10],
  [-24, 29, -6],
  [25, 30, 16],
];
const PORTADAS = TOPS.flatMap((t) => t.discos).slice(0, VUELO.length);

/** The tops people sent from the form, once approved in /lo-mejor-2026/revisar */
async function Aprobados() {
  await connection();
  return (await leerEnvios()).filter((e) => e.aprobado).map((e) => <TopLista key={e.id} top={e} />);
}

export default function LoMejor2026Page() {
  return (
    <>
      {/* The black band carries on behind the burst, as it does behind the tape deck on the front page */}
      <div className="boom relative isolate flex min-h-[calc(100svh-var(--chrome))] flex-col items-center justify-center gap-8 overflow-hidden bg-black px-4 pb-16 sm:px-8">
        <div aria-hidden className="boom-rayos absolute -inset-1/2 -z-10" />
        <div aria-hidden className="boom-puntos absolute inset-0 -z-10" />
        {PORTADAS.map((d, i) => (
          <Image
            key={d.url}
            src={d.cover}
            alt=""
            width={160}
            height={160}
            className="boom-disco pointer-events-none absolute top-1/2 left-1/2 -z-10 -mt-[clamp(2rem,5.5vw,4.5rem)] -ml-[clamp(2rem,5.5vw,4.5rem)] size-[clamp(4rem,11vw,9rem)] border-[3px] border-black shadow-[5px_5px_0_#fff]"
            style={{ "--x": `${VUELO[i][0]}vw`, "--y": `${VUELO[i][1]}svh`, "--r": `${VUELO[i][2]}deg`, "--d": `${0.25 + i * 0.07}s` } as CSSProperties}
          />
        ))}
        <div className="boom-temblor relative grid w-full max-w-3xl place-items-center">
          <Boom shadow className="boom-estallido col-start-1 row-start-1 w-full" />
          <h1 className="boom-texto col-start-1 row-start-1 flex -rotate-6 flex-col items-center font-display uppercase leading-[0.85]">
            <span className="text-[clamp(1.1rem,4.6vw,2.7rem)]">The very best of</span>
            <span className="boom-cifra text-[clamp(3rem,14vw,7.5rem)]">2026!!</span>
          </h1>
        </div>
        <p className="boom-lema max-w-md text-center font-mono text-sm uppercase tracking-widest text-accent">Los diez discos del año de cada uno de nosotros</p>
      </div>

      <div className="flex flex-col gap-20 px-4 pt-12 pb-16 sm:px-8">
        {TOPS.map((top) => (
          <TopLista key={top.name} top={top} />
        ))}
        <Suspense>
          <Aprobados />
        </Suspense>
        <SubeTuTop />
      </div>
    </>
  );
}
