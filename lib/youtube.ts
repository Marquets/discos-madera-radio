/**
 * Official Data API with a free Google Cloud key, no Premium. A search costs 100 of the
 * 10,000 daily quota units, so each song is searched once at sync and the result stored.
 * Returns null when YouTube has nothing, so that song is not searched again.
 */
export async function findVideo(title: string, artist: string) {
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    videoCategoryId: "10",
    videoEmbeddable: "true",
    maxResults: "1",
    q: `${artist} ${title}`,
    key: process.env.YOUTUBE_API_KEY!,
  });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  if (!res.ok) throw new Error(`YouTube search ${res.status}`);
  const { items } = (await res.json()) as { items: { id: { videoId: string } }[] };
  return items[0]?.id.videoId ?? null;
}
