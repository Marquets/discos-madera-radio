import type { Metadata } from "next";
import { getTracks } from "@/lib/sync";
import { Entradillas } from "./Entradillas";

export const metadata: Metadata = { title: "Entradillas · Discos Madera Radio" };

// The stored list resolves in milliseconds; the playlist refresh happens after the response
export const instant = false;

/** Grabar la entradilla de una canción de la radio; ?tema=<id> llega con esa ya elegida (el micro del reproductor) */
export default async function EntradillasPage({ searchParams }: PageProps<"/entradillas">) {
  const { tema } = await searchParams;
  const tracks = (await getTracks()).toSorted((a, b) => b.firstSeenAt.localeCompare(a.firstSeenAt));
  return <Entradillas tracks={tracks.map(({ id, title, artist, cover }) => ({ id, title, artist, cover }))} inicial={typeof tema === "string" ? tema : undefined} />;
}
