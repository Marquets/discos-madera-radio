"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const VISIBLES = 14;

/** Covers dropped one on top of another, the pile growing forever; each drop has its own fixed spot and tilt so server and client agree */
export function Collage({ covers }: { covers: string[] }) {
  const [n, setN] = useState(VISIBLES);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setN((n) => n + 1), 450);
    return () => clearInterval(id);
  }, []);

  return (
    <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
      {Array.from({ length: VISIBLES }, (_, k) => {
        const i = n - VISIBLES + k;
        return (
          <Image
            key={i}
            src={covers[i % covers.length]}
            alt=""
            width={420}
            height={420}
            sizes="(min-width: 1024px) 26rem, 40vw"
            className="absolute aspect-square w-[clamp(10rem,34vw,26rem)] object-cover shadow-[0_0_2rem_#0008]"
            style={{ left: `${((i * 37) % 85) - 10}%`, top: `${((i * 53) % 75) - 12}%`, rotate: `${((i * 7) % 17) - 8}deg` }}
          />
        );
      })}
    </div>
  );
}
