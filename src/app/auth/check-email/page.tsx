import Link from "next/link";
import { use } from "react";

export default function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = use(searchParams);
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/aravow-mark.png" alt="Aravow" className="mb-8 h-24 w-24" />
      <h1 className="font-serif text-4xl font-light">Check your email</h1>
      <p className="mt-4 text-rose-champagne/80 max-w-sm">
        {error === "expired"
          ? "That link has expired or was already used. Request a new one below."
          : "We sent you a sign-in link. It expires in 15 minutes."}
      </p>
      <Link href="/studio" className="mt-8 text-gold underline underline-offset-4">
        Request a new link
      </Link>
      <Link
        href="/"
        className="mt-6 text-[0.62rem] uppercase tracking-[0.24em] text-rose-champagne/50 transition-colors hover:text-gold"
      >
        ← Back to home
      </Link>
    </main>
  );
}
