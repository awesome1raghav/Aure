# AURE — website

Streetwear as self-expression. Drop 001 — *Becoming*.

## Run it

Double-click **`START-AURE.bat`** (installs dependencies the first time, then opens http://localhost:3000).

Or from a terminal:

```bash
npm install
npm run dev
```

## What's inside

| Page | What it does |
|---|---|
| `/` | Preloader → hero with a live physics shirt (drag to spin, pick between the 4 pieces) → manifesto → Drop 001 grid (every card is live 3D) → colour story → craft → Inner Circle sign-up |
| `/product/[slug]` | Full 360° viewer: drag to spin, drag up/down for top & bottom, Front/Back/Side/Top/Bottom buttons, double-click to zoom. Colourway + size, size guide, Add to cart, Buy now, story / inspiration / fabric / care |
| `/cart` | Cart with quantities, free-shipping progress, totals |
| `/checkout` | Contact + delivery form (validated), Razorpay payment |
| `/checkout/success` | Order confirmation |
| `/shop`, `/size-guide`, `/support` | All pieces with colour filter, size chart, FAQ + contact |

### The 3D shirts
No 3D model files — every shirt is generated in code and simulated in real time:

- `src/three/cloth.ts` — Verlet cloth: ~2,000 particles with stretch + bend springs, long-range tethers, an invisible "ghost mannequin" (torso + arms) to drape over, and pinned shoulders. Spin it and the fabric lags, swings and flares.
- `src/three/textures.ts` — paints each garment: garment-dye mottling, heather, worn screen-print, side seams, rib hems, woven sleeve tab, knit normal map.
- `src/three/controller.ts` — spin momentum, view presets (springs so the fabric settles naturally), camera tilt for top/bottom views.

### Colour system — "from ash to ember"
Defined in `src/styles/tokens.css`. 60% carbon (warm black: authority, luxury) · 30% bone (warm white: clarity) · 10% ember (red-orange: energy, confidence — used only for actions and key words). Steel blue-grey, ember's complement, is used for cool rim light so the ember always pops.

## Products

The four pieces are **concept placeholders**. Edit them in `src/lib/products.ts` (name, price, colourways, sizes, sold-out sizes, story, inspiration, fabric, fit, care). Print designs live in `PRINTS` inside `src/three/textures.ts`.

Next step before launch: move products into an admin (e.g. Payload CMS) so they can be edited without code.

## Payments (Razorpay)

Without keys, checkout runs a **demo payment** (no money moves). To enable Razorpay:

1. Create `.env.local` (copy `.env.example`).
2. Add your **test** keys from the Razorpay dashboard: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.
3. Restart `npm run dev`.

Prices are always recalculated on the server (`src/app/api/checkout/route.ts`) and payments are signature-verified (`src/app/api/checkout/verify/route.ts`).

## Not done yet (before going live)
- Save paid orders to a database and send confirmation emails (marked `TODO` in the verify route).
- Newsletter / Inner Circle / support forms only show a success state — connect an email service.
- Real product photos/specs, policies (shipping, returns, privacy, terms) required by Razorpay.
