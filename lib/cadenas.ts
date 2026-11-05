/**
 * The radio's channels. Each one plays its own Spotify playlist, keeps its own song archive
 * and has its own look; visitors switch between them with the button in the header.
 *
 * What's here is safe for the browser: the playlists live in environment variables, read in
 * lib/cadenas-server.ts. A channel's colours are in globals.css under [data-cadena="<id>"].
 * Adding one: an entry here, its variable in cadenas-server.ts and its colours in globals.css.
 */
export type Cadena = {
  id: string;
  nombre: string;
  /** Where its songs are stored: a Blobs key in Netlify, data/<key>.json locally */
  dbKey: string;
  /** Dates (MM-DD, Madrid time, both included) it plays for anyone who hasn't picked one */
  temporada?: readonly [string, string];
  nieve?: boolean;
  /** The browser's bar colour, which CSS can't set */
  themeColor: string;
};

export const CADENAS = [
  { id: "normal", nombre: "Normal", dbKey: "db", themeColor: "#000000" },
  { id: "navidad", nombre: "Navidad", dbKey: "db-navidad", temporada: ["12-01", "01-06"], nieve: true, themeColor: "#082a15" },
] as const satisfies readonly Cadena[];

export type CadenaId = (typeof CADENAS)[number]["id"];

export const COOKIE = "cadena";

/** Set by visiting any page with ?cadenas=ver (cleared with ?cadenas=no): opens every channel out of season */
export const COOKIE_VER = "ver-cadenas";

/** What a channel needs in the browser: no env, so the server hands this list down */
export type CadenaPublica = Pick<Cadena, "id" | "nombre" | "temporada" | "nieve" | "themeColor">;

/**
 * The channel to play: the one picked (the cookie) if it's still on air, otherwise the first
 * in season, otherwise the first. `hoy` is MM-DD. Self-contained on purpose: layout.tsx
 * inlines its source in a script that runs before the first paint, so it may not use anything
 * from outside its own body.
 */
export function elegirCadena(elegida: string | undefined, cadenas: readonly CadenaPublica[], hoy: string): string {
  if (cadenas.some((c) => c.id === elegida)) return elegida as string;
  const enTemporada = cadenas.find((c) => {
    if (!c.temporada) return false;
    const [desde, hasta] = c.temporada;
    // A season can wrap round New Year, like Christmas does
    return desde <= hasta ? desde <= hoy && hoy <= hasta : hoy >= desde || hoy <= hasta;
  });
  return (enTemporada ?? cadenas[0]).id;
}

/**
 * The channels a visitor can pick today: the ones without a season, plus the seasonal ones while
 * in season, or always for whoever has the preview cookie. Self-contained for the same reason
 * as elegirCadena: layout.tsx inlines it too.
 */
export function abiertas<C extends CadenaPublica>(cadenas: readonly C[], hoy: string, ver: boolean): C[] {
  return cadenas.filter((c) => {
    if (!c.temporada || ver) return true;
    const [desde, hasta] = c.temporada;
    return desde <= hasta ? desde <= hoy && hoy <= hasta : hoy >= desde || hoy <= hasta;
  });
}

/** Today in Spain as MM-DD, the format of a channel's season */
export const hoyEnMadrid = (now = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", month: "2-digit", day: "2-digit" }).format(now);
