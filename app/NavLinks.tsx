"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The logo is already the way back to the front page
const LINKS = [
  { href: "/archivo", label: "Archivo" },
  { href: "/programas", label: "Programas" },
  { href: "/live", label: "Live" },
  // Deja tu píxel queda fuera del menú; la página sigue en pie y se llega por su URL
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col items-start gap-2">
      {LINKS.map(({ href, label }) => (
        <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className="decoration-4 underline-offset-4 hover:underline aria-[current=page]:underline">
          {label}
        </Link>
      ))}
    </nav>
  );
}
