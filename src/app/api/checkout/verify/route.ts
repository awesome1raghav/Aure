import { NextResponse } from "next/server";
import crypto from "crypto";

/** Verifies the Razorpay signature: HMAC-SHA256(order_id|payment_id, key_secret). */
export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "Payments not configured" }, { status: 500 });

  let body: { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const { razorpay_order_id: o, razorpay_payment_id: p, razorpay_signature: sig } = body;
  if (!o || !p || !sig) return NextResponse.json({ ok: false }, { status: 400 });

  const expected = crypto.createHmac("sha256", secret).update(`${o}|${p}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(String(sig));
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  // TODO: persist the paid order (database) and send the confirmation email here.
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
