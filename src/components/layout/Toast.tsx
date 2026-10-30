"use client";

import { useEffect } from "react";
import { useUI } from "@/lib/ui";
import { TLink } from "./TLink";

export function Toast() {
  const toast = useUI((s) => s.toast);
  const hide = useUI((s) => s.hideToast);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(hide, 5000);
    return () => clearTimeout(id);
  }, [toast, hide]);

  return (
    <div className={`toast ${toast ? "toast--on" : ""}`} role="status" aria-live="polite">
      {toast && (
        <>
          <div className="toast__head mono">
            <span className="toast__dot" style={{ background: toast.swatch }} />
            {toast.title}
            <button className="toast__x" onClick={hide} aria-label="Dismiss">
              ✕
            </button>
          </div>
          <p className="toast__detail">{toast.detail}</p>
          <div className="toast__actions">
            <TLink href="/cart" label="CART" className="btn" onClick={hide}>
              View cart <span className="arrow">→</span>
            </TLink>
            <TLink href="/checkout" label="CHECKOUT" className="btn btn--ember" onClick={hide}>
              Checkout <span className="arrow">→</span>
            </TLink>
          </div>
        </>
      )}
    </div>
  );
}
