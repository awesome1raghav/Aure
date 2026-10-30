"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { TLink } from "./TLink";
import { useCart, summarize } from "@/lib/cart";
import { useUI } from "@/lib/ui";

function useClock() {
  const [t, setT] = useState("");
  useEffect(() => {
    const fmt = () =>
      new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date());
    setT(fmt());
    const id = setInterval(() => setT(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

const NAV = [
  { href: "/shop", label: "Shop", curtain: "SHOP" },
  { href: "/#drop", label: "Drop 001", curtain: "DROP 001" },
  { href: "/#manifesto", label: "Manifesto", curtain: "MANIFESTO" },
  { href: "/support", label: "Support", curtain: "SUPPORT" },
];

export function Header() {
  const pathname = usePathname();
  const lines = useCart((s) => s.lines);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuOpen = useUI((s) => s.menuOpen);
  const setMenu = useUI((s) => s.setMenu);
  const clock = useClock();
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const count = mounted ? summarize(lines).count : 0;

  return (
    <>
      <header className={`hdr ${scrolled ? "hdr--scrolled" : ""}`}>
        <TLink href="/" label="AURE" className="hdr__logo display" aria-label="AURE home">
          AURE<sup className="mono">®</sup>
        </TLink>
        <nav className="hdr__nav mono" aria-label="Main">
          {NAV.map((n, i) => (
            <TLink key={n.href} href={n.href} label={n.curtain} className={`link-u ${pathname === n.href ? "is-active" : ""}`}>
              <span className="ash">0{i + 1}</span> {n.label}
            </TLink>
          ))}
        </nav>
        <div className="hdr__right mono">
          <span className="hdr__clock ash" suppressHydrationWarning>
            IN — {clock} IST
          </span>
          <TLink href="/cart" label="CART" className="hdr__cart" data-cursor="">
            Cart <span className="hdr__count">{String(count).padStart(2, "0")}</span>
          </TLink>
          <button className="hdr__burger" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenu(!menuOpen)}>
            <span />
            <span />
          </button>
        </div>
      </header>
      <div className={`menu ${menuOpen ? "menu--open" : ""}`} aria-hidden={!menuOpen}>
        <nav className="menu__nav">
          {[{ href: "/", label: "Home", curtain: "AURE" }, ...NAV, { href: "/cart", label: "Cart", curtain: "CART" }].map((n, i) => (
            <TLink key={n.href} href={n.href} label={n.curtain} className="menu__link display" style={{ transitionDelay: `${menuOpen ? 0.08 + i * 0.05 : 0}s` }}>
              <span className="mono ash">0{i + 1}</span>
              {n.label}
            </TLink>
          ))}
        </nav>
        <p className="menu__foot mono ash">Wear what you mean — AURE® {new Date().getFullYear()}</p>
      </div>
    </>
  );
}
