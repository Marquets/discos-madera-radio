import { connection } from "next/server";
import { COLS, COOLDOWN_MS, PALETTE, ROWS, readCanvas } from "@/lib/canvas";
import { Lienzo } from "./Lienzo";

// The stored canvas resolves in milliseconds, same as the track list
export const instant = false;

export default async function CanvasPage() {
  await connection();
  const pixels = await readCanvas();

  // Exactly one screen minus the header as measured on this page (no logo drop, see
  // globals.css), so the canvas runs from under the menu to the bottom edge; -mb-16 covers
  // the padding the layout's <main> leaves
  return (
    <div className="-mb-16 h-[calc(100svh-10.75rem)] bg-black text-accent sm:h-[calc(100svh-10.25rem)]">
      <Lienzo initial={pixels} cols={COLS} rows={ROWS} palette={PALETTE} cooldownMs={COOLDOWN_MS}>
        {/* Still the page's heading for screen readers, just not shown */}
        <h1 className="sr-only">Deja tu píxel</h1>
        <p>Se borra cada lunes</p>
      </Lienzo>
    </div>
  );
}
