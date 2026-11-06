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

export const playlistTracks = (playlistId: string) => (process.env.SPOTIFY_REFRESH_TOKEN ? apiTracks(playlistId) : embedTracks(playlistId));

// The playlist items endpoint refuses app-only tokens, so it reads as the user who logged in once
// and left SPOTIFY_REFRESH_TOKEN behind. Spotify may hand back a new refresh token; the old one keeps working.
export async function spotifyToken(): Promise<string> {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } = process.env;
  const auth = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}` },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: SPOTIFY_REFRESH_TOKEN! }),
  });
  if (!auth.ok) throw new Error(`Spotify token ${auth.status}`);
  return (await auth.json()).access_token;
}

async function apiTracks(playlistId: string): Promise<PlaylistTrack[]> {
  const access_token = await spotifyToken();

  type Item = { added_at: string; added_by?: { id: string }; item: { type: string; id: string | null; name: string; uri: string; duration_ms: number; artists: { name: string }[] } | null };
  const items: Item[] = [];
  for (let url: string | null = `https://api.spotify.com/v1/playlists/${playlistId}/items?limit=50`; url; ) {
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
async function embedTracks(playlistId: string): Promise<PlaylistTrack[]> {
  const res = await fetch(`https://open.spotify.com/embed/playlist/${playlistId}`, {
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

// Searching and reading a track only need the app's own token, not a user's; kept until it expires
let app: { token: string; until: number } | undefined;

async function appToken() {
  if (app && app.until > Date.now()) return app.token;
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}` },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });
  if (!res.ok) throw new Error(`Spotify app token ${res.status}`);
  const { access_token, expires_in }: { access_token: string; expires_in: number } = await res.json();
  app = { token: access_token, until: Date.now() + (expires_in - 60) * 1000 };
  return access_token;
}

type ApiTrack = { id: string; name: string; uri: string; duration_ms: number; artists: { name: string }[]; album: { images: { url: string }[] } };

export type FoundTrack = Omit<PlaylistTrack, "addedBy" | "addedAt"> & { cover?: string };

// Images come largest first (640, 300, 64); the 300 one is the size the covers already use
const found = (t: ApiTrack): FoundTrack => ({
  id: t.id,
  title: t.name,
  artist: t.artists.map((a) => a.name).join(", "),
  spotifyUri: t.uri,
  durationSec: Math.round(t.duration_ms / 1000),
  cover: t.album.images.at(-2)?.url ?? t.album.images[0]?.url,
});

/** The id in a pasted track link (open.spotify.com/track/…, with or without intl-xx) or URI */
export const trackIdFrom = (text: string) => text.match(/(?:open\.spotify\.com\/(?:intl-[a-z-]+\/)?track\/|spotify:track:)([A-Za-z0-9]{22})/)?.[1];

export async function getTrack(id: string): Promise<FoundTrack | null> {
  const res = await fetch(`https://api.spotify.com/v1/tracks/${id}`, { headers: { Authorization: `Bearer ${await appToken()}` } });
  if (res.status === 400 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Spotify track ${res.status}`);
  return found(await res.json());
}

/** A pasted link finds just that song; anything else goes to Spotify's search */
export async function searchTracks(text: string): Promise<FoundTrack[]> {
  const id = trackIdFrom(text);
  if (id) return [await getTrack(id)].filter((t) => t !== null);
  const res = await fetch(`https://api.spotify.com/v1/search?${new URLSearchParams({ q: text, type: "track", limit: "6" })}`, {
    headers: { Authorization: `Bearer ${await appToken()}` },
  });
  if (!res.ok) throw new Error(`Spotify search ${res.status}`);
  return ((await res.json()) as { tracks: { items: ApiTrack[] } }).tracks.items.map(found);
}

// Needs the user token with playlist-modify-public and playlist-modify-private (scripts/spotify-token.mjs)
export async function addToPlaylist(playlistId: string, uri: string) {
  const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/items`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await spotifyToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ uris: [uri] }),
  });
  if (!res.ok) throw new Error(`Spotify add ${res.status}`);
}
