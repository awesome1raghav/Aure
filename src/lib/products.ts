// Drop 001 — concept garments for the prototype.
// Replace these with the real pieces (or move them into the admin/CMS) before launch.

export type PrintStyle = "doubt" | "unspoken" | "ember" | "static";

export interface Colorway {
  id: string;
  name: string;
  /** fabric base colour */
  fabric: string;
  /** main print ink */
  ink: string;
  /** secondary/accent ink */
  accent: string;
  /** what this colour means inside the AURE story */
  meaning: string;
}

export interface Product {
  slug: string;
  index: string;
  name: string;
  type: string;
  price: number; // INR
  print: PrintStyle;
  tagline: string;
  colorways: Colorway[];
  sizes: string[];
  soldOut?: string[];
  story: string;
  inspiration: string;
  fabric: { label: string; value: string }[];
  fit: string;
  care: string[];
}

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

const FABRIC_240 = [
  { label: "Fabric", value: "240 GSM combed cotton single jersey" },
  { label: "Finish", value: "Garment-dyed, enzyme washed, pre-shrunk" },
  { label: "Collar", value: "2 cm 1x1 rib, double-needle bound" },
  { label: "Construction", value: "Drop shoulder, side-seamed, twin-needle hems" },
  { label: "Print", value: "Water-based screen print, high-density details" },
  { label: "Origin", value: "Cut & sewn in Tiruppur, India" },
];

export const PRODUCTS: Product[] = [
  {
    slug: "doubt",
    index: "001",
    name: "DOUBT",
    type: "Heavyweight Oversized Tee",
    price: 2899,
    print: "doubt",
    tagline: "I was never sure. Then I was.",
    colorways: [
      { id: "washed-black", name: "Washed Black", fabric: "#1a1918", ink: "#ece6da", accent: "#ff4d1f", meaning: "Identity. The colour you hide in, until you stop hiding." },
      { id: "ash", name: "Ash", fabric: "#5f5d5a", ink: "#0d0c0b", accent: "#ff4d1f", meaning: "The in-between. Doubt before it turns into decision." },
    ],
    sizes: SIZES,
    soldOut: ["XS"],
    story:
      "The first piece. The one that started it. DOUBT is a love letter to the version of you that wasn't sure — about the clothes, the voice, the room you walked into. Across the chest: I WAS NEVER SURE. One ember line runs through NEVER. That line is the whole brand.",
    inspiration:
      "Late nights watching artists treat their wardrobe like a second language — the way a jacket could say what a verse couldn't. Growing up quiet, clothes became the first place confidence showed up before words did.",
    fabric: FABRIC_240,
    fit: "Boxy, oversized fit with dropped shoulders. Take your usual size for the intended look, size down for a closer fit. Model is 183 cm wearing L.",
    care: ["Wash cold, inside out", "Do not tumble dry", "Iron on reverse, never on print", "Line dry in shade"],
  },
  {
    slug: "unspoken",
    index: "002",
    name: "UNSPOKEN",
    type: "Boxy Tee — Back Statement",
    price: 2699,
    print: "unspoken",
    tagline: "Say nothing. Wear everything.",
    colorways: [
      { id: "bone", name: "Bone", fabric: "#e4ddcf", ink: "#141210", accent: "#ff4d1f", meaning: "Clarity. A blank page that decides to speak." },
      { id: "carbon", name: "Carbon", fabric: "#121110", ink: "#e4ddcf", accent: "#ff4d1f", meaning: "Quiet authority. Presence without permission." },
    ],
    sizes: SIZES,
    story:
      "For the people who walk in and the room already knows. UNSPOKEN keeps the front almost silent — a single line of type — and puts the statement on the back, where people read you after you've already passed.",
    inspiration:
      "The idea that fashion communicates where you stand before you say a word. Style as a language: grammar in the silhouette, vocabulary in the details.",
    fabric: FABRIC_240,
    fit: "Boxy fit, slightly cropped body, wide sleeves. True to size for a relaxed look.",
    care: ["Wash cold, inside out", "Do not bleach", "Do not tumble dry", "Iron on reverse"],
  },
  {
    slug: "ember",
    index: "003",
    name: "EMBER",
    type: "Heavyweight Tee — Wordmark",
    price: 2999,
    print: "ember",
    tagline: "Confidence is a colour.",
    colorways: [
      { id: "ember", name: "Ember", fabric: "#d9461d", ink: "#120f0d", accent: "#f2ece0", meaning: "Confidence. Heat that doesn't ask to be noticed — it just is." },
      { id: "oxblood", name: "Oxblood", fabric: "#4a1414", ink: "#efe8dc", accent: "#ff6a3a", meaning: "Conviction. Ember that has cooled into something permanent." },
    ],
    sizes: SIZES,
    soldOut: ["XXL"],
    story:
      "EMBER is the moment the doubt burns off. The full AURE wordmark runs edge to edge across the chest — no apology, no small print. Garment-dyed so every piece comes out a slightly different heat.",
    inspiration:
      "Hip-hop's loudest era of self-belief — artists who wore their name like armour. The colour is taken from the last glow of a fire: still burning, completely in control.",
    fabric: FABRIC_240,
    fit: "Oversized fit, dropped shoulder, longer body. Size down for a regular fit.",
    care: ["Wash cold with similar colours", "Colour will soften with every wash — that's the point", "Do not tumble dry"],
  },
  {
    slug: "static",
    index: "004",
    name: "STATIC",
    type: "Oversized Tee — Signal Print",
    price: 2799,
    print: "static",
    tagline: "Signal over noise.",
    colorways: [
      { id: "ash-heather", name: "Ash Heather", fabric: "#8a8780", ink: "#0f0e0d", accent: "#ff4d1f", meaning: "Introspection. The grey where you tune out everyone else." },
      { id: "washed-black", name: "Washed Black", fabric: "#1a1918", ink: "#d9d3c7", accent: "#ff4d1f", meaning: "Focus. Everything else goes dark." },
    ],
    sizes: SIZES,
    story:
      "Everyone has an opinion about who you should be. STATIC is the sound of tuning it out. The AURE mark is sliced and shifted like a signal breaking through interference — still readable, still yours.",
    inspiration:
      "Old broadcast test patterns, scrambled channels, the feeling of finding your own frequency after years of listening to everyone else's.",
    fabric: [
      { label: "Fabric", value: "230 GSM cotton–poly heather jersey (ash) / 240 GSM cotton (black)" },
      ...FABRIC_240.slice(1),
    ],
    fit: "Oversized fit with dropped shoulders. Take your usual size.",
    care: ["Wash cold, inside out", "Do not tumble dry", "Iron on reverse"],
  },
];

export function getProduct(slug: string) {
  return PRODUCTS.find((p) => p.slug === slug);
}

export function getColorway(p: Product, id?: string) {
  return p.colorways.find((c) => c.id === id) ?? p.colorways[0];
}

export const SHIPPING_FREE_ABOVE = 2999;
export const SHIPPING_FEE = 149;

export const SIZE_CHART = [
  { size: "XS", chest: 104, length: 68, shoulder: 52, sleeve: 21 },
  { size: "S", chest: 110, length: 70, shoulder: 54, sleeve: 22 },
  { size: "M", chest: 116, length: 72, shoulder: 56, sleeve: 23 },
  { size: "L", chest: 122, length: 74, shoulder: 58, sleeve: 24 },
  { size: "XL", chest: 128, length: 76, shoulder: 60, sleeve: 25 },
  { size: "XXL", chest: 134, length: 78, shoulder: 62, sleeve: 26 },
];
