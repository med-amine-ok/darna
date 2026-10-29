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
        <main role="alert" style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>Something went wrong</h1>
          <p lang="fr" style={{ margin: "0 0 4px" }}>
            Une erreur inattendue est survenue.
          </p>
          <p lang="ar" dir="rtl" style={{ margin: "0 0 16px" }}>
            حدث خطأ غير متوقع.
          </p>
          {error.digest && (
            <p style={{ fontSize: 12, color: "#525252" }}>
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
              fontWeight: 700,
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
