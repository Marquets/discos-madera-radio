import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { leerEnvios } from "@/lib/tops";
import { Collage } from "./Collage";
import { SubeTuTop } from "./SubeTuTop";
import { TopLista } from "./TopLista";

export const metadata: Metadata = { title: "The very best of 2026 · Discos Madera Radio" };

/** The tops people sent from the form, once approved in /lo-mejor-2026/revisar */
async function aprobados() {
  await connection();
  return (await leerEnvios()).filter((e) => e.aprobado);
}

async function Portadas() {
  const covers = (await aprobados()).flatMap((t) => t.discos.map((d) => d.cover)).filter(Boolean);
  return covers.length > 0 && <Collage covers={covers} />;
}

async function Aprobados() {
  return (await aprobados()).map((e) => <TopLista key={e.id} top={e} />);
}

export default function LoMejor2026Page() {
  return (
    <>
      <div className="boom relative isolate flex min-h-[calc(100svh-var(--chrome))] flex-col items-start justify-end gap-4 overflow-hidden bg-black px-4 pt-10 pb-10 text-accent sm:px-8">
        <Suspense>
          <Portadas />
        </Suspense>
        <h1 className="flex flex-col font-display uppercase leading-[0.85] [text-shadow:0.04em_0.04em_0_#000]">
          <span className="text-[clamp(1.5rem,5vw,3.5rem)]">The very best of</span>
          <span className="text-[clamp(6rem,26vw,20rem)]">2026</span>
        </h1>
        <p className="bg-black px-2 py-1 font-mono text-sm uppercase tracking-widest">Los diez discos del año de cada uno de nosotros</p>
      </div>

      <div className="flex flex-col gap-20 px-4 pt-12 pb-16 sm:px-8">
        <Suspense>
          <Aprobados />
        </Suspense>
        <SubeTuTop />
      </div>
    </>
  );
}
