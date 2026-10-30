"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useCart, summarize, lineTotal, formatINR, type CartLine } from "@/lib/cart";
import { getProduct, getColorway } from "@/lib/products";
import { ShirtGlyph } from "@/components/product/ShirtGlyph";
import { TLink } from "@/components/layout/TLink";
import { useUI } from "@/lib/ui";

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jammu & Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Madhya Pradesh", "Maharashtra",
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman & Nicobar", "Chandigarh",
  "Dadra & Nagar Haveli and Daman & Diu", "Lakshadweep",
];

type Form = { email: string; phone: string; name: string; line1: string; line2: string; city: string; state: string; pin: string };
const EMPTY: Form = { email: "", phone: "", name: "", line1: "", line2: "", city: "", state: "", pin: "" };

function validate(f: Form) {
  const e: Partial<Record<keyof Form, string>> = {};
  if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Enter a valid email";
  if (!/^[6-9]\d{9}$/.test(f.phone.replace(/\D/g, "").slice(-10))) e.phone = "Enter a 10-digit mobile number";
  if (f.name.trim().length < 2) e.name = "Enter your full name";
  if (f.line1.trim().length < 4) e.line1 = "Enter your address";
  if (f.city.trim().length < 2) e.city = "Enter your city";
  if (!f.state) e.state = "Choose a state";
  if (!/^[1-9]\d{5}$/.test(f.pin)) e.pin = "Enter a 6-digit PIN code";
  return e;
}

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (ev: string, cb: (r: unknown) => void) => void };
  }
}

function loadRazorpay() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function CheckoutView() {
  const params = useSearchParams();
  const now = params.get("mode") === "now";
  const { lines, buyNow, clear, setBuyNow } = useCart();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [frozen, setFrozen] = useState<CartLine[] | null>(null);
  const live: CartLine[] = useMemo(() => (!mounted ? [] : now && buyNow ? [buyNow] : lines), [mounted, now, buyNow, lines]);
  const items = frozen ?? live;
  const s = summarize(items);

  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<"idle" | "paying" | "error">("idle");
  const [message, setMessage] = useState("");

  const set = (k: keyof Form) => (e: { target: { value: string } }) => {
    const next = { ...form, [k]: e.target.value };
    setForm(next);
    if (touched) setErrors(validate(next));
  };

  const finish = (orderId: string, paymentId: string, demo: boolean) => {
    sessionStorage.setItem(
      "aure-last-order",
      JSON.stringify({ orderId, paymentId, demo, items, total: s.total, name: form.name, email: form.email, city: form.city, at: Date.now() }),
    );
    setFrozen(items);
    if (now) setBuyNow(null);
    else clear();
    useUI.getState().go(`/checkout/success`, "CONFIRMED");
  };

  const pay = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.querySelector(".co [aria-invalid='true']")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setStatus("paying");
    setMessage("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, customer: form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start payment");

      if (data.mode === "demo") {
        await new Promise((r) => setTimeout(r, 1800));
        finish(data.orderId, "demo", true);
        return;
      }

      const ok = await loadRazorpay();
      if (!ok || !window.Razorpay) throw new Error("Couldn't load Razorpay. Check your connection.");
      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        order_id: data.orderId,
        name: "AURE",
        description: `Drop 001 — ${s.count} piece${s.count > 1 ? "s" : ""}`,
        prefill: { name: form.name, email: form.email, contact: form.phone },
        notes: { city: form.city },
        theme: { color: "#FF4D1F", backdrop_color: "#0B0A09" },
        handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const v = await fetch("/api/checkout/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(r) });
          if (v.ok) finish(r.razorpay_order_id, r.razorpay_payment_id, false);
          else {
            setStatus("error");
            setMessage("Payment could not be verified. If money was deducted, contact support with your payment ID: " + r.razorpay_payment_id);
          }
        },
        modal: { ondismiss: () => setStatus("idle") },
      });
      rzp.on("payment.failed", () => {
        setStatus("error");
        setMessage("Payment failed. No money was taken — try again or use another method.");
      });
      rzp.open();
    } catch (err) {
      setStatus("error");
      setMessage((err as Error).message);
    }
  };

  if (mounted && items.length === 0) {
    return (
      <div className="page wrap co co--empty">
        <h1 className="display co__title">Checkout</h1>
        <p className="serif">Your cart is empty.</p>
        <TLink href="/shop" label="SHOP" className="btn btn--ember">
          Explore the drop <span className="arrow">→</span>
        </TLink>
      </div>
    );
  }

  const field = (k: keyof Form, label: string, props: Record<string, unknown> = {}) => (
    <div className="field">
      <label htmlFor={`co-${k}`}>{label}</label>
      <input id={`co-${k}`} value={form[k]} onChange={set(k)} aria-invalid={!!errors[k]} {...props} />
      {errors[k] && <span className="err">{errors[k]}</span>}
    </div>
  );

  return (
    <div className="page wrap co">
      <header className="co__head">
        <h1 className="display co__title">Checkout</h1>
        <ol className="co__steps mono">
          <li className="is-on">01 Contact</li>
          <li className="is-on">02 Delivery</li>
          <li>03 Payment</li>
        </ol>
      </header>

      <form className="co__grid" onSubmit={pay} noValidate>
        <div className="co__form">
          <fieldset>
            <legend className="mono ember">01 — Contact</legend>
            <div className="co__row">
              {field("email", "Email", { type: "email", autoComplete: "email", placeholder: "you@email.com" })}
              {field("phone", "Mobile", { type: "tel", autoComplete: "tel", inputMode: "numeric", placeholder: "98XXXXXXXX" })}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mono ember">02 — Delivery</legend>
            {field("name", "Full name", { autoComplete: "name" })}
            {field("line1", "Address", { autoComplete: "address-line1", placeholder: "House / flat, street" })}
            {field("line2", "Area / landmark (optional)", { autoComplete: "address-line2" })}
            <div className="co__row co__row--3">
              {field("city", "City", { autoComplete: "address-level2" })}
              <div className="field">
                <label htmlFor="co-state">State</label>
                <select id="co-state" value={form.state} onChange={set("state")} aria-invalid={!!errors.state}>
                  <option value="">Select</option>
                  {STATES.map((st) => (
                    <option key={st}>{st}</option>
                  ))}
                </select>
                {errors.state && <span className="err">{errors.state}</span>}
              </div>
              {field("pin", "PIN code", { inputMode: "numeric", maxLength: 6, autoComplete: "postal-code" })}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mono ember">03 — Payment</legend>
            <div className="co__pay">
              <p>UPI, cards, netbanking &amp; wallets — secured by Razorpay. You&apos;ll confirm the payment in the next step.</p>
              <p className="mono ash">Prototype: without Razorpay keys this runs a demo payment — no money moves.</p>
            </div>
          </fieldset>
        </div>

        <aside className="sum co__sum">
          <p className="mono ember">({now ? "Buy now" : "Order"})</p>
          <ul className="co__items">
            {items.map((l) => {
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
                  <span className="mono">{formatINR(lineTotal(l))}</span>
                </li>
              );
            })}
          </ul>
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
          <button type="submit" className="btn btn--ember btn--block" disabled={status === "paying" || items.length === 0}>
            {status === "paying" ? "Processing…" : `Pay ${formatINR(s.total)}`} <span className="arrow">→</span>
          </button>
          {message && <p className="co__msg mono">{message}</p>}
          <p className="mono ash sum__note">By paying you agree to our shipping &amp; exchange policy.</p>
        </aside>
      </form>

      {status === "paying" && (
        <div className="co__overlay" aria-live="polite">
          <span className="co__spinner" />
          <p className="mono">Securing your pieces…</p>
        </div>
      )}
    </div>
  );
}
