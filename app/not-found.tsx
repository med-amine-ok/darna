import Link from "next/link";
import Image from "next/image";

export default function RootNotFound() {
  return (
    <html lang="en">
      <body className="bg-[#F8F6EE] text-[#2E3A2F] m-0 p-0 font-sans">
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 py-12">
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
            <span className="inline-block px-3 py-1 rounded-full bg-[#C96F4F]/10 text-[#C96F4F] text-xs font-bold tracking-widest uppercase">
              Lost Path
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              This place isn&apos;t on the map.
            </h1>
            <p className="text-sm sm:text-base opacity-75 max-w-md mx-auto">
              You may have taken an unexpected turn, but there are plenty of
              incredible places waiting for you across Algeria.
            </p>
          </div>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/"
              className="px-7 py-3 rounded-full bg-[#C96F4F] text-white font-medium text-sm transition-all shadow-sm hover:opacity-90"
            >
              Return Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
