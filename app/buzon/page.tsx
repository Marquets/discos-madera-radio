import type { Metadata } from "next";
import { Cola } from "./Cola";

export const metadata: Metadata = { title: "Buzón · Discos Madera Radio", robots: { index: false, follow: false } };

/** La cola del buzón de voz: escuchar, aprobar y borrar los audios que deja la gente */
export default function BuzonPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 pt-8 pb-16 sm:px-8">
      <h1 className="pb-4 text-center font-display text-6xl uppercase leading-none sm:text-8xl">Buzón</h1>
      <Cola />
    </div>
  );
}
