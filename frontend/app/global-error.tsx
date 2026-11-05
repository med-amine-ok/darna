"use client";

/**
 * Last-resort boundary for errors thrown in the root/locale layouts, where the
 * next-intl provider and the stylesheet may not exist: static trilingual copy and
 * inline styles in the BLADUS palette (paper, ink, terracotta) with the logo arch.
 */
const ink = "#152C52";
const paper = "#FFFFFF";
const terracotta = "#0B57D0";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          background: paper,
          color: ink,
        }}
      >
        <div
          role="alert"
          style={{
            width: "100%",
            maxWidth: 480,
            padding: "40px 28px",
            textAlign: "center",
            background: "#fff",
            borderRadius: 28,
            boxShadow: "0 0 0 1px rgba(30,38,31,0.04), 0 4px 8px rgba(30,38,31,0.05), 0 16px 36px -8px rgba(30,38,31,0.16)",
          }}
        >
          <svg width="72" height="88" viewBox="0 0 72 88" fill="none" aria-hidden="true" style={{ display: "block", margin: "0 auto 20px" }}>
            <path d="M6 86V40C6 21 19 6 36 6s30 15 30 34v46" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
            <path d="M18 86V44c0-11 8-20 18-20s18 9 18 20v42" stroke={terracotta} strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400, fontSize: 30, lineHeight: 1.15, margin: "0 0 12px" }}>
            Something went wrong
          </h1>
          <p lang="fr" style={{ margin: "0 0 4px", color: "#2A4C85" }}>
            Un problème est survenu.
          </p>
          <p lang="ar" dir="rtl" style={{ margin: "0 0 28px", color: "#2A4C85" }}>
            حدث خطأ ما.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              minHeight: 48,
              padding: "0 28px",
              borderRadius: 999,
              background: `linear-gradient(135deg, #0B57D0 0%, ${terracotta} 55%, #0846AB 100%)`,
              color: "#fff",
              border: 0,
              fontWeight: 600,
              fontSize: 15,
              cursor: "pointer",
              boxShadow: "0 8px 24px -6px rgba(182,86,52,0.45)",
            }}
          >
            Try again · Réessayer · حاول مرة أخرى
          </button>
          <p style={{ margin: "20px 0 0", fontSize: 14 }}>
            <a href="/en" style={{ color: ink, textUnderlineOffset: 4 }}>
              BLADUS
            </a>
          </p>
        </div>
      </body>
    </html>
  );
}
