// Netlify cron: the playlist is picked up even when nobody visits the site
export default async function syncPlaylist() {
  const res = await fetch(`${process.env.URL}/api/sync`, {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  console.log(`sync ${res.status}: ${await res.text()}`);
}

export const config = { schedule: "*/15 * * * *" };
