import type { Metadata } from "next";
import { Revisar } from "./Revisar";

export const metadata: Metadata = { title: "Revisar tops · Discos Madera Radio", robots: { index: false, follow: false } };

/** Los top 10 que manda la gente: aprobar para que salgan en The very best of 2026, o borrar */
export default function RevisarPage() {
  return (
    <div className="flex flex-col gap-8 px-4 pt-8 pb-16 sm:px-8">
      <h1 className="pb-4 text-center font-display text-6xl uppercase leading-none sm:text-8xl">Revisar tops</h1>
      <Revisar />
    </div>
  );
}
