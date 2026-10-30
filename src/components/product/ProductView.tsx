"use client";

import { useEffect, useRef, useState } from "react";
import { ShirtStage } from "@/components/three/ShirtStage";
import { SpinController, type View } from "@/three/controller";
import { PRODUCTS, getProduct, SHIPPING_FREE_ABOVE } from "@/lib/products";
import { formatINR, useCart } from "@/lib/cart";
import { useUI } from "@/lib/ui";
import { TLink } from "@/components/layout/TLink";
import { SizeTable } from "./SizeTable";

const VIEWS: { id: View; label: string }[] = [
  { id: "front", label: "Front" },
  { id: "back", label: "Back" },
  { id: "side", label: "Side" },
  { id: "top", label: "Top" },
  { id: "bottom", label: "Bottom" },
];

export function ProductView({ slug }: { slug: string }) {
  const product = getProduct(slug)!;
  const idx = PRODUCTS.findIndex((p) => p.slug === slug);
  const next = PRODUCTS[(idx + 1) % PRODUCTS.length];
  const controller = useRef(new SpinController({ autoSpeed: 0.3, yaw: -0.4 })).current;

  const [cwId, setCwId] = useState(product.colorways[0].id);
  const cw = product.colorways.find((c) => c.id === cwId) ?? product.colorways[0];
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const [guide, setGuide] = useState(false);
  const [open, setOpen] = useState<number>(0);
  const [view, setView] = useState<View | null>(null);
  const add = useCart((s) => s.add);
  const setBuyNow = useCart((s) => s.setBuyNow);

  // live physics readouts
  const rpm = useRef<HTMLSpanElement>(null);
  const tilt = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (rpm.current) rpm.current.textContent = controller.rpm.toFixed(1).padStart(4, "0");
      if (tilt.current) {
        const d = Math.round((controller.pitch * 180) / Math.PI);
        tilt.current.textContent = (d >= 0 ? "+" : "−") + String(Math.abs(d)).padStart(2, "0") + "°";
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [controller]);

  useEffect(() => {
    if (!guide) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setGuide(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [guide]);

  const goView = (v: View) => {
    setView(v);
    controller.goTo(v);
  };

  const requireSize = () => {
    if (size) return true;
    setSizeError(true);
    document.querySelector(".pdp__sizes")?.animate(
      [{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "translateX(0)" }],
      { duration: 360 },
    );
    return false;
  };

  const onAdd = () => {
    if (!requireSize()) return;
    add({ slug, color: cw.id, size: size!, qty });
    controller.impulse(4);
    useUI.getState().showToast({ title: "Added to cart", detail: `${product.name} — ${cw.name} / ${size} × ${qty}`, swatch: cw.fabric });
  };

  const onBuy = () => {
    if (!requireSize()) return;
    setBuyNow({ slug, color: cw.id, size: size!, qty });
    useUI.getState().go("/checkout?mode=now", "CHECKOUT");
  };

  const sections = [
    { title: "The story", body: <p>{product.story}</p> },
    { title: "Inspiration", body: <p>{product.inspiration}</p> },
    {
      title: "Fabric & construction",
      body: (
        <dl className="pdp__spec">
          {product.fabric.map((f) => (
            <div key={f.label}>
              <dt className="mono ash">{f.label}</dt>
              <dd>{f.value}</dd>
            </div>
          ))}
        </dl>
      ),
    },
    {
      title: "Fit & care",
      body: (
        <>
          <p>{product.fit}</p>
          <ul className="pdp__care mono">
            {product.care.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </>
      ),
    },
  ];

  return (
    <div className="pdp page">
      <section className="pdp__viewer" style={{ ["--tint" as string]: cw.fabric, ["--accent" as string]: cw.accent }}>
        <div className="pdp__bgword display" aria-hidden>
          {product.name}
        </div>
        <div className="pdp__glow" aria-hidden />
        <div className="pdp__canvas">
          <ShirtStage print={product.print} colorway={cw} controller={controller} mode="product" />
        </div>
        <div className="pdp__hud pdp__hud--tl mono">
          <span>
            {product.index} <span className="ash">/ 00{PRODUCTS.length}</span>
          </span>
          <span className="ash">360° viewer — drag to spin · drag up/down for top &amp; bottom · double-click to zoom</span>
        </div>
        <div className="pdp__hud pdp__hud--tr mono">
          <span>
            <span className="ash">Spin</span> <span ref={rpm}>00.0</span> rpm
          </span>
          <span>
            <span className="ash">Tilt</span> <span ref={tilt}>+00°</span>
          </span>
          <span className="ash">Cloth sim · live</span>
        </div>
        <div className="pdp__views" role="toolbar" aria-label="Camera views">
          {VIEWS.map((v) => (
            <button key={v.id} className={`pdp__view mono ${view === v.id ? "is-on" : ""}`} onClick={() => goView(v.id)}>
              {v.label}
            </button>
          ))}
          <button
            className="pdp__view mono pdp__view--spin"
            onClick={() => {
              setView(null);
              controller.release();
              controller.impulse(6);
            }}
          >
            Spin ↻
          </button>
        </div>
      </section>

      <section className="pdp__info wrap">
        <nav className="pdp__crumbs mono ash" aria-label="Breadcrumb">
          <TLink href="/shop" label="SHOP" className="link-u">
            Shop
          </TLink>{" "}
          /{" "}
          <TLink href="/#drop" label="DROP 001" className="link-u">
            Drop 001
          </TLink>{" "}
          / <span className="ember">{product.name}</span>
        </nav>

        <h1 className="pdp__name display">{product.name}</h1>
        <p className="pdp__type mono">{product.type}</p>
        <p className="pdp__tag serif">{product.tagline}</p>
        <p className="pdp__price display">{formatINR(product.price)}</p>
        <p className="mono ash">Incl. of all taxes · Free shipping above {formatINR(SHIPPING_FREE_ABOVE)}</p>

        <div className="pdp__block">
          <div className="pdp__label mono">
            <span>Colourway</span>
            <span className="ash">{cw.name}</span>
          </div>
          <div className="pdp__swatches">
            {product.colorways.map((c) => (
              <button
                key={c.id}
                className={`pdp__swatch ${c.id === cw.id ? "is-on" : ""}`}
                onClick={() => {
                  setCwId(c.id);
                  if (c.id !== cw.id) controller.impulse(3.6);
                }}
                aria-pressed={c.id === cw.id}
                aria-label={c.name}
              >
                <span style={{ background: c.fabric }} />
                <span className="mono">{c.name}</span>
              </button>
            ))}
          </div>
          <p className="pdp__meaning serif">“{cw.meaning}”</p>
        </div>

        <div className="pdp__block">
          <div className="pdp__label mono">
            <span>Size</span>
            <button className="link-u ember" onClick={() => setGuide(true)}>
              Size guide
            </button>
          </div>
          <div className="pdp__sizes" role="radiogroup" aria-label="Size">
            {product.sizes.map((s) => {
              const out = product.soldOut?.includes(s);
              return (
                <button
                  key={s}
                  role="radio"
                  aria-checked={size === s}
                  disabled={out}
                  className={`pdp__size mono ${size === s ? "is-on" : ""} ${out ? "is-out" : ""}`}
                  onClick={() => {
                    setSize(s);
                    setSizeError(false);
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
          {sizeError && <p className="pdp__err mono">Pick a size first.</p>}
        </div>

        <div className="pdp__block pdp__buy">
          <div className="pdp__qty mono" aria-label="Quantity">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">
              −
            </button>
            <span>{String(qty).padStart(2, "0")}</span>
            <button onClick={() => setQty((q) => Math.min(10, q + 1))} aria-label="Increase">
              +
            </button>
          </div>
          <button className="btn pdp__add" onClick={onAdd}>
            Add to cart <span className="arrow">+</span>
          </button>
          <button className="btn btn--ember btn--block pdp__now" onClick={onBuy}>
            Buy now — {formatINR(product.price * qty)} <span className="arrow">→</span>
          </button>
        </div>

        <ul className="pdp__perks mono ash">
          <li>Ships in 3–5 days across India</li>
          <li>7-day size exchanges</li>
          <li>UPI · Cards · Netbanking via Razorpay</li>
        </ul>

        <div className="pdp__acc">
          {sections.map((s, i) => (
            <div key={s.title} className={`acc ${open === i ? "is-open" : ""}`}>
              <button className="acc__head" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
                <span className="mono ash">0{i + 1}</span>
                <span className="acc__title">{s.title}</span>
                <span className="acc__icon" aria-hidden />
              </button>
              <div className="acc__body">
                <div>{s.body}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <TLink href={`/product/${next.slug}`} label={next.name} className="pdp__next wrap">
        <span className="mono ash">Next piece — {next.index}</span>
        <span className="display pdp__nextname">
          {next.name} <span className="ember">→</span>
        </span>
      </TLink>

      <div className={`modal ${guide ? "modal--on" : ""}`} aria-hidden={!guide} onClick={() => setGuide(false)}>
        <div className="modal__panel" role="dialog" aria-modal="true" aria-label="Size guide" onClick={(e) => e.stopPropagation()}>
          <div className="modal__head">
            <h2 className="display">Size guide</h2>
            <button className="mono" onClick={() => setGuide(false)}>
              Close ✕
            </button>
          </div>
          <SizeTable highlight={size ?? undefined} />
        </div>
      </div>
    </div>
  );
}
