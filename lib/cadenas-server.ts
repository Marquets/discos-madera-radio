import { cookies } from "next/headers";
import { abiertas, CADENAS, COOKIE, COOKIE_VER, elegirCadena, hoyEnMadrid, type Cadena, type CadenaId, type CadenaPublica } from "./cadenas";

/** Each channel's playlist and invite, from the environment. A channel without a playlist is off air. */
const PLAYLISTS: Record<CadenaId, { id?: string; invite?: string }> = {
  normal: { id: process.env.SPOTIFY_PLAYLIST_ID, invite: process.env.SPOTIFY_PLAYLIST_INVITE_URL },
  navidad: { id: process.env.SPOTIFY_PLAYLIST_ID_NAVIDAD, invite: process.env.SPOTIFY_PLAYLIST_INVITE_URL_NAVIDAD },
};

export type CadenaEnAntena = Cadena & { id: CadenaId; playlistId?: string; playlistUrl: string };

/** The channels with a playlist set, in CADENAS order. Normal always plays: it's the radio itself. */
export const enAntena = (): CadenaEnAntena[] =>
  CADENAS.flatMap((c) => {
    const { id, invite } = PLAYLISTS[c.id];
    // The invite lets people add songs; without one the link just opens the playlist
    return id || c.id === "normal" ? [{ ...c, playlistId: id, playlistUrl: invite || `https://open.spotify.com/playlist/${id}` }] : [];
  });

export const publicas = (): CadenaPublica[] => enAntena().map(({ id, nombre, temporada, nieve, themeColor }) => ({ id, nombre, temporada, nieve, themeColor }));

/** The channel this request plays, by the same rule the browser's inline script uses for the colours */
export async function cadenaActual(): Promise<CadenaEnAntena> {
  const jar = await cookies();
  const hoy = hoyEnMadrid();
  const cadenas = abiertas(enAntena(), hoy, jar.has(COOKIE_VER));
  const id = elegirCadena(jar.get(COOKIE)?.value, cadenas, hoy);
  return cadenas.find((c) => c.id === id)!;
}
