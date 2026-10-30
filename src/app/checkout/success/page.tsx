"use client";

import { useEffect, useState } from "react";
import { getProduct, getColorway } from "@/lib/products";
import { formatINR, type CartLine } from "@/lib/cart";
import { ShirtGlyph } from "@/components/product/ShirtGlyph";
import { TLink } from "@/components/layout/TLink";

interface Order {
  orderId: string;
  paymentId: string;
  demo: boolean;
  items: CartLine[];
  total: number;
  name: string;
  email: string;
  city: string;
  at: number;
}

export default function Success() {
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("aure-last-order");
      setOrder(raw ? (JSON.parse(raw) as Order) : null);
    } catch {
      setOrder(null);
    }
  }, []);

  if (order === undefined) return <div className="page" />;
  if (order === null)
    return (
      <div className="page wrap ok">
        <h1 className="display ok__title">No recent order</h1>
        <TLink href="/shop" label="SHOP" className="btn btn--ember">
          Explore the drop <span className="arrow">→</span>
        </TLink>
      </div>
    );

  const first = order.name.split(" ")[0];
  return (
    <div className="page wrap ok">
      <div className="ok__burst" aria-hidden />
      <p className="mono ember">(Order confirmed{order.demo ? " — demo payment" : ""})</p>
      <h1 className="display ok__title">
        It&apos;s yours<span className="ember">,</span>
        <br />
        <span className="serif">{first || "friend"}.</span>
      </h1>
      <p className="ok__lead">
        Confirmation is on its way to <strong>{order.email}</strong>. Your pieces ship to {order.city} within 3–5 days.
      </p>

      <div className="ok__grid">
        <div className="ok__card">
          <dl className="sum__rows">
            <div>
              <dt>Order</dt>
              <dd className="mono">{order.orderId}</dd>
            </div>
            {!order.demo && (
              <div>
                <dt>Payment</dt>
                <dd className="mono">{order.paymentId}</dd>
              </div>
            )}
            <div>
              <dt>Placed</dt>
              <dd className="mono">{new Date(order.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</dd>
            </div>
            <div className="sum__total">
              <dt>Paid</dt>
              <dd className="display">{formatINR(order.total)}</dd>
            </div>
          </dl>
          <ul className="co__items">
            {order.items.map((l) => {
              const p = getProduct(l.slug);
              if (!p) return null;
              const cw = getColorway(p, l.color);
              return (
                <li key={`${l.slug}-${l.color}-${l.size}`}>
                  <span className="co__thumb" style={{ ["--tint" as string]: cw.fabric }}>
                    <ShirtGlyph cw={cw} label={p.name} />
                    <span className="co__q mono">{l.qty}</span>
                  </span>
                  <span className="co__meta">
                    <span className="display">{p.name}</span>
                    <span className="mono ash">
                      {cw.name} / {l.size}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <ol className="ok__next">
          {[
            ["Now", "Order received & payment secured."],
            ["24 h", "Your pieces are checked, folded and sealed."],
            ["3–5 days", "Delivered to your door, tracking by email."],
            ["After", "Wear what you mean. Tag us — we repost."],
          ].map(([t, d], i) => (
            <li key={t}>
              <span className="mono ember">0{i + 1}</span>
              <span className="mono">{t}</span>
              <span className="ash">{d}</span>
            </li>
          ))}
        </ol>
      </div>
      <TLink href="/shop" label="SHOP" className="btn">
        Keep exploring <span className="arrow">→</span>
      </TLink>
    </div>
  );
}
