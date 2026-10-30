"use client";

import { useMemo, useState } from "react";
import { PRODUCTS } from "@/lib/products";
import { ProductCard } from "@/components/product/ProductCard";

const FILTERS = [
  { id: "all", label: "All", test: () => true },
  { id: "dark", label: "Dark", test: (hex: string) => lum(hex) < 0.2 },
  { id: "light", label: "Light", test: (hex: string) => lum(hex) >= 0.2 && !warm(hex) },
  { id: "warm", label: "Ember", test: (hex: string) => warm(hex) },
];

function rgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function lum(hex: string) {
  const [r, g, b] = rgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}
function warm(hex: string) {
  const [r, g, b] = rgb(hex);
  return r - b > 60 && r > 70;
}

export default function Shop() {
  const [f, setF] = useState("all");
  const list = useMemo(() => {
    const filter = FILTERS.find((x) => x.id === f)!;
    return PRODUCTS.filter((p) => p.colorways.some((c) => filter.test(c.fabric)));
  }, [f]);

  return (
    <div className="page shop">
      <header className="shop__head wrap">
        <p className="mono ember">(Shop — Drop 001)</p>
        <h1 className="display shop__title">
          All <span className="outline">pieces</span>
        </h1>
        <div className="shop__bar">
          <p className="ash shop__lead">Four garments, one story. Every piece below is live 3D — hover to move it, open it to spin it a full 360°, top and bottom.</p>
          <div className="shop__filters mono" role="tablist" aria-label="Filter by colour">
            {FILTERS.map((x) => (
              <button key={x.id} role="tab" aria-selected={f === x.id} className={f === x.id ? "is-on" : ""} onClick={() => setF(x.id)}>
                {x.label}
              </button>
            ))}
            <span className="ash">({String(list.length).padStart(2, "0")})</span>
          </div>
        </div>
      </header>
      <div className="shop__grid wrap">
        {list.map((p, i) => (
          <ProductCard key={p.slug} product={p} i={i} />
        ))}
      </div>
    </div>
  );
}
