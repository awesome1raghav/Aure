"use client";

import { useState, type FormEvent } from "react";
import { TLink } from "./TLink";
import { PRODUCTS } from "@/lib/products";

export function Footer() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return;
    setDone(true);
  };

  return (
    <footer className="ftr">
      <div className="ftr__grid wrap">
        <div className="ftr__col ftr__col--lead">
          <p className="ftr__lead">
            Clothes are the first sentence <span className="serif">you say</span> before you speak.
          </p>
          <form className="ftr__form" onSubmit={submit}>
            {done ? (
              <p className="mono">You&apos;re on the list. Watch for the signal.</p>
            ) : (
              <>
                <label htmlFor="ftr-email" className="sr-only">
                  Email
                </label>
                <input id="ftr-email" type="email" placeholder="Email for drop access" value={email} onChange={(e) => setEmail(e.target.value)} />
                <button type="submit" className="mono">
                  Join →
                </button>
              </>
            )}
          </form>
        </div>
        <div className="ftr__col">
          <p className="mono ash">Shop</p>
          {PRODUCTS.map((p) => (
            <TLink key={p.slug} href={`/product/${p.slug}`} label={p.name} className="link-u">
              {p.name}
            </TLink>
          ))}
          <TLink href="/shop" label="SHOP" className="link-u">
            All pieces
          </TLink>
        </div>
        <div className="ftr__col">
          <p className="mono ash">Help</p>
          <TLink href="/size-guide" label="SIZE GUIDE" className="link-u">
            Size guide
          </TLink>
          <TLink href="/support#shipping" label="SUPPORT" className="link-u">
            Shipping
          </TLink>
          <TLink href="/support#returns" label="SUPPORT" className="link-u">
            Returns & exchanges
          </TLink>
          <TLink href="/support" label="SUPPORT" className="link-u">
            Contact
          </TLink>
        </div>
        <div className="ftr__col">
          <p className="mono ash">Follow</p>
          <a className="link-u" href="https://instagram.com" target="_blank" rel="noreferrer">
            Instagram
          </a>
          <a className="link-u" href="https://x.com" target="_blank" rel="noreferrer">
            X / Twitter
          </a>
          <a className="link-u" href="https://youtube.com" target="_blank" rel="noreferrer">
            YouTube
          </a>
        </div>
      </div>
      <div className="ftr__word display" aria-hidden>
        AURE
      </div>
      <div className="ftr__legal wrap mono ash">
        <span>© {new Date().getFullYear()} AURE. All rights reserved.</span>
        <span>Prototype — concept garments. Payments run in test mode.</span>
        <span>Made in India</span>
      </div>
    </footer>
  );
}
