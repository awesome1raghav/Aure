import type Lenis from "lenis";

let instance: Lenis | null = null;

export function setLenis(l: Lenis | null) {
  instance = l;
}

export function getLenis() {
  return instance;
}

export function scrollToTarget(target: string | number | HTMLElement, immediate = false) {
  if (instance) {
    instance.scrollTo(target, { immediate, offset: typeof target === "number" ? 0 : -70, duration: 1.4 });
    return;
  }
  if (typeof target === "number") window.scrollTo({ top: target, behavior: immediate ? "auto" : "smooth" });
  else if (typeof target === "string") document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
  else target.scrollIntoView({ behavior: "smooth" });
}
