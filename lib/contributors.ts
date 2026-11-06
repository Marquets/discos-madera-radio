// The Web API says who added each song only as a Spotify user id, and refuses to look up
// the display name, so the names live here: one line per person, added by hand once.
import contributors from "../data/contributors.json";

const NAMES: Record<string, string | undefined> = contributors;

export const contributorName = (id: string) => NAMES[id] ?? id;

/**
 * Distinct names, most recent first. Whoever added the newest song leads, and a name
 * already shown is not repeated further down, so six songs by one person do not fill
 * the whole list. Falls back to the Spotify user id for someone not listed yet.
 */
export function recentContributors(tracksOldestFirst: { addedBy?: string }[], limit = 5) {
  const names: string[] = [];
  for (let i = tracksOldestFirst.length - 1; i >= 0 && names.length < limit; i--) {
    const id = tracksOldestFirst[i].addedBy;
    const name = id && contributorName(id);
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}
