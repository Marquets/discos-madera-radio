import { cookies } from "next/headers";
import { connection } from "next/server";
import { abiertas, CADENAS, COOKIE, COOKIE_VER, elegirCadena, hoyEnMadrid, type Cadena, type CadenaId, type CadenaPublica } from "./cadenas";

/** Each channel's playlist, from the environment. A channel without a playlist is off air. */
const PLAYLISTS: Record<CadenaId, string | undefined> = {
  normal: process.env.SPOTIFY_PLAYLIST_ID,
  navidad: process.env.SPOTIFY_PLAYLIST_ID_NAVIDAD,
};

export type CadenaEnAntena = Cadena & { id: CadenaId; playlistId?: string };

/** The channels with a playlist set, in CADENAS order. Normal always plays: it's the radio itself. */
export const enAntena = (): CadenaEnAntena[] =>
  CADENAS.flatMap((c) => {
    const id = PLAYLISTS[c.id];
    return id || c.id === "normal" ? [{ ...c, playlistId: id }] : [];
  });

export const publicas = (): CadenaPublica[] => enAntena().map(({ id, nombre, temporada, nieve, themeColor }) => ({ id, nombre, temporada, nieve, themeColor }));

/**
 * The channel this request plays, by the same rule the browser's inline script uses for the colours.
 * Waits for a real request first: it reads today's date, which a prerender can't fix in place.
 */
export async function cadenaActual(): Promise<CadenaEnAntena> {
  await connection();
  const jar = await cookies();
  const hoy = hoyEnMadrid();
  const cadenas = abiertas(enAntena(), hoy, jar.has(COOKIE_VER));
  const id = elegirCadena(jar.get(COOKIE)?.value, cadenas, hoy);
  return cadenas.find((c) => c.id === id)!;
}
