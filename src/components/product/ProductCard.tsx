"use client";

import { useRef } from "react";
import { ShirtStage } from "@/components/three/ShirtStage";
import { SpinController } from "@/three/controller";
import type { Product } from "@/lib/products";
import { formatINR } from "@/lib/cart";
import { TLink } from "@/components/layout/TLink";

export function ProductCard({ product, i }: { product: Product; i: number }) {
  const controller = useRef(new SpinController({ autoSpeed: 0.22 + (i % 3) * 0.05, yaw: -0.6 + i * 1.7 })).current;
  const cw = product.colorways[0];
  return (
    <TLink
      href={`/product/${product.slug}`}
      label={product.name}
      className={`card ${i % 2 ? "card--offset" : ""}`}
      data-reveal
      style={{ ["--tint" as string]: cw.fabric, ["--accent" as string]: cw.accent }}
    >
      <div className="card__bg" aria-hidden />
      <div className="card__stage">
        <ShirtStage print={product.print} colorway={cw} controller={controller} mode="card" />
      </div>
      <div className="card__top mono">
        <span>{product.index}</span>
        <span className="ash">{product.type}</span>
      </div>
      <div className="card__bottom">
        <h3 className="display card__name">{product.name}</h3>
        <div className="card__meta">
          <span className="mono">{formatINR(product.price)}</span>
          <span className="card__dots" aria-label={`${product.colorways.length} colourways`}>
            {product.colorways.map((c) => (
              <span key={c.id} style={{ background: c.fabric }} title={c.name} />
            ))}
          </span>
        </div>
        <p className="card__tag serif">{product.tagline}</p>
        <span className="card__cta mono">
          View piece <span className="ember">→</span>
        </span>
      </div>
    </TLink>
  );
}
