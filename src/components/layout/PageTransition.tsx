"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import { useUI } from "@/lib/ui";
import { getLenis, scrollToTarget } from "@/lib/scroll";

/** Two-panel curtain (ember, then carbon) with the destination's name. */
export function PageTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const transition = useUI((s) => s.transition);
  const ember = useRef<HTMLDivElement>(null);
  const carbon = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const pending = useRef<string | null>(null);
  const covered = useRef(false);

  useEffect(() => {
    if (!transition) return;
    pending.current = transition.href;
    covered.current = false;
    getLenis()?.stop();
    const tl = gsap.timeline();
    tl.set([ember.current, carbon.current], { yPercent: 100, visibility: "visible" })
      .set(label.current, { opacity: 0, y: 40 })
      .to(ember.current, { yPercent: 0, duration: 0.55, ease: "power4.inOut" })
      .to(carbon.current, { yPercent: 0, duration: 0.6, ease: "power4.inOut" }, "-=0.42")
      .to(label.current, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, "-=0.2")
      .add(() => {
        covered.current = true;
        router.push(transition.href);
      });
    return () => {
      tl.kill();
    };
  }, [transition, router]);

  useEffect(() => {
    if (!pending.current) return;
    const href = pending.current;
    const reveal = () => {
      pending.current = null;
      const lenis = getLenis();
      lenis?.start();
      lenis?.scrollTo(0, { immediate: true, force: true });
      window.scrollTo(0, 0);
      lenis?.resize();
      const hash = href.split("#")[1];
      const tl = gsap.timeline({
        onComplete: () => {
          gsap.set([ember.current, carbon.current], { visibility: "hidden" });
          useUI.getState().endTransition();
          if (hash) {
            const el = document.getElementById(hash);
            if (el) scrollToTarget(el);
          }
        },
      });
      tl.to(label.current, { opacity: 0, y: -30, duration: 0.3, ease: "power2.in" })
        .to(carbon.current, { yPercent: -100, duration: 0.85, ease: "power4.inOut" }, "-=0.05")
        .to(ember.current, { yPercent: -100, duration: 0.8, ease: "power4.inOut" }, "-=0.68");
    };
    // wait until the cover finished before revealing the new page
    const wait = () => (covered.current ? setTimeout(reveal, 120) : setTimeout(wait, 40));
    wait();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div className="pt" aria-hidden>
      <div className="pt__panel pt__panel--ember" ref={ember} />
      <div className="pt__panel pt__panel--carbon" ref={carbon}>
        <div className="pt__label" ref={label}>
          <span className="mono ash">Entering</span>
          <span className="display">{transition?.label || "AURE"}</span>
        </div>
      </div>
    </div>
  );
}
