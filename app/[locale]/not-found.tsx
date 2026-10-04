"use client";

import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center text-center px-4 py-12 bg-background">
      <div className="w-full max-w-xl relative mb-6">
        <Image
          src="/assets/404-illustration.png"
          alt="404 - Destination not on the map"
          width={1200}
          height={675}
          priority
          className="w-full h-auto object-contain select-none pointer-events-none"
        />
      </div>

      <div className="max-w-lg space-y-3">
        <span className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold tracking-widest uppercase">
          Lost Path
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">
          This place isn&apos;t on the map.
        </h1>
        <p className="text-sm sm:text-base text-primary/75 max-w-md mx-auto">
          You may have taken an unexpected turn, but there are plenty of incredible places waiting for you across Algeria.
        </p>
      </div>

      <div className="mt-8 flex items-center justify-center gap-4">
        <Link
          href="/"
          className="px-7 py-3 rounded-full bg-accent hover:bg-accent-600 text-white font-medium text-sm transition-all shadow-xs hover:shadow-md"
        >
          Return Home
        </Link>
        <Link
          href="/search"
          className="px-7 py-3 rounded-full bg-surface border border-tertiary/70 hover:bg-tertiary/20 text-primary font-medium text-sm transition-all"
        >
          Explore Stays
        </Link>
      </div>
    </div>
  );
}
