import type { Metadata, Viewport } from "next";
import { Archivo, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "lenis/dist/lenis.css";
import "@/styles/tokens.css";
import "@/styles/base.css";
import "@/styles/chrome.css";
import "@/styles/home.css";
import "@/styles/product.css";
import "@/styles/commerce.css";
import { AppChrome } from "@/components/layout/AppChrome";

const display = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-display",
  display: "swap",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AURE — Wear what you mean",
  description: "AURE is streetwear as self-expression. Drop 001 — BECOMING.",
};

export const viewport: Viewport = {
  themeColor: "#0b0a09",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${serif.variable} ${mono.variable}`} style={{ ["--font-body" as string]: "var(--font-display)" }}>
      <body>
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}
