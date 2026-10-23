import { connection } from "next/server";
import { COOLDOWN_MS, PALETTE, SIZE, readCanvas } from "@/lib/canvas";
import { Lienzo } from "./Lienzo";

// The stored canvas resolves in milliseconds, same as the track list
export const instant = false;

export default async function CanvasPage() {
  await connection();
  const pixels = await readCanvas();

  return (
    <div className="px-4 sm:px-8">
      <h1 className="pt-8 text-center font-display text-6xl uppercase leading-none sm:text-8xl">Deja tu píxel</h1>
      <p className="pb-8 pt-4 text-center font-mono text-sm uppercase">Un píxel cada {COOLDOWN_MS / 1000} segundos · Se borra cada lunes</p>
      <Lienzo initial={pixels} size={SIZE} palette={PALETTE} cooldownMs={COOLDOWN_MS} />
    </div>
  );
}
