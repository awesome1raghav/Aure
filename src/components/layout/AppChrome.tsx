"use client";

import { SmoothScroll } from "./SmoothScroll";
import { Preloader } from "./Preloader";
import { PageTransition } from "./PageTransition";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { Cursor } from "./Cursor";
import { Toast } from "./Toast";
import { RevealObserver } from "./RevealObserver";

export function AppChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SmoothScroll />
      <RevealObserver />
      <Header />
      <main>{children}</main>
      <Footer />
      <Toast />
      <PageTransition />
      <Preloader />
      <Cursor />
      <div className="grain" aria-hidden />
    </>
  );
}
