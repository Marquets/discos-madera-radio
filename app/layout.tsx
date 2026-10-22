import type { Metadata } from "next";
import { Anton, Space_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { playlistUrl } from "@/lib/spotify";
import { recentContributors } from "@/lib/contributors";
import { getTracks } from "@/lib/sync";
import { Logo } from "./Logo";
import { NavLinks } from "./NavLinks";
import { RadioPlayer } from "./RadioPlayer";
import "./globals.css";

const anton = Anton({ variable: "--font-anton", weight: "400", subsets: ["latin"] });
const spaceMono = Space_Mono({ variable: "--font-space-mono", weight: ["400", "700"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Discos Madera Radio",
  description: "La música que vamos descubriendo, sonando en directo",
};

async function OnAir() {
  const tracks = (await getTracks()).toSorted((a, b) => a.firstSeenAt.localeCompare(b.firstSeenAt));
  return <RadioPlayer tracks={tracks} thanks={recentContributors(tracks)} />;
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${anton.variable} ${spaceMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-accent font-sans text-black">
        {/* The black band runs from the ticker through the header and, on the front
            page, carries on behind the tape deck until the covers start. */}
        <div className="bg-black text-accent">
          <Suspense fallback={<div className="h-9 bg-black" />}>
            <OnAir />
          </Suspense>
          <header className="grid grid-cols-2 items-start gap-4 px-4 pb-6 pt-4 font-display text-xl uppercase leading-none sm:grid-cols-[1fr_auto_1fr] sm:px-8 sm:text-2xl">
            {/* Equal 1fr side columns keep the logo centred however wide the sides grow.
                Three columns are too tight on a phone, so there it takes its own row. */}
            <NavLinks />
            <Link href="/" className="order-first col-span-2 flex flex-col items-center gap-1 sm:order-none sm:col-span-1 sm:mt-24">
              <Logo className="h-10 w-auto sm:h-14" />
              <span className="font-mono text-xs tracking-[0.5em] sm:text-sm">Radio</span>
            </Link>
            <a href={playlistUrl()} target="_blank" rel="noreferrer" className="justify-self-end text-right hover:underline">
              Ir a la playlist ↗
            </a>
          </header>
        </div>
        <main className="pb-16">{children}</main>
      </body>
    </html>
  );
}
