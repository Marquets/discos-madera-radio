export const playlistUrl = () => `https://open.spotify.com/playlist/${process.env.SPOTIFY_PLAYLIST_ID}`;

type EmbedTrack = { uri: string; title: string; subtitle: string; duration: number; entityType: string };

// shortcut: reads Spotify's public embed page, so no keys or Premium are needed. It's unofficial, may break
// if Spotify changes that page, and only lists the first 100 songs; move to the Web API if either bites.
export async function playlistTracks() {
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
