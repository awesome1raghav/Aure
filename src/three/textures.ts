import * as THREE from "three";
import { SHIRT_LAYOUT } from "./cloth";
import type { Colorway, PrintStyle } from "@/lib/products";

// ---------- helpers -----------------------------------------------------------------

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function shade(hex: string, amt: number) {
  const [r, g, b] = hexToRgb(hex);
  const f = (c: number) => Math.round(Math.max(0, Math.min(255, amt >= 0 ? c + (255 - c) * amt : c * (1 + amt))));
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}

function cssVar(name: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function fonts() {
  return {
    display: cssVar("--font-display", "Arial Black, sans-serif"),
    serif: cssVar("--font-serif", "Georgia, serif"),
    mono: cssVar("--font-mono", "monospace"),
  };
}

let noiseTile: HTMLCanvasElement | null = null;
function getNoise() {
  if (noiseTile) return noiseTile;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(256, 256);
  const r = rng(7);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(r() * 255);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  noiseTile = c;
  return c;
}

// ---------- knit normal map ---------------------------------------------------------

let knitCache: THREE.CanvasTexture | null = null;
let ribCache: THREE.CanvasTexture | null = null;

function heightToNormal(h: Float32Array, size: number, strength: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  const at = (x: number, y: number) => h[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * strength;
      const dy = (at(x, y + 1) - at(x, y - 1)) * strength;
      const l = Math.hypot(dx, dy, 1);
      const i = (y * size + x) * 4;
      img.data[i] = ((-dx / l) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / l) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / l) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** single-jersey knit: columns of little "V" loops */
export function knitNormal() {
  if (knitCache) return knitCache;
  const size = 256;
  const h = new Float32Array(size * size);
  const cw = 16;
  const ch = 12;
  const r = rng(3);
  const jitter = Array.from({ length: 64 }, () => r() * 0.15);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const col = Math.floor(x / cw);
      const lx = (x % cw) / cw;
      const ly = ((y + (col % 2) * 3) % ch) / ch;
      const cl = 0.27 + 0.16 * (ly - 0.5);
      const cr = 0.73 - 0.16 * (ly - 0.5);
      const bump = (d: number) => Math.max(0, 1 - (d / 0.2) * (d / 0.2));
      const v = Math.max(bump(lx - cl), bump(lx - cr)) * (0.7 + 0.3 * Math.cos(ly * Math.PI * 2));
      h[y * size + x] = v * (0.85 + jitter[(col + Math.floor(y / ch) * 7) % 64]);
    }
  }
  const tex = new THREE.CanvasTexture(heightToNormal(h, size, 2.4));
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(34, 34);
  tex.colorSpace = THREE.NoColorSpace;
  knitCache = tex;
  return tex;
}

/** 1x1 rib for the collar */
export function ribNormal() {
  if (ribCache) return ribCache;
  const size = 64;
  const h = new Float32Array(size * size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) h[y * size + x] = Math.pow(Math.abs(Math.sin((x / size) * Math.PI * 4)), 0.7);
  const tex = new THREE.CanvasTexture(heightToNormal(h, size, 3));
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(90, 1);
  tex.colorSpace = THREE.NoColorSpace;
  ribCache = tex;
  return tex;
}

// ---------- print painter -----------------------------------------------------------

interface Ctx {
  ctx: CanvasRenderingContext2D;
  S: number;
  ppm: number; // body pixels per metre
  cw: Colorway;
  f: ReturnType<typeof fonts>;
}

type Draw = (c: Ctx, X: (m: number) => number, Y: (m: number) => number, M: (m: number) => number) => void;

function font(weight: number | string, sizePx: number, family: string, opts: { italic?: boolean } = {}) {
  return `${opts.italic ? "italic " : ""}${weight} ${Math.max(1, sizePx)}px ${family}`;
}

/** draw centred text squeezed/fitted to an exact width in px */
function fitText(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, width: number, fontStr: (size: number) => string, align: CanvasTextAlign = "center") {
  ctx.font = fontStr(100);
  const w = ctx.measureText(text).width || 1;
  const size = (100 * width) / w;
  ctx.font = fontStr(size);
  ctx.textAlign = align;
  ctx.fillText(text, cx, y);
  return size;
}

function stretch(ctx: CanvasRenderingContext2D, s: CanvasFontStretch) {
  try {
    ctx.fontStretch = s;
  } catch {
    /* older browsers */
  }
}

const PRINTS: Record<PrintStyle, { front: Draw; back: Draw }> = {
  doubt: {
    front: ({ ctx, cw, f }, X, Y, M) => {
      ctx.fillStyle = cw.ink;
      ctx.textBaseline = "alphabetic";
      stretch(ctx, "expanded");
      const left = X(-0.118);
      const lines = ["I WAS", "NEVER", "SURE."];
      const size = M(0.064);
      ctx.font = font(900, size, f.display);
      ctx.textAlign = "left";
      lines.forEach((l, i) => ctx.fillText(l, left, Y(0.165 + i * 0.062)));
      // the ember line through NEVER
      const w = ctx.measureText("NEVER").width;
      ctx.fillStyle = cw.accent;
      ctx.fillRect(left - M(0.012), Y(0.227) - M(0.024), w + M(0.03), M(0.0085));
      stretch(ctx, "normal");
      ctx.fillStyle = cw.ink;
      ctx.font = font(500, M(0.0115), f.mono);
      ctx.fillText("AURE — 001 / BECOMING", left, Y(0.305));
      ctx.fillStyle = cw.accent;
      ctx.fillText("(SELF-DOUBT, REVISED)", left, Y(0.322));
    },
    back: ({ ctx, cw, f }, X, Y, M) => {
      ctx.fillStyle = cw.ink;
      ctx.textAlign = "center";
      ctx.font = font(500, M(0.012), f.mono);
      ctx.fillText("AURE®", X(0), Y(0.075));
      ctx.font = font(400, M(0.082), f.serif, { italic: true });
      ctx.fillText("becoming", X(0), Y(0.25));
      ctx.font = font(500, M(0.0125), f.mono);
      ctx.fillText("SELF-DOUBT IS A ROUGH DRAFT.", X(0), Y(0.29));
      ctx.fillStyle = cw.accent;
      ctx.fillRect(X(-0.006), Y(0.315), M(0.012), M(0.012));
    },
  },
  unspoken: {
    front: ({ ctx, cw, f }, X, Y, M) => {
      ctx.fillStyle = cw.ink;
      stretch(ctx, "expanded");
      ctx.textAlign = "left";
      ctx.font = font(900, M(0.026), f.display);
      ctx.fillText("AURE", X(0.055), Y(0.12));
      stretch(ctx, "normal");
      ctx.font = font(500, M(0.0095), f.mono);
      ctx.fillText("SAY NOTHING.", X(0.056), Y(0.137));
      ctx.fillStyle = cw.accent;
      ctx.fillRect(X(0.045), Y(0.1), M(0.006), M(0.006));
    },
    back: ({ ctx, cw, f }, X, Y, M) => {
      stretch(ctx, "expanded");
      ctx.textAlign = "center";
      const size = M(0.056);
      ctx.font = font(900, size, f.display);
      ctx.fillStyle = cw.ink;
      ctx.fillText("SAY", X(0), Y(0.14));
      ctx.fillText("NOTHING.", X(0), Y(0.195));
      ctx.lineWidth = M(0.0022);
      ctx.strokeStyle = cw.ink;
      ["WEAR", "EVERY—", "THING."].forEach((t, i) => ctx.strokeText(t, X(0), Y(0.26 + i * 0.055)));
      stretch(ctx, "normal");
      ctx.font = font(500, M(0.011), f.mono);
      ctx.fillStyle = cw.ink;
      ctx.fillText("002 — UNSPOKEN — AURE", X(0), Y(0.45));
      ctx.fillStyle = cw.accent;
      ctx.beginPath();
      ctx.arc(X(0), Y(0.475), M(0.006), 0, Math.PI * 2);
      ctx.fill();
    },
  },
  ember: {
    front: ({ ctx, cw, f }, X, Y, M) => {
      ctx.fillStyle = cw.ink;
      stretch(ctx, "expanded");
      fitText(ctx, "AURE", X(0), Y(0.215), M(0.36), (s) => font(900, s, f.display));
      stretch(ctx, "normal");
      ctx.font = font(500, M(0.0125), f.mono);
      ctx.textAlign = "left";
      ctx.fillText("CONFIDENCE IS A COLOUR", X(-0.18), Y(0.245));
      ctx.textAlign = "right";
      ctx.fillText("003", X(0.18), Y(0.245));
      ctx.fillStyle = cw.accent;
      ctx.fillRect(X(-0.18), Y(0.258), M(0.36), M(0.0018));
    },
    back: ({ ctx, cw, f }, X, Y, M) => {
      ctx.fillStyle = cw.ink;
      ctx.textAlign = "center";
      ctx.font = font(500, M(0.012), f.mono);
      ctx.fillText("AURE® — EMBER — DROP 001", X(0), Y(0.075));
      ctx.font = font(400, M(0.045), f.serif, { italic: true });
      ctx.fillText("it was always in you.", X(0), Y(0.33));
    },
  },
  static: {
    front: ({ ctx, cw, f }, X, Y, M) => {
      // render the wordmark off-screen, then slice & shift it like broken signal
      const w = Math.ceil(M(0.36));
      const h = Math.ceil(M(0.12));
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const o = off.getContext("2d")!;
      o.fillStyle = cw.ink;
      stretch(o, "expanded");
      fitText(o, "AURE", w / 2, h * 0.86, w, (s) => font(900, s, f.display));
      const slices = 11;
      const r = rng(41);
      for (let i = 0; i < slices; i++) {
        const sy = (h / slices) * i;
        const sh = h / slices + 1;
        const shift = (r() - 0.5) * M(0.03) * (i % 3 === 0 ? 1.8 : 0.6);
        if (i === 6) {
          // one slice burns ember
          const tint = document.createElement("canvas");
          tint.width = w;
          tint.height = Math.ceil(sh);
          const t = tint.getContext("2d")!;
          t.drawImage(off, 0, sy, w, sh, 0, 0, w, sh);
          t.globalCompositeOperation = "source-in";
          t.fillStyle = cw.accent;
          t.fillRect(0, 0, w, sh);
          ctx.drawImage(tint, X(-0.18) + shift, Y(0.1) + sy);
        } else {
          ctx.drawImage(off, 0, sy, w, sh, X(-0.18) + shift, Y(0.1) + sy, w, sh);
        }
      }
      ctx.fillStyle = cw.ink;
      ctx.font = font(500, M(0.0125), f.mono);
      ctx.textAlign = "center";
      ctx.fillText("SIGNAL OVER NOISE", X(0), Y(0.255));
      ctx.globalAlpha = 0.18;
      for (let y = 0.1; y < 0.22; y += 0.006) ctx.fillRect(X(-0.2), Y(y), M(0.4), M(0.0012));
      ctx.globalAlpha = 1;
    },
    back: ({ ctx, cw, f }, X, Y, M) => {
      const bars = [cw.ink, "#e9e3d6", "#8e8a83", cw.accent, "#5b7385", "#2a2622"];
      const bw = 0.03;
      bars.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(X(-(bars.length * bw) / 2 + i * bw), Y(0.1), M(bw), M(0.07));
      });
      ctx.fillStyle = cw.ink;
      ctx.textAlign = "center";
      ctx.font = font(500, M(0.012), f.mono);
      ctx.fillText("004 / STATIC — TUNE OUT. TUNE IN.", X(0), Y(0.2));
    },
  },
};

/** paints the full garment texture (body + both sleeves) for a product/colourway */
export async function paintShirt(print: PrintStyle, cw: Colorway, quality: "high" | "low" = "high") {
  const f = fonts();
  try {
    await Promise.all([
      document.fonts.load(`900 64px ${f.display}`),
      document.fonts.load(`italic 400 64px ${f.serif}`),
      document.fonts.load(`500 32px ${f.mono}`),
    ]);
  } catch {
    /* fall back to whatever is available */
  }

  const S = quality === "high" ? 2048 : 1024;
  const L = SHIRT_LAYOUT;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext("2d")!;
  const ppm = S / L.perimeter;
  const r = rng(hash(print + cw.id));

  // fabric base + garment-dye mottling
  ctx.fillStyle = cw.fabric;
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 70; i++) {
    const x = r() * S;
    const y = r() * S;
    const rad = (0.05 + r() * 0.2) * S;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const light = r() > 0.5;
    g.addColorStop(0, light ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.05)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // heather streaks
  if (cw.id.includes("heather") || cw.id === "ash") {
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";
      ctx.fillRect(r() * S, r() * S, 2 + r() * 10 * (S / 1024), 1 * (S / 1024));
    }
  }

  // ---- body prints (front centred at x = S/2, back centred on the wrap seam)
  const bodyBottom = L.bodyH * S;
  const M = (m: number) => m * ppm;
  const Yb = (m: number) => m * ppm;
  const printLayer = document.createElement("canvas");
  printLayer.width = printLayer.height = S;
  const p = printLayer.getContext("2d")!;
  const pc: Ctx = { ctx: p, S, ppm, cw, f };
  PRINTS[print].front(pc, (m) => S / 2 + m * ppm, Yb, M);
  p.save();
  p.beginPath();
  p.rect(0, 0, S, bodyBottom);
  p.clip();
  PRINTS[print].back(pc, (m) => m * ppm, Yb, M);
  PRINTS[print].back(pc, (m) => S + m * ppm, Yb, M);
  p.restore();
  // worn screen-print: knock tiny holes out of the ink
  p.globalCompositeOperation = "destination-out";
  p.globalAlpha = 0.22;
  p.fillStyle = p.createPattern(getNoise(), "repeat")!;
  p.fillRect(0, 0, S, S);
  p.globalAlpha = 1;
  p.globalCompositeOperation = "source-over";
  ctx.drawImage(printLayer, 0, 0);

  // side seams
  ctx.strokeStyle = "rgba(0,0,0,0.22)";
  ctx.lineWidth = Math.max(1, S / 1024);
  [0.25, 0.75].forEach((u) => {
    ctx.beginPath();
    ctx.moveTo(u * S, M(0.12));
    ctx.lineTo(u * S, bodyBottom);
    ctx.stroke();
  });

  // hem rib + twin-needle stitching
  const hem = (x0: number, x1: number, yBottom: number, ppmL: number) => {
    const band = 0.026 * ppmL;
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(x0, yBottom - band, x1 - x0, band);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let x = x0; x < x1; x += 0.003 * ppmL) ctx.fillRect(x, yBottom - band, Math.max(1, 0.0012 * ppmL), band);
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.setLineDash([0.004 * ppmL, 0.0025 * ppmL]);
    ctx.lineWidth = Math.max(1, 0.0009 * ppmL);
    [band + 0.003 * ppmL, band + 0.008 * ppmL].forEach((o) => {
      ctx.beginPath();
      ctx.moveTo(x0, yBottom - o);
      ctx.lineTo(x1, yBottom - o);
      ctx.stroke();
    });
    ctx.setLineDash([]);
  };
  hem(0, S, bodyBottom, ppm);

  // sleeves
  const sTop = L.sleeveY0 * S;
  const sBottom = (L.sleeveY0 + L.sleeveH) * S;
  const sppm = S / 2 / L.sleeveCirc;
  ctx.fillStyle = cw.fabric;
  hem(0, S, sBottom, sppm);
  ctx.strokeStyle = "rgba(0,0,0,0.25)";
  ctx.lineWidth = Math.max(1, S / 900);
  ctx.beginPath();
  ctx.moveTo(0, sTop + 2);
  ctx.lineTo(S, sTop + 2);
  ctx.stroke();
  // woven tab on the left sleeve (left half, top of sleeve = centre of the half)
  const tabW = 0.034 * sppm;
  const tabH = 0.014 * sppm;
  const tx = S / 4 - tabW / 2;
  const ty = sBottom - 0.06 * sppm;
  ctx.fillStyle = cw.accent;
  ctx.fillRect(tx, ty, tabW, tabH);
  ctx.fillStyle = cw.fabric;
  ctx.font = font(700, tabH * 0.55, f.mono);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("AURE", tx + tabW / 2, ty + tabH / 2 + 1);

  // overall fibre noise
  ctx.globalCompositeOperation = "soft-light";
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = ctx.createPattern(getNoise(), "repeat")!;
  ctx.fillRect(0, 0, S, S);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}
