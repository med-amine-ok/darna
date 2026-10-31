"use client";

/**
 * Last-resort boundary (errors thrown by the root/locale layout itself).
 * It replaces the whole document, so the i18n provider is not available:
 * the message is shown in the three admin languages.
 */
export default function GlobalError({
  error,
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
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F8F6EE",
          color: "#2E3A2F",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          padding: 24,
        }}
      >
        <main
          role="alert"
          style={{
            maxWidth: 480,
            textAlign: "center",
            background: "#FFFFFF",
            borderRadius: 20,
            padding: "36px 32px",
            boxShadow:
              "0 0 0 1px rgba(30,38,31,0.05), 0 1px 2px rgba(30,38,31,0.05), 0 2px 6px rgba(30,38,31,0.05)",
          }}
        >
          <h1 style={{ fontSize: 26, fontWeight: 400, fontFamily: "Georgia, serif", margin: "0 0 10px", color: "#1E261F" }}>Something went wrong</h1>
          <p lang="fr" style={{ margin: "0 0 4px", color: "#455243", fontSize: 14 }}>
            Une erreur inattendue est survenue.
          </p>
          <p lang="ar" dir="rtl" style={{ margin: "0 0 16px", color: "#455243", fontSize: 14 }}>
            حدث خطأ غير متوقع.
          </p>
          {error.digest && (
            <p style={{ fontSize: 12, color: "#5C6C5A" }}>
              Ref: <code>{error.digest}</code>
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 12,
              padding: "10px 18px",
              minHeight: 44,
              borderRadius: 12,
              border: "none",
              background: "#2E3A2F",
              color: "#fff",
              fontWeight: 600,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 1px 2px rgba(30,38,31,0.1)",
              cursor: "pointer",
            }}
          >
            Try again · Réessayer · إعادة المحاولة
          </button>
        </main>
      </body>
    </html>
  );
}
