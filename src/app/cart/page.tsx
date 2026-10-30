"use client";

import { useEffect, useState } from "react";
import { useCart, summarize, lineTotal, formatINR } from "@/lib/cart";
import { getProduct, getColorway, SHIPPING_FREE_ABOVE } from "@/lib/products";
import { ShirtGlyph } from "@/components/product/ShirtGlyph";
import { TLink } from "@/components/layout/TLink";

export default function CartPage() {
  const { lines, setQty, remove, setBuyNow } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const list = mounted ? lines : [];
  const s = summarize(list);
  const toFree = Math.max(0, SHIPPING_FREE_ABOVE - s.subtotal);

  return (
    <div className="page cart wrap">
      <header className="cart__head">
        <h1 className="display cart__title">
          Cart<span className="ember">({String(s.count).padStart(2, "0")})</span>
        </h1>
        <p className="mono ash">Your selection — held for this session</p>
      </header>

      {mounted && list.length === 0 ? (
        <div className="cart__empty">
          <p className="serif">Nothing here yet.</p>
          <p className="ash">Every piece in Drop 001 tells a story. Find yours.</p>
          <TLink href="/shop" label="SHOP" className="btn btn--ember">
            Explore the drop <span className="arrow">→</span>
          </TLink>
        </div>
      ) : (
        <div className="cart__grid">
          <ul className="cart__lines">
            {list.map((l, i) => {
              const p = getProduct(l.slug);
              if (!p) return null;
              const cw = getColorway(p, l.color);
              return (
                <li key={`${l.slug}-${l.color}-${l.size}`} className="line">
                  <TLink href={`/product/${p.slug}`} label={p.name} className="line__thumb" style={{ ["--tint" as string]: cw.fabric }}>
                    <ShirtGlyph cw={cw} label={p.name} />
                  </TLink>
                  <div className="line__info">
                    <span className="mono ash">{p.index}</span>
                    <TLink href={`/product/${p.slug}`} label={p.name} className="line__name display">
                      {p.name}
                    </TLink>
                    <span className="mono">
                      {cw.name} — Size {l.size}
                    </span>
                    <span className="ash line__unit">{formatINR(p.price)} each</span>
                  </div>
                  <div className="line__qty mono" aria-label="Quantity">
                    <button onClick={() => setQty(i, l.qty - 1)} aria-label="Decrease" disabled={l.qty <= 1}>
                      −
                    </button>
                    <span>{String(l.qty).padStart(2, "0")}</span>
                    <button onClick={() => setQty(i, l.qty + 1)} aria-label="Increase">
                      +
                    </button>
                  </div>
                  <span className="line__total display">{formatINR(lineTotal(l))}</span>
                  <button className="line__rm mono ash link-u" onClick={() => remove(i)}>
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>

          <aside className="sum">
            <p className="mono ember">(Summary)</p>
            {toFree > 0 ? (
              <div className="sum__ship">
                <p className="mono">Add {formatINR(toFree)} more for free shipping</p>
                <span className="sum__bar">
                  <span style={{ transform: `scaleX(${Math.min(1, s.subtotal / SHIPPING_FREE_ABOVE)})` }} />
                </span>
              </div>
            ) : (
              <p className="mono sum__free">✦ Free shipping unlocked</p>
            )}
            <dl className="sum__rows">
              <div>
                <dt>Subtotal</dt>
                <dd>{formatINR(s.subtotal)}</dd>
              </div>
              <div>
                <dt>Shipping</dt>
                <dd>{s.shipping === 0 ? "Free" : formatINR(s.shipping)}</dd>
              </div>
              <div className="sum__total">
                <dt>Total</dt>
                <dd className="display">{formatINR(s.total)}</dd>
              </div>
            </dl>
            <TLink href="/checkout" label="CHECKOUT" className="btn btn--ember btn--block" onClick={() => setBuyNow(null)}>
              Checkout <span className="arrow">→</span>
            </TLink>
            <TLink href="/shop" label="SHOP" className="btn btn--block">
              Keep shopping <span className="arrow">←</span>
            </TLink>
            <p className="mono ash sum__note">Taxes included. UPI, cards &amp; netbanking via Razorpay. 7-day size exchanges.</p>
          </aside>
        </div>
      )}
    </div>
  );
}
