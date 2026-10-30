"use client";

import { useState, type FormEvent } from "react";

const FAQ = [
  {
    id: "shipping",
    q: "Shipping",
    a: "Orders ship within 24–48 hours and arrive in 3–5 working days across India. Shipping is free above ₹2,999, otherwise ₹149. You get a tracking link by email the moment it leaves us.",
  },
  {
    id: "returns",
    q: "Returns & exchanges",
    a: "Wrong size? Exchange within 7 days of delivery — unworn, unwashed, tags on. Start an exchange with the form below and your order number. Limited-drop pieces are exchange-only.",
  },
  {
    id: "payments",
    q: "Payments",
    a: "We use Razorpay: UPI, all major cards, netbanking and wallets. Your payment details never touch our servers.",
  },
  {
    id: "sizing",
    q: "Sizing",
    a: "Everything is cut oversized with dropped shoulders. Take your usual size for the intended drape, or size down for a closer fit. Full measurements live on the size guide.",
  },
  {
    id: "care",
    q: "Care",
    a: "Cold wash inside out, line dry in shade, iron on reverse. Garment-dyed pieces soften and shift slightly with every wash — that's by design.",
  },
];

export default function Support() {
  const [open, setOpen] = useState<string>("shipping");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    if (!String(d.get("name")).trim() || !/^\S+@\S+\.\S+$/.test(String(d.get("email"))) || String(d.get("message")).trim().length < 6) {
      setErr("Add your name, a valid email and a short message.");
      return;
    }
    setErr("");
    setSent(true);
  };

  return (
    <div className="page wrap info">
      <p className="mono ember">(Support)</p>
      <h1 className="display info__title">
        We&apos;ve got <span className="serif">you.</span>
      </h1>
      <p className="info__lead ash">Real people, replies within 24 hours, Monday to Saturday.</p>

      <div className="info__split info__split--support">
        <div className="pdp__acc">
          {FAQ.map((f, i) => (
            <div key={f.id} id={f.id} className={`acc ${open === f.id ? "is-open" : ""}`}>
              <button className="acc__head" onClick={() => setOpen(open === f.id ? "" : f.id)} aria-expanded={open === f.id}>
                <span className="mono ash">0{i + 1}</span>
                <span className="acc__title">{f.q}</span>
                <span className="acc__icon" aria-hidden />
              </button>
              <div className="acc__body">
                <div>
                  <p>{f.a}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <form className="info__form" onSubmit={submit} noValidate>
          <p className="mono ember">Write to us</p>
          {sent ? (
            <p className="serif info__sent">Got it. We&apos;ll be in touch within a day.</p>
          ) : (
            <>
              <div className="field">
                <label htmlFor="s-name">Name</label>
                <input id="s-name" name="name" autoComplete="name" />
              </div>
              <div className="field">
                <label htmlFor="s-email">Email</label>
                <input id="s-email" name="email" type="email" autoComplete="email" />
              </div>
              <div className="field">
                <label htmlFor="s-order">Order number (optional)</label>
                <input id="s-order" name="order" placeholder="AURE-…" />
              </div>
              <div className="field">
                <label htmlFor="s-msg">Message</label>
                <textarea id="s-msg" name="message" />
              </div>
              {err && <p className="mono pdp__err">{err}</p>}
              <button className="btn btn--ember btn--block" type="submit">
                Send message <span className="arrow">→</span>
              </button>
              <p className="mono ash">Prototype: messages aren&apos;t delivered yet — connect an email service before launch.</p>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
