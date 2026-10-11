"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("DARNA Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-[80dvh] flex flex-col items-center justify-center p-6 text-center">
      <div className="relative w-64 h-64 mb-6">
        <Image
          src="/assets/404-illustration.png"
          alt="DARNA Error"
          fill
          className="object-contain"
        />
      </div>
      <h2 className="text-2xl font-bold text-primary mb-2">
        Something unexpected happened
      </h2>
      <p className="text-sm text-neutral-600 max-w-md mb-6">
        An error occurred while loading this page. Please try refreshing or return to the home page.
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="px-6 py-2.5 rounded-full bg-accent text-white font-medium hover:bg-accent/90 transition shadow-sm"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="px-6 py-2.5 rounded-full border border-tertiary text-primary font-medium hover:bg-tertiary/20 transition"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
