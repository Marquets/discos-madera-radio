import { cacheLife } from "next/cache";
import { spotifyToken } from "./spotify";

// The collective's artists, by Spotify id: names alone are ambiguous (there are three Kiuts)
const ARTISTS = [
  "2q8QczMXQh5T5OgMIDBz1K", // Mucho Mungo
  "6tvNxwS3ZSBqOSw9htX4Qg", // Good Night Sleep
  "3864SpcapvV1F6cZ4apPc5", // elio seto
  "4fjXzsezaxuXI7f71KQWdZ", // Sosega
  "41628nUd5ULOwIuMZdeanA", // Dim Moon
  "4v9mobECJOVJ0OJB9IK0Jf", // kiut
  "4dOm7N5bjzUs0UwQHH8SZd", // SANTA ANA
];

export type Release = { artist: string; title: string; date: string; url: string; cover?: string };

type Album = { name: string; release_date: string; external_urls: { spotify: string }; images: { url: string }[]; artists: { id: string; name: string }[] };

/** Each artist's newest album or single, newest first; asked again every hour */
export async function latestReleases(): Promise<Release[]> {
  "use cache";
  cacheLife("hours");
  if (!process.env.SPOTIFY_REFRESH_TOKEN) return [];
  const token = await spotifyToken().catch(() => null);
  if (!token) return [];
  const releases = await Promise.all(
    ARTISTS.map(async (id) => {
      // shortcut: the API caps this at 10 and doesn't sort by date; page through `next` once someone has more releases
      const res = await fetch(`https://api.spotify.com/v1/artists/${id}/albums?include_groups=album,single&limit=10`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return console.error(`Spotify albums ${id} ${res.status}`);
      const { items }: { items: Album[] } = await res.json();
      const latest = items.toSorted((a, b) => b.release_date.localeCompare(a.release_date))[0];
      if (!latest) return;
      return { artist: latest.artists.find((a) => a.id === id)?.name ?? latest.artists[0].name, title: latest.name, date: latest.release_date, url: latest.external_urls.spotify, cover: latest.images[0]?.url };
    }),
  );
  return releases.filter((r) => r !== undefined).toSorted((a, b) => b.date.localeCompare(a.date));
}
