import Link from "next/link";

// Only reached for paths outside a locale prefix; localized 404s live in app/[locale]/not-found.tsx.
// No providers or stylesheet here, so the copy is static and trilingual with inline palette styles.
const ink = "#152C52";
const muted = "#2A4C85";

const linkStyle = {
  display: "inline-flex",
  alignItems: "center",
  minHeight: 44,
  padding: "0 20px",
  borderRadius: 999,
  background: "#fff",
  color: ink,
  fontWeight: 600,
  textDecoration: "none",
  boxShadow: "0 0 0 1px rgba(30,38,31,0.05), 0 1px 2px rgba(30,38,31,0.05), 0 2px 6px rgba(30,38,31,0.05)",
} as const;

export default function RootNotFound() {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          background: "#FFFFFF",
          color: ink,
        }}
      >
        <svg width="72" height="88" viewBox="0 0 72 88" fill="none" aria-hidden="true" style={{ marginBottom: 20 }}>
          <path d="M6 86V40C6 21 19 6 36 6s30 15 30 34v46" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
          <path d="M18 86V44c0-11 8-20 18-20s18 9 18 20v42" stroke="#0B57D0" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400, fontSize: 32, margin: "0 0 10px" }}>
          404: Page not found
        </h1>
        <p lang="fr" style={{ margin: "0 0 4px", color: muted }}>
          Page introuvable
        </p>
        <p lang="ar" dir="rtl" style={{ margin: "0 0 28px", color: muted }}>
          الصفحة غير موجودة
        </p>
        <nav style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
          <Link href="/en" style={linkStyle}>
            BLADUS (EN)
          </Link>
          <Link href="/fr" style={linkStyle}>
            BLADUS (FR)
          </Link>
          <Link href="/ar" style={linkStyle}>
            بلادوس (AR)
          </Link>
        </nav>
      </body>
    </html>
  );
}
