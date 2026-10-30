import { Hero } from "@/components/home/Hero";
import { ColourLanguage, Craft, Drop, InnerCircle, Manifesto, Marquee } from "@/components/home/Sections";

export default function Home() {
  return (
    <>
      <Hero />
      <Marquee items={["Wear what you mean", "Self-doubt is a rough draft", "Drop 001 — Becoming", "Confidence is a colour"]} />
      <Manifesto />
      <Drop />
      <ColourLanguage />
      <Marquee tone="bone" items={["Signal over noise", "Say nothing. Wear everything", "It was always in you"]} />
      <Craft />
      <InnerCircle />
    </>
  );
}
