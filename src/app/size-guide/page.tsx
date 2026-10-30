import { SizeTable } from "@/components/product/SizeTable";

export const metadata = { title: "Size guide | AURE" };

export default function SizeGuide() {
  return (
    <div className="page wrap info">
      <p className="mono ember">(Size guide)</p>
      <h1 className="display info__title">
        Find your <span className="serif">fit.</span>
      </h1>
      <p className="info__lead ash">AURE is cut oversized: dropped shoulders, a boxy body and a longer line. These are garment measurements, not body measurements.</p>
      <div className="info__split">
        <svg viewBox="0 0 220 220" className="info__diagram" aria-label="How we measure">
          <path d="M66 22 L88 12 Q110 28 132 12 L154 22 L204 52 L186 92 L164 80 L166 206 Q110 212 54 206 L56 80 L34 92 L16 52 Z" fill="#1b1917" stroke="rgba(237,231,220,0.35)" />
          <line x1="56" y1="100" x2="164" y2="100" stroke="#ff4d1f" strokeDasharray="4 4" />
          <text x="110" y="94" textAnchor="middle" fill="#ff4d1f" fontSize="9" fontFamily="monospace">CHEST</text>
          <line x1="178" y1="22" x2="178" y2="206" stroke="#ede7dc" strokeDasharray="4 4" />
          <text x="186" y="120" fill="#ede7dc" fontSize="9" fontFamily="monospace" transform="rotate(90 186 120)">LENGTH</text>
          <line x1="66" y1="30" x2="154" y2="30" stroke="#8e8a83" strokeDasharray="3 3" />
          <text x="110" y="44" textAnchor="middle" fill="#8e8a83" fontSize="8" fontFamily="monospace">SHOULDER</text>
        </svg>
        <SizeTable />
      </div>
    </div>
  );
}
