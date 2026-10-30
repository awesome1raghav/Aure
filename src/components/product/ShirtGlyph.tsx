import type { Colorway } from "@/lib/products";

/** Lightweight flat tee for cart rows / summaries (no WebGL needed). */
export function ShirtGlyph({ cw, label }: { cw: Colorway; label?: string }) {
  return (
    <svg viewBox="0 0 100 100" className="glyph" aria-hidden>
      <defs>
        <linearGradient id={`g-${cw.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={cw.fabric} />
          <stop offset="1" stopColor={cw.fabric} stopOpacity="0.82" />
        </linearGradient>
      </defs>
      <path
        d="M31 9 L41 5 Q50 12 59 5 L69 9 L92 23 L84 41 L74 36 L75 94 Q50 97 25 94 L26 36 L16 41 L8 23 Z"
        fill={`url(#g-${cw.id})`}
        stroke="rgba(237,231,220,0.18)"
        strokeWidth="0.8"
      />
      <path d="M41 5 Q50 13 59 5" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="2.4" />
      {label && (
        <text x="50" y="40" textAnchor="middle" fontSize="7.5" fontWeight="900" fill={cw.ink} style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
          {label}
        </text>
      )}
      <rect x="44" y="46" width="12" height="1.4" fill={cw.accent} />
    </svg>
  );
}
