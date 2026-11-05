import { energyFrom, esNocturna, type Energy } from "./franjas";

export type Medida = { energy: Energy | null; nocturna: boolean };

/**
 * Spotify dropped audio features for new apps, so they come from ReccoBeats, a free API without
 * a key that answers by Spotify id. Small artists are often missing: those come back with no
 * energy and not nocturnal, so they're not asked again and play in every slot until someone
 * labels them by hand.
 */
export async function trackMeasures(ids: string[]): Promise<Map<string, Medida>> {
  const found = new Map<string, Medida>(ids.map((id) => [id, { energy: null, nocturna: false }]));
  for (let i = 0; i < ids.length; i += 40) {
    const res = await fetch(`https://api.reccobeats.com/v1/audio-features?ids=${ids.slice(i, i + 40).join(",")}`, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`ReccoBeats ${res.status}`);
    type Features = { href: string; energy: number; acousticness: number; instrumentalness: number };
    const { content } = (await res.json()) as { content: Features[] };
    for (const f of content) found.set(f.href.split("/").at(-1)!, { energy: energyFrom(f.energy), nocturna: esNocturna(f.acousticness, f.instrumentalness) });
  }
  return found;
}
