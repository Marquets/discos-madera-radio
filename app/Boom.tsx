// A comic explosion: spikes of uneven length, fixed so server and client draw the same one
const SPIKES = [1, 0.82, 0.96, 0.78, 1.04, 0.88, 0.8, 1, 0.9, 0.76, 1.02, 0.86, 0.95, 0.8, 1.06, 0.84];

function burst(rx: number, ry: number, inner: number) {
  const n = SPIKES.length;
  const points = Array.from({ length: n * 2 }, (_, i) => {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? inner : SPIKES[i / 2];
    return `${(100 + Math.cos(a) * rx * r).toFixed(1)},${(70 + Math.sin(a) * ry * r).toFixed(1)}`;
  });
  return `M${points.join("L")}Z`;
}

const OUTER = burst(98, 68, 0.66);
const INNER = burst(84, 56, 0.78);

/** The burst behind "The very best of 2026": an accent blast round a white one, black outline */
export function Boom({ className }: { className?: string }) {
  return (
    <svg viewBox="-4 -4 216 156" className={`overflow-visible ${className ?? ""}`} aria-hidden>
      <path d={OUTER} className="fill-accent stroke-black" strokeWidth="3" strokeLinejoin="round" />
      <path d={INNER} className="fill-white stroke-black" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}
