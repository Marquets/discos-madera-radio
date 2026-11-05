import type { Metadata, Viewport } from "next";
import { Anton, Space_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { abiertas, COOKIE, COOKIE_VER, elegirCadena } from "@/lib/cadenas";
import { enAntena, publicas } from "@/lib/cadenas-server";
import { recentContributors } from "@/lib/contributors";
import { getTracks } from "@/lib/sync";
import { CambiaCadena } from "./CambiaCadena";
import { CortinillaDibus } from "./CortinillaDibus";
import { Logo } from "./Logo";
import { NavLinks } from "./NavLinks";
import { Nieve } from "./Nieve";
import { RadioPlayer } from "./RadioPlayer";
import "./globals.css";

const anton = Anton({ variable: "--font-anton", weight: "400", subsets: ["latin"] });
const spaceMono = Space_Mono({ variable: "--font-space-mono", weight: ["400", "700"], subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Discos Madera Radio",
  description: "La música que vamos descubriendo, sonando en directo",
  // iOS ignores the manifest's icons and name, so they go here too
  appleWebApp: { title: "Discos Madera", statusBarStyle: "black" },
  icons: { icon: "/icon.png", apple: "/icons/icon-180.png" },
};

export const viewport: Viewport = { themeColor: "#000000" };

async function OnAir() {
  const tracks = (await getTracks()).toSorted((a, b) => a.firstSeenAt.localeCompare(b.firstSeenAt));
  return <RadioPlayer tracks={tracks} thanks={recentContributors(tracks)} />;
}

/**
 * Puts the visitor's channel on <html data-cadena> while the page is still parsing, before the
 * first paint, so its colours (globals.css) never flash. The server can't: <html> is in the
 * static shell, which can't read the cookie. Same rule as the server, which picks the songs
 * (elegirCadena's own source, inlined). On the client the type flips to text/plain so React
 * doesn't warn about rendering a script; suppressHydrationWarning covers the difference.
 */
function PintaCadena() {
  const cadenas = publicas();
  // ?cadenas=ver / ?cadenas=no turn the preview cookie on and off; data-cambia shows the switch
  const html = `{var d=document.documentElement,q=location.search.match(/[?&]cadenas=(ver|no)\\b/);if(q)document.cookie="${COOKIE_VER}="+(q[1]==="ver"?"1; max-age=31536000":"; max-age=0")+"; path=/; samesite=lax";var hoy=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Madrid",month:"2-digit",day:"2-digit"}).format(new Date()),a=(${abiertas.toString()})(${JSON.stringify(cadenas)},hoy,/(?:^|; )${COOKIE_VER}=/.test(document.cookie)),m=document.cookie.match(/(?:^|; )${COOKIE}=([^;]*)/);d.dataset.cadena=(${elegirCadena.toString()})(m?decodeURIComponent(m[1]):undefined,a,hoy);if(a.length>1)d.dataset.cambia="";else delete d.dataset.cambia}`;
  return <script type={typeof window === "undefined" ? "text/javascript" : "text/plain"} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  const cadenas = enAntena();
  return (
    // suppressHydrationWarning: PintaCadena adds data-cadena before React hydrates
    <html lang="es" className={`${anton.variable} ${spaceMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <PintaCadena />
      </head>
      <body className="min-h-full bg-accent font-sans text-black">
        {/* The black band runs from the ticker through the header and, on the front
            page, carries on behind the tape deck until the covers start. */}
        <div className="bg-black text-accent">
          <Suspense fallback={<div className="h-9 bg-black" />}>
            <OnAir />
          </Suspense>
          <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 pb-6 pt-4 font-display text-xl uppercase leading-none sm:items-start sm:px-8 sm:text-2xl">
            {/* Equal 1fr side columns keep the logo centred however wide the sides grow; the
                right one holds the channel switch, when there's more than one. */}
            <NavLinks playlists={Object.fromEntries(cadenas.map((c) => [c.id, c.playlistUrl]))} cadenas={publicas()} />
            <Link href="/" className="flex flex-col items-center gap-1">
              <Logo className="h-14 w-auto sm:h-20" />
              <span className="font-mono text-xs tracking-[0.5em] sm:text-sm">Radio</span>
            </Link>
            <CambiaCadena cadenas={publicas()} className="justify-self-end text-sm max-sm:hidden" />
          </header>
        </div>
        <main>{children}</main>
        <CortinillaDibus />
        <Nieve en={cadenas.filter((c) => c.nieve).map((c) => c.id)} />
      </body>
    </html>
  );
}
