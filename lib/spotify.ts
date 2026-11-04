export const playlistUrl = () => process.env.SPOTIFY_PLAYLIST_INVITE_URL || `https://open.spotify.com/playlist/${process.env.SPOTIFY_PLAYLIST_ID}`;

type EmbedTrack = { uri: string; title: string; subtitle: string; duration: number; entityType: string };

export type PlaylistTrack = {
  id: string;
  title: string;
  artist: string;
  spotifyUri: string;
  durationSec: number;
  /** Spotify user id of whoever added it; only the Web API knows */
  addedBy?: string;
  addedAt?: string;
};

export const playlistTracks = () => (process.env.SPOTIFY_REFRESH_TOKEN ? apiTracks() : embedTracks());

// The playlist items endpoint refuses app-only tokens, so it reads as the user who logged in once
// and left SPOTIFY_REFRESH_TOKEN behind. Spotify may hand back a new refresh token; the old one keeps working.
async function apiTracks(): Promise<PlaylistTrack[]> {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } = process.env;
  const auth = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}` },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: SPOTIFY_REFRESH_TOKEN! }),
  });
  if (!auth.ok) throw new Error(`Spotify token ${auth.status}`);
  const { access_token } = await auth.json();

  type Item = { added_at: string; added_by?: { id: string }; item: { type: string; id: string | null; name: string; uri: string; duration_ms: number; artists: { name: string }[] } | null };
  const items: Item[] = [];
  for (let url: string | null = `https://api.spotify.com/v1/playlists/${process.env.SPOTIFY_PLAYLIST_ID}/items?limit=50`; url; ) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${access_token}` } });
    if (!res.ok) throw new Error(`Spotify playlist ${res.status}`);
    const page: { items: Item[]; next: string | null } = await res.json();
    items.push(...page.items);
    url = page.next;
  }

  // Local files have no id and episodes can't play on the radio
  return items.flatMap(({ item: t, added_by, added_at }) =>
    t?.type === "track" && t.id
      ? [{ id: t.id, title: t.name, artist: t.artists.map((a) => a.name).join(", "), spotifyUri: t.uri, durationSec: Math.round(t.duration_ms / 1000), addedBy: added_by?.id, addedAt: added_at }]
      : [],
  );
}

// shortcut: reads Spotify's public embed page, so it works without the Web API keys. It's unofficial, may break
// if Spotify changes that page, and only lists the first 100 songs; set the SPOTIFY_* keys to use the API instead.
async function embedTracks(): Promise<PlaylistTrack[]> {
  const res = await fetch(`https://open.spotify.com/embed/playlist/${process.env.SPOTIFY_PLAYLIST_ID}`, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!res.ok) throw new Error(`Spotify embed ${res.status}`);

  const json = (await res.text()).match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
  if (!json) throw new Error("Spotify embed page format changed");
  const list: EmbedTrack[] = JSON.parse(json).props.pageProps.state.data.entity.trackList;

  return list
    .filter((t) => t.entityType === "track")
    .map((t) => ({
      id: t.uri.split(":")[2],
      title: t.title,
      artist: t.subtitle,
      spotifyUri: t.uri,
      durationSec: Math.round(t.duration / 1000),
    }));
}

/** Album cover via Spotify's official oEmbed endpoint, which needs no keys. */
export async function trackCover(trackId: string) {
  const res = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`);
  if (!res.ok) throw new Error(`Spotify oEmbed ${res.status}`);
  return ((await res.json()) as { thumbnail_url: string }).thumbnail_url;
}
