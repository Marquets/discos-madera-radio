import type { Metadata } from "next";
import { enAntena } from "@/lib/cadenas-server";
import { PonUnTema } from "./PonUnTema";

export const metadata: Metadata = { title: "Pon un tema · Discos Madera Radio" };

export default function Page() {
  const playlists = Object.fromEntries(enAntena().flatMap((c) => (c.playlistId ? [[c.id, `https://open.spotify.com/playlist/${c.playlistId}`]] : [])));
  return <PonUnTema playlists={playlists} />;
}
