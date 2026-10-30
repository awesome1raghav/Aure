"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getProduct, SHIPPING_FEE, SHIPPING_FREE_ABOVE } from "./products";

export interface CartLine {
  slug: string;
  color: string;
  size: string;
  qty: number;
}

interface CartState {
  lines: CartLine[];
  /** set by "Buy now": checkout uses only this line */
  buyNow: CartLine | null;
  drawerOpen: boolean;
  add: (line: CartLine) => void;
  setQty: (i: number, qty: number) => void;
  remove: (i: number) => void;
  clear: () => void;
  setBuyNow: (line: CartLine | null) => void;
  setDrawer: (open: boolean) => void;
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      buyNow: null,
      drawerOpen: false,
      add: (line) =>
        set((s) => {
          const i = s.lines.findIndex((l) => l.slug === line.slug && l.color === line.color && l.size === line.size);
          if (i >= 0) {
            const lines = [...s.lines];
            lines[i] = { ...lines[i], qty: Math.min(10, lines[i].qty + line.qty) };
            return { lines };
          }
          return { lines: [...s.lines, line] };
        }),
      setQty: (i, qty) =>
        set((s) => {
          const lines = [...s.lines];
          if (!lines[i]) return s;
          lines[i] = { ...lines[i], qty: Math.max(1, Math.min(10, qty)) };
          return { lines };
        }),
      remove: (i) => set((s) => ({ lines: s.lines.filter((_, j) => j !== i) })),
      clear: () => set({ lines: [], buyNow: null }),
      setBuyNow: (line) => set({ buyNow: line }),
      setDrawer: (open) => set({ drawerOpen: open }),
    }),
    {
      name: "aure-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ lines: s.lines, buyNow: s.buyNow }),
    },
  ),
);

export function lineTotal(l: CartLine) {
  const p = getProduct(l.slug);
  return p ? p.price * l.qty : 0;
}

export function summarize(lines: CartLine[]) {
  const subtotal = lines.reduce((a, l) => a + lineTotal(l), 0);
  const shipping = subtotal === 0 || subtotal >= SHIPPING_FREE_ABOVE ? 0 : SHIPPING_FEE;
  const count = lines.reduce((a, l) => a + l.qty, 0);
  return { subtotal, shipping, total: subtotal + shipping, count };
}

export function formatINR(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}
