"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { useUI } from "@/lib/ui";
import { getLenis } from "@/lib/scroll";

/**
 * First-visit loader. The counter is tied to real readiness (fonts + the hero
 * garment's first painted frame) with a minimum duration so it always feels deliberate.
 */
export function Preloader() {
  const pathname = usePathname();
  const root = useRef<HTMLDivElement>(null);
  const ember = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [pct, setPct] = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const quick = sessionStorage.getItem("aure-seen") === "1";
    if (quick) {
      // already seen this session: just fade out
      useUI.getState().setLoaded();
      gsap.to(root.current, { opacity: 0, duration: 0.45, delay: 0.1, ease: "power2.out", onComplete: () => setGone(true) });
      return;
    }
    const minDur = 2800;
    const start = performance.now();
    let fontsReady = false;
    document.fonts.ready.then(() => (fontsReady = true));
    document.documentElement.classList.add("is-loading");
    getLenis()?.stop();

    let raf = 0;
    let shown = 0;
    let done = false;
    let last = start;
    const needScene = pathname === "/";

    const finish = () => {
      done = true;
      sessionStorage.setItem("aure-seen", "1");
      const tl = gsap.timeline({
        onComplete: () => {
          document.documentElement.classList.remove("is-loading");
          getLenis()?.start();
          setGone(true);
        },
      });
      tl.to(inner.current, { yPercent: -8, opacity: 0, duration: 0.55, ease: "power3.in" })
        .fromTo(ember.current, { yPercent: 100 }, { yPercent: 0, duration: 0.6, ease: "power4.inOut" }, "-=0.2")
        .add(() => useUI.getState().setLoaded())
        .to(root.current, { yPercent: -100, duration: 0.95, ease: "power4.inOut" }, "+=0.05");
    };

    const loop = (now: number) => {
      const elapsed = now - start;
      const tp = Math.min(1, elapsed / minDur);
      const sceneOk = !needScene || useUI.getState().sceneReady;
      const ready = (fontsReady && sceneOk) || elapsed > 8000;
      const cap = ready ? 1 : 0.2 + (fontsReady ? 0.35 : 0) + (sceneOk ? 0.35 : 0);
      const target = Math.min(tp, cap);
      const dt = Math.min(0.5, (now - last) / 1000);
      last = now;
      shown += (target - shown) * (1 - Math.exp(-dt * 9));
      if (target >= 1 && shown > 0.985) shown = 1;
      setPct(Math.floor(shown * 100));
      if (shown >= 1 && !done) finish();
      else if (!done) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (gone) return null;
  const letters = ["A", "U", "R", "E"];
  return (
    <div className="pre" ref={root} aria-hidden>
      <div className="pre__inner" ref={inner}>
        <div className="pre__top mono">
          <span>AURE® — Drop 001 / Becoming</span>
          <span className="ash">Loading the experience</span>
        </div>
        <div className="pre__word display">
          {letters.map((l, i) => (
            <span key={l} className="pre__clip">
              <span style={{ transform: `translateY(${pct > i * 22 + 8 ? 0 : 105}%)` }}>{l}</span>
            </span>
          ))}
        </div>
        <div className="pre__bottom">
          <div className="pre__count display">
            {String(pct).padStart(3, "0")}
            <span className="ember">%</span>
          </div>
          <p className="pre__tag">
            <span className="serif">wear what you mean.</span>
            <span className="mono ash">Self-expression, made physical</span>
          </p>
        </div>
        <div className="pre__bar">
          <span style={{ transform: `scaleX(${pct / 100})` }} />
        </div>
      </div>
      <div className="pre__ember" ref={ember} />
    </div>
  );
}
