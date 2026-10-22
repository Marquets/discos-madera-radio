// Spotify's API needs Premium since February 2026, so who added what is read by hand
// from the playlist page and kept here. It lives in the repo rather than the blob store
// because it changes rarely and is curated, not written by the running site.
import contributors from "../data/contributors.json";

const BY_ID: Record<string, { by: string } | undefined> = contributors;

/**
 * Distinct names, most recent first. Whoever added the newest song leads, and a name
 * already shown is not repeated further down, so six songs by one person do not fill
 * the whole list. Falls back to the Spotify username when someone set no display name.
 */
export function recentContributors(tracksOldestFirst: { id: string }[], limit = 5) {
  const names: string[] = [];
  for (let i = tracksOldestFirst.length - 1; i >= 0 && names.length < limit; i--) {
    const name = BY_ID[tracksOldestFirst[i].id]?.by;
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}
