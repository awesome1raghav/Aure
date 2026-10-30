"use client";

import { usePathname } from "next/navigation";
import type { AnchorHTMLAttributes, MouseEvent } from "react";
import { useUI } from "@/lib/ui";
import { scrollToTarget } from "@/lib/scroll";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  /** big word shown on the transition curtain */
  label?: string;
};

/** Link that plays the AURE curtain transition before navigating. */
export function TLink({ href, label, onClick, children, ...rest }: Props) {
  const pathname = usePathname();
  const go = useUI((s) => s.go);

  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (/^(https?:|mailto:|tel:)/.test(href)) return;
    const [path, hash] = href.split("#");
    if ((path || "/") === pathname) {
      e.preventDefault();
      useUI.getState().setMenu(false);
      const el = hash ? document.getElementById(hash) : null;
      scrollToTarget(el ?? 0);
      return;
    }
    e.preventDefault();
    go(href, label ?? "");
  };

  return (
    <a href={href} onClick={handle} {...rest}>
      {children}
    </a>
  );
}
