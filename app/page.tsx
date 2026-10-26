import { MAX_LENGTH } from "@/lib/messages";
import { getTracks } from "@/lib/sync";
import { Mensajes } from "./Mensajes";
import { TapeDeck } from "./TapeDeck";
import { TrackGrid } from "./TrackGrid";

// The stored list resolves in milliseconds; the playlist refresh happens after the response
export const instant = false;

export default async function Home() {
  const onAir = (await getTracks()).toSorted((a, b) => a.firstSeenAt.localeCompare(b.firstSeenAt));
  const latest = onAir.toReversed();

  return (
    <>
      <h1 className="sr-only">En antena</h1>
      {onAir.length > 0 && (
        // One full screen minus what sits above it, so the covers start just off the
        // fold and scrolling is what reveals them. svh, not vh, because a phone's
        // address bar shrinks the viewport and vh would overshoot behind it.
        <div className="hero relative flex min-h-[calc(100svh-var(--chrome))] flex-col bg-black max-sm:justify-center px-4 pb-12 text-accent sm:px-8">
          <TapeDeck tracks={onAir} />
          {/* Hueco del reproductor de Spotify, que globals.css coloca encima: dice lo
              mismo que decía el pie "now playing", así que hace de pie además de
              reproductor. Alto fijo porque el iframe no vive dentro, mide 80px. */}
          <div id="reproductor" className="mx-auto mt-6 h-20 w-full max-w-md" />
          <Mensajes maxLength={MAX_LENGTH} />
        </div>
      )}
      <div className="px-4 pt-12 pb-16 sm:px-8">
        {latest.length ? <TrackGrid tracks={latest} /> : <p className="text-center uppercase">Aún no hay canciones.</p>}
      </div>
    </>
  );
}
