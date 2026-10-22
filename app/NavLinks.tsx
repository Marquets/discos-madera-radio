"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "En antena" },
  { href: "/archivo", label: "Archivo" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col items-center gap-2">
      {LINKS.map(({ href, label }) => (
        <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} className="decoration-4 underline-offset-4 hover:underline aria-[current=page]:underline">
          {label}
        </Link>
      ))}
    </nav>
  );
}
