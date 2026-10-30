import { NextResponse } from "next/server";
import { getProduct, SHIPPING_FEE, SHIPPING_FREE_ABOVE } from "@/lib/products";

interface Item {
  slug: string;
  color: string;
  size: string;
  qty: number;
}

/**
 * Creates a payment order. Prices are always recomputed here from the catalogue —
 * never trusted from the browser. With Razorpay keys in .env.local this creates a
 * real Razorpay order (test or live, depending on the keys); without them it
 * returns a demo order so the flow can be tried end to end.
 */
export async function POST(req: Request) {
  let body: { items?: Item[]; customer?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0 || items.length > 20) return NextResponse.json({ error: "Your cart is empty" }, { status: 400 });

  let subtotal = 0;
  for (const it of items) {
    const p = getProduct(String(it.slug));
    const qty = Number(it.qty);
    if (!p) return NextResponse.json({ error: "A piece in your cart no longer exists" }, { status: 400 });
    if (!p.colorways.some((c) => c.id === it.color)) return NextResponse.json({ error: `${p.name}: colourway unavailable` }, { status: 400 });
    if (!p.sizes.includes(it.size) || p.soldOut?.includes(it.size)) return NextResponse.json({ error: `${p.name}: size ${it.size} is sold out` }, { status: 400 });
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
    subtotal += p.price * qty;
  }
  const shipping = subtotal >= SHIPPING_FREE_ABOVE ? 0 : SHIPPING_FEE;
  const total = subtotal + shipping;
  const receipt = `AURE-${Date.now().toString(36).toUpperCase()}`;

  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !secret) {
    return NextResponse.json({ mode: "demo", orderId: receipt, amount: total * 100, currency: "INR" });
  }

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(`${keyId}:${secret}`).toString("base64"),
    },
    body: JSON.stringify({
      amount: total * 100, // paise
      currency: "INR",
      receipt,
      notes: { items: items.map((i) => `${i.slug}/${i.color}/${i.size}x${i.qty}`).join(", ").slice(0, 250) },
    }),
  });
  if (!res.ok) {
    return NextResponse.json({ error: "Payment provider unavailable. Please try again." }, { status: 502 });
  }
  const order = (await res.json()) as { id: string; amount: number; currency: string };
  return NextResponse.json({ mode: "razorpay", keyId, orderId: order.id, amount: order.amount, currency: order.currency });
}
