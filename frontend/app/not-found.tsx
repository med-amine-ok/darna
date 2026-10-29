import Link from "next/link";

// Only reached for paths outside a locale prefix; localized 404s live in app/[locale]/not-found.tsx.
export default function RootNotFound() {
  return (
    <html lang="en">
      <body
        style={{ fontFamily: "system-ui, sans-serif", background: "#F8F6EE", color: "#2E3A2F" }}
        className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center"
      >
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>404 — Page not found</h1>
        <p lang="fr" style={{ marginBottom: 4 }}>Page introuvable</p>
        <p lang="ar" dir="rtl" style={{ marginBottom: 24 }}>الصفحة غير موجودة</p>
        <nav style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link href="/en">DARNA (EN)</Link>
          <Link href="/fr">DARNA (FR)</Link>
          <Link href="/ar">دارنا (AR)</Link>
        </nav>
      </body>
    </html>
  );
}
