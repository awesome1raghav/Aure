"use client";

import { useEffect, useRef, useState } from "react";

const LABELS: Record<string, string> = { drag: "Drag", view: "View" };

/** Follower ring with contextual labels. Fine pointers only. */
export function Cursor() {
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState("");
  const [hover, setHover] = useState(false);
  const [down, setDown] = useState(false);

  useEffect(() => {
    setEnabled(window.matchMedia("(pointer: fine)").matches);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let x = -100;
    let y = -100;
    let rx = x;
    let ry = y;
    let raf = 0;
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      const t = e.target as HTMLElement;
      const c = t.closest<HTMLElement>("[data-cursor]");
      const key = c?.dataset.cursor ?? "";
      setLabel(LABELS[key] ?? "");
      setHover(!!t.closest("a, button, [role=button], label, select, input"));
    };
    const loop = () => {
      rx += (x - rx) * 0.18;
      ry += (y - ry) * 0.18;
      if (ring.current) ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      if (dot.current) dot.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    const d = () => setDown(true);
    const u = () => setDown(false);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", d);
    window.addEventListener("pointerup", u);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", d);
      window.removeEventListener("pointerup", u);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <>
      <div ref={ring} className={`cur ${label ? "cur--label" : ""} ${hover && !label ? "cur--hover" : ""} ${down ? "cur--down" : ""}`} aria-hidden>
        <span className="cur__ring">
          <span className="mono">{label}</span>
        </span>
      </div>
      <div ref={dot} className="cur-dot" aria-hidden />
    </>
  );
}
