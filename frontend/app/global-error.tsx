"use client";

// Last-resort boundary for errors thrown in the root/locale layouts, where the
// next-intl provider may not exist — so the copy is static and trilingual.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{ fontFamily: "system-ui, sans-serif", background: "#F8F6EE", color: "#2E3A2F" }}
        className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center"
      >
        <div role="alert" style={{ maxWidth: 480, margin: "15vh auto", padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
          <p lang="fr" style={{ marginBottom: 4 }}>Un problème est survenu.</p>
          <p lang="ar" dir="rtl" style={{ marginBottom: 24 }}>حدث خطأ ما.</p>
          <button
            type="button"
            onClick={() => reset()}
            style={{ padding: "10px 24px", borderRadius: 999, background: "#B65634", color: "#fff", border: 0, cursor: "pointer" }}
          >
            Try again · Réessayer · حاول مرة أخرى
          </button>
        </div>
      </body>
    </html>
  );
}
