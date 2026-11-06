// Prints a SPOTIFY_REFRESH_TOKEN that can read the playlists and add songs to them (/pon-un-tema).
// Run once, logged in to Spotify with the account that owns the playlists:
//   node --env-file=.env.local scripts/spotify-token.mjs
// The app on developer.spotify.com needs http://127.0.0.1:8888/callback among its redirect URIs.
import { createServer } from "node:http";

const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET } = process.env;
if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) throw new Error("Faltan SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET");

const redirect = "http://127.0.0.1:8888/callback";
const scope = "playlist-read-private playlist-read-collaborative playlist-modify-public playlist-modify-private";
const state = crypto.randomUUID();

const server = createServer(async (req, res) => {
  const url = new URL(req.url, redirect);
  if (url.pathname !== "/callback") return res.writeHead(404).end();
  const code = url.searchParams.get("code");
  if (url.searchParams.get("state") !== state || !code) return res.writeHead(400).end("Algo no cuadra, vuelve a lanzar el script");

  const auth = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}` },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirect }),
  });
  const body = await auth.json();
  res.end(auth.ok ? "Listo, vuelve a la terminal" : "Spotify ha dicho que no, mira la terminal");
  console.log(auth.ok ? `\nSPOTIFY_REFRESH_TOKEN=${body.refresh_token}\n` : body);
  server.close();
});

server.listen(8888, "127.0.0.1", () => {
  const login = new URL("https://accounts.spotify.com/authorize");
  login.search = new URLSearchParams({ client_id: SPOTIFY_CLIENT_ID, response_type: "code", redirect_uri: redirect, scope, state }).toString();
  console.log(`Abre esto en el navegador e inicia sesión con la cuenta dueña de las playlists:\n\n${login}\n`);
});
