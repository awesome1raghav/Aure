"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { PRODUCTS } from "@/lib/products";
import { ProductCard } from "@/components/product/ProductCard";

gsap.registerPlugin(ScrollTrigger);

/* ---------------- marquee ---------------- */
export function Marquee({ items, tone = "ember" }: { items: string[]; tone?: "ember" | "bone" }) {
  const row = [...items, ...items];
  return (
    <div className={`marq marq--${tone}`} aria-hidden>
      <div className="marq__track display">
        {[0, 1].map((k) => (
          <div className="marq__row" key={k}>
            {row.map((t, i) => (
              <span key={i}>
                {t}
                <i>✦</i>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- manifesto: words burn from ash to bone ---------------- */
const MANIFESTO =
  "AURE isn't a clothing brand. It's a *language.* For the ones who grew up quiet — who doubted the room, the voice, the reflection — and found their *confidence* in what they chose to wear. Fashion says where you stand before you say a word. So say it. *Unapologetically.*";

export function Manifesto() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".mani__w",
        { opacity: 0.14 },
        {
          opacity: 1,
          stagger: 0.05,
          ease: "none",
          scrollTrigger: { trigger: ".mani__text", start: "top 78%", end: "bottom 45%", scrub: 0.6 },
        },
      );
    }, root);
    return () => ctx.revert();
  }, []);

  const words = MANIFESTO.split(" ");
  return (
    <section className="mani wrap" id="manifesto" ref={root}>
      <div className="mani__side">
        <p className="mono ember">(Manifesto)</p>
        <p className="mono ash">AURE / 2026</p>
      </div>
      <p className="mani__text">
        {words.map((w, i) => {
          const hot = w.startsWith("*");
          const clean = w.replace(/\*/g, "");
          return (
            <span key={i} className={`mani__w ${hot ? "mani__w--hot serif" : ""}`}>
              {clean}{" "}
            </span>
          );
        })}
      </p>
      <div className="mani__note" data-reveal>
        <p className="serif">“I wasn&apos;t sure of myself for a long time. Then I watched artists wear their identity as loudly as they made their music — and realised clothes could say what I couldn&apos;t yet.”</p>
        <p className="mono ash">— Founder, AURE</p>
      </div>
    </section>
  );
}

/* ---------------- the drop ---------------- */
export function Drop() {
  return (
    <section className="drop" id="drop">
      <div className="drop__head wrap">
        <h2 className="display drop__title" data-reveal>
          Drop <span className="ember">001</span>
        </h2>
        <div className="drop__sub" data-reveal>
          <p className="serif">becoming</p>
          <p className="mono ash">
            ({String(PRODUCTS.length).padStart(2, "0")}) pieces — 240 GSM — garment dyed
            <br />
            Every piece rotates 360°, top &amp; bottom. Hover to make it move.
          </p>
        </div>
      </div>
      <div className="drop__grid wrap">
        {PRODUCTS.map((p, i) => (
          <ProductCard key={p.slug} product={p} i={i} />
        ))}
      </div>
    </section>
  );
}

/* ---------------- colour psychology ---------------- */
const COLOURS = [
  { name: "Ash", hex: "#8E8A83", stage: "01 — Before", text: "Doubt. Desaturated, cool, unsure of itself. Grey lowers arousal — it's the colour of holding back.", ink: "#0b0a09" },
  { name: "Bone", hex: "#EDE7DC", stage: "02 — Clarity", text: "Warm white reads honest and calm. Not clinical — lived in. The moment you see yourself clearly.", ink: "#0b0a09" },
  { name: "Ember", hex: "#FF4D1F", stage: "03 — Confidence", text: "Red-orange is the highest-energy hue we see. It raises the pulse and pulls the eye — so we only use it when it matters.", ink: "#0b0a09" },
  { name: "Carbon", hex: "#0B0A09", stage: "04 — Identity", text: "Black is authority and mystery. A warm black — never blue — so it feels like fabric, not a screen.", ink: "#EDE7DC" },
];

export function ColourLanguage() {
  const [open, setOpen] = useState(2);
  return (
    <section className="col wrap">
      <div className="col__head">
        <p className="mono ember">(Colour is a language)</p>
        <h2 className="display col__title" data-reveal>
          From ash <span className="serif">to</span> <span className="ember">ember.</span>
        </h2>
        <p className="col__lead ash" data-reveal>
          Every AURE colourway maps to a stage of the story — the same journey from self-doubt to standing in your own light.
        </p>
      </div>
      <div className="col__row">
        {COLOURS.map((c, i) => (
          <button
            key={c.name}
            className={`col__sw ${open === i ? "is-open" : ""}`}
            style={{ background: c.hex, color: c.ink }}
            onMouseEnter={() => setOpen(i)}
            onFocus={() => setOpen(i)}
            onClick={() => setOpen(i)}
            aria-expanded={open === i}
          >
            <span className="mono">{c.stage}</span>
            <span className="col__name display">{c.name}</span>
            <span className="col__text">{c.text}</span>
            <span className="mono col__hex">{c.hex}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ---------------- craft ---------------- */
const SPECS = [
  ["240", "GSM", "Heavyweight combed cotton jersey. Holds its shape, drapes like it means it."],
  ["02", "CM RIB", "Thick 1x1 rib collar, double-needle bound so it never waves out."],
  ["360", "°", "Every piece is viewable from every angle — top and bottom included."],
  ["IN", "MADE", "Cut & sewn in Tiruppur. Garment-dyed, so no two pieces are identical."],
];

export function Craft() {
  return (
    <section className="craft wrap">
      <div className="craft__l">
        <p className="mono ember">(Behind the garment)</p>
        <h2 className="display craft__title" data-reveal>
          Built to be <span className="outline">lived</span> in.
        </h2>
      </div>
      <div className="craft__grid">
        {SPECS.map(([big, unit, text], i) => (
          <div className="craft__cell" key={i} data-reveal style={{ transitionDelay: `${i * 0.08}s` }}>
            <p className="craft__big display">
              {big}
              <span className="mono ember">{unit}</span>
            </p>
            <p className="ash">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- inner circle ---------------- */
export function InnerCircle() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "error" | "done">("idle");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setState("error");
    setState("done");
  };
  return (
    <section className="circle">
      <div className="circle__inner wrap">
        <p className="mono">(Membership — coming later)</p>
        <h2 className="display circle__title" data-reveal>
          The inner <span className="serif">circle</span>
        </h2>
        <div className="circle__body">
          <p className="circle__lead">
            Limited drops sell out. Members hear first, get in first, and get the pieces nobody else will. Join the list now — membership opens after the first drop.
          </p>
          <form className="circle__form" onSubmit={submit} noValidate>
            {state === "done" ? (
              <p className="circle__done display">You&apos;re in.</p>
            ) : (
              <>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setState("idle");
                  }}
                  aria-label="Email address"
                  aria-invalid={state === "error"}
                />
                <button type="submit" className="btn">
                  Get early access <span className="arrow">→</span>
                </button>
                {state === "error" && <p className="mono">Enter a valid email.</p>}
              </>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
