import { getTracks } from "@/lib/sync";
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
        <div className="pb-12 pt-8">
          <TapeDeck tracks={onAir} />
        </div>
      )}
      {latest.length ? <TrackGrid tracks={latest} /> : <p className="text-center uppercase">Aún no hay canciones.</p>}
    </>
  );
}
