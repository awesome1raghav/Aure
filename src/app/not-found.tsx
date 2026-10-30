import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page wrap info nf">
      <p className="mono ember">(404)</p>
      <h1 className="display info__title">
        Lost the <span className="serif">signal.</span>
      </h1>
      <p className="info__lead ash">This page doesn&apos;t exist — but you do. Head back.</p>
      <Link href="/" className="btn btn--ember">
        Back to AURE <span className="arrow">→</span>
      </Link>
    </div>
  );
}
