import type { Metadata, Viewport } from "next";
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
  // iOS ignores the manifest's icons and name, so they go here too
  appleWebApp: { title: "Discos Madera", statusBarStyle: "black" },
  icons: { apple: "/icons/icon-180.png" },
};

export const viewport: Viewport = { themeColor: "#000000" };

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
          <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 pb-6 pt-4 font-display text-xl uppercase leading-none sm:items-start sm:px-8 sm:text-2xl">
            {/* Equal 1fr side columns keep the logo centred however wide the sides grow.
                On a phone the sides shrink to an icon each, so it all fits in one row. */}
            <NavLinks />
            <Link href="/" className="flex flex-col items-center gap-1">
              <Logo className="h-14 w-auto sm:h-20" />
              <span className="font-mono text-xs tracking-[0.5em] sm:text-sm">Radio</span>
            </Link>
            <a href={playlistUrl()} target="_blank" rel="noreferrer" className="-m-3 justify-self-end p-3 text-right text-2xl hover:underline sm:m-0 sm:p-0">
              <span className="max-sm:sr-only">Ir a la playlist </span>↗
            </a>
          </header>
        </div>
        <main>{children}</main>
      </body>
    </html>
  );
}
