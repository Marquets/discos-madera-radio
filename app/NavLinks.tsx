"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// The logo is already the way back to the front page
const LINKS = [
  { href: "/archivo", label: "Archivo" },
  { href: "/programas", label: "Programas" },
  { href: "/live", label: "Live" },
  // Deja tu píxel queda fuera del menú; la página sigue en pie y se llega por su URL
];

/** Folded behind one button, so the hero only carries the logo; the links drop in one after another */
export function NavLinks() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const nav = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !nav.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", close);
    document.addEventListener("pointerdown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", close);
    };
  }, [open]);

  return (
    <nav ref={nav} className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="menu" aria-label="Menú" className="flex h-[1em] items-center hover:text-white">
        <span className="relative h-3 w-6" aria-hidden>
          <span className={`absolute left-0 h-0.5 w-6 bg-current transition-[top,rotate] duration-300 motion-reduce:transition-none ${open ? "top-1.25 rotate-45" : "top-0"}`} />
          <span className={`absolute top-1.25 left-0 h-0.5 w-6 bg-current transition-opacity duration-300 motion-reduce:transition-none ${open ? "opacity-0" : "opacity-100"}`} />
          <span className={`absolute left-0 h-0.5 w-6 bg-current transition-[top,rotate] duration-300 motion-reduce:transition-none ${open ? "top-1.25 -rotate-45" : "top-2.5"}`} />
        </span>
      </button>
      <ul
        id="menu"
        inert={!open}
        className={`absolute top-full left-0 z-20 flex flex-col items-start gap-3 bg-black pt-4 pr-8 pb-4 transition-opacity duration-300 motion-reduce:transition-none ${open ? "opacity-100" : "opacity-0"}`}
      >
        {LINKS.map(({ href, label }, i) => (
          <li
            key={href}
            // Staggered on the way in, all at once on the way out
            style={{ transitionDelay: open ? `${i * 70}ms` : "0ms" }}
            className={`transition-[opacity,translate] duration-300 ease-out motion-reduce:transition-none ${open ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"}`}
          >
            <Link
              href={href}
              onClick={() => setOpen(false)}
              aria-current={pathname === href ? "page" : undefined}
              className="text-3xl decoration-4 underline-offset-4 hover:underline aria-[current=page]:underline sm:text-4xl"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
