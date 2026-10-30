"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ShirtStage } from "@/components/three/ShirtStage";
import { SpinController } from "@/three/controller";
import { PRODUCTS } from "@/lib/products";
import { formatINR } from "@/lib/cart";
import { useUI } from "@/lib/ui";
import { TLink } from "@/components/layout/TLink";

export function Hero() {
  const controller = useRef(new SpinController({ autoSpeed: 0.38, yaw: -0.5 })).current;
  const [active, setActive] = useState(0);
  const product = PRODUCTS[active];
  const colorway = product.colorways[0];
  const loaded = useUI((s) => s.loaded);
  const root = useRef<HTMLElement>(null);
  const rpm = useRef<HTMLSpanElement>(null);

  // live spin readout — the physics, made visible
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      if (rpm.current) rpm.current.textContent = controller.rpm.toFixed(1).padStart(4, "0");
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [controller]);

  useEffect(() => {
    if (!loaded || !root.current) return;
    const q = gsap.utils.selector(root.current);
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
    tl.fromTo(q(".hero__giant span"), { yPercent: 110 }, { yPercent: 0, duration: 1.4, stagger: 0.08 })
      .fromTo(q(".hero__stage-in"), { opacity: 0, scale: 0.86, y: 60 }, { opacity: 1, scale: 1, y: 0, duration: 1.6 }, 0.15)
      .fromTo(q("[data-hero-in]"), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1, stagger: 0.06 }, 0.5)
      .add(() => controller.impulse(4.5), 0.4);
    return () => {
      tl.kill();
    };
  }, [loaded, controller]);

  const pick = (i: number) => {
    if (i === active) return;
    setActive(i);
    controller.impulse(i > active ? 5 : -5);
  };

  return (
    <section className="hero" ref={root}>
      <div className="hero__glow" aria-hidden style={{ ["--glow" as string]: colorway.accent }} />
      <h1 className="hero__giant display" aria-label="AURE">
        {"AURE".split("").map((l, i) => (
          <span key={i} className={i === 3 ? "outline" : ""}>
            {l}
          </span>
        ))}
      </h1>

      <div className="hero__stage">
        <div className="hero__stage-in">
        <ShirtStage
          print={product.print}
          colorway={colorway}
          controller={controller}
          mode="hero"
          onReady={() => useUI.getState().setSceneReady()}
        />
        </div>
      </div>

      <div className="hero__tl mono" data-hero-in>
        <span>Drop 001 — Becoming</span>
        <span className="ash">Four pieces. One story.</span>
      </div>

      <div className="hero__tr mono" data-hero-in>
        <span className="ash">Physics live</span>
        <span>
          <span ref={rpm}>00.0</span> RPM
        </span>
        <span className="hero__drag">← Drag to spin →</span>
      </div>

      <div className="hero__copy" data-hero-in>
        <p className="hero__line">
          <span className="serif">self-doubt is a</span>
          <br />
          <span className="display">rough draft.</span>
        </p>
        <TLink href="/#drop" className="btn btn--ember hero__cta" label="DROP 001">
          Enter the drop <span className="arrow">↓</span>
        </TLink>
      </div>

      <div className="hero__card" data-hero-in>
        <div className="hero__pick" role="tablist" aria-label="Choose a piece">
          {PRODUCTS.map((p, i) => (
            <button
              key={p.slug}
              role="tab"
              aria-selected={i === active}
              className={`hero__chip ${i === active ? "is-on" : ""}`}
              onClick={() => pick(i)}
              style={{ ["--sw" as string]: p.colorways[0].fabric }}
            >
              <span className="hero__sw" />
              <span className="mono">{p.index}</span>
            </button>
          ))}
        </div>
        <TLink href={`/product/${product.slug}`} label={product.name} className="hero__piece">
          <span className="mono ash">
            {product.index} / {product.type}
          </span>
          <span className="hero__name display">{product.name}</span>
          <span className="hero__meta mono">
            {formatINR(product.price)} — View piece <span className="ember">→</span>
          </span>
        </TLink>
      </div>

      <div className="hero__scroll mono ash" data-hero-in>
        <span>Scroll</span>
        <span className="hero__scroll-line" />
      </div>
    </section>
  );
}
