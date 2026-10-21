import Link from "next/link";

export default function RootNotFound() {
  return (
    <html lang="en">
      <body className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center bg-[#F8F6EE] text-[#2E3A2F]">
        <h1 className="text-3xl font-bold mb-2">404 — Page Not Found</h1>
        <p className="text-sm text-neutral-600 mb-6">
          The requested page could not be located.
        </p>
        <Link
          href="/en"
          className="px-6 py-2.5 rounded-full bg-[#C96F4F] text-white font-medium hover:opacity-90 transition"
        >
          Go to DARNA
        </Link>
      </body>
    </html>
  );
}
