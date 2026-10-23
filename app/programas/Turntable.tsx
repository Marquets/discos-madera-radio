// Same orange-on-black palette as the tape deck on the front page
const CREAM = "#f89028";
const VINYL = "#5a3410";
const WIRE = "#8a5520";
const SPINDLE = { x: 160, y: 150 };

export function Turntable() {
  return (
    <figure id="tocadiscos" className="mx-auto w-full max-w-md">
      <svg viewBox="0 0 400 300" role="img" aria-label="Tocadiscos" className="block w-full">
        <rect x="8" y="8" width="384" height="284" rx="12" fill="none" stroke={CREAM} strokeWidth="3" />
        <circle cx="34" cy="34" r="10" fill="none" stroke={WIRE} strokeWidth="2.5" />

        <circle cx={SPINDLE.x} cy={SPINDLE.y} r="126" fill="none" stroke={CREAM} strokeWidth="3" />
        {/* 33⅓ rpm is 1.8 s a turn; the default view-box transform-box makes the origin user units */}
        <g style={{ transformOrigin: `${SPINDLE.x}px ${SPINDLE.y}px` }} className="motion-safe:animate-[spin_1.8s_linear_infinite]">
          <circle cx={SPINDLE.x} cy={SPINDLE.y} r="118" fill={VINYL} />
          {[106, 92, 78, 64].map((r) => (
            <circle key={r} cx={SPINDLE.x} cy={SPINDLE.y} r={r} fill="none" stroke="#000" strokeWidth="1.5" />
          ))}
          {/* The shine is what shows the record turning; a plain disc looks still */}
          <path d={`M${SPINDLE.x - 98} ${SPINDLE.y - 40} A106 106 0 0 1 ${SPINDLE.x - 40} ${SPINDLE.y - 98}`} fill="none" stroke={WIRE} strokeWidth="5" strokeLinecap="round" />
          <circle cx={SPINDLE.x} cy={SPINDLE.y} r="40" fill={CREAM} />
        </g>
        <circle cx={SPINDLE.x} cy={SPINDLE.y} r="4" fill="#000" />

        <rect x="321" y="22" width="18" height="20" fill={WIRE} />
        <circle cx="330" cy="62" r="20" fill="none" stroke={CREAM} strokeWidth="3" />
        <circle cx="330" cy="62" r="7" fill={CREAM} />
        <polyline points="330,62 342,178 262,226" fill="none" stroke={CREAM} strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" />
        <rect x="244" y="218" width="26" height="14" rx="2" fill={CREAM} transform="rotate(-31 257 225)" />

        <rect x="362" y="150" width="10" height="110" fill="none" stroke={WIRE} strokeWidth="2" />
        <rect x="356" y="196" width="22" height="8" fill={CREAM} />

        <rect x="24" y="258" width="38" height="20" rx="3" fill="none" stroke={CREAM} strokeWidth="2.5" />
        <circle cx="300" cy="272" r="4" fill={CREAM} />
      </svg>
    </figure>
  );
}
