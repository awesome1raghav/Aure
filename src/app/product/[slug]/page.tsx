import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PRODUCTS, getProduct } from "@/lib/products";
import { ProductView } from "@/components/product/ProductView";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  return p ? { title: `${p.name} — ${p.type} | AURE`, description: p.tagline } : { title: "AURE" };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();
  return <ProductView key={product.slug} slug={product.slug} />;
}
