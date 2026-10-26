import { liveSets } from "@/lib/lives";
import { LivePlayer } from "./LivePlayer";

export default async function LivePage() {
  const sets = await liveSets();

  return (
    <div id="live" className="flex min-h-[calc(100svh-var(--chrome))] flex-col bg-black px-4 pb-12 text-accent sm:px-8">
      <h1 className="sr-only">Live</h1>
      {sets.length ? <LivePlayer sets={sets} /> : <p className="mt-6 text-center font-display text-4xl uppercase sm:text-6xl">Coming soon</p>}
    </div>
  );
}
