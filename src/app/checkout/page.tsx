import { Suspense } from "react";
import { CheckoutView } from "@/components/commerce/CheckoutView";

export const metadata = { title: "Checkout | AURE" };

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="page" />}>
      <CheckoutView />
    </Suspense>
  );
}
