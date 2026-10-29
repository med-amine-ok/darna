import { useTranslations } from "next-intl";

/** Route-level loading state for back-office pages (streamed while the server page resolves). */
export default function PanelLoading() {
  const t = useTranslations("errors");

  return (
    <div role="status" aria-live="polite" className="space-y-6 animate-pulse">
      <span className="sr-only">{t("loading")}</span>
      <div aria-hidden="true" className="space-y-2">
        <div className="h-7 w-64 max-w-full rounded-lg bg-neutral-200/80" />
        <div className="h-4 w-96 max-w-full rounded bg-neutral-200/60" />
      </div>
      <div aria-hidden="true" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-white border border-tertiary/60" />
        ))}
      </div>
      <div aria-hidden="true" className="rounded-2xl bg-white border border-tertiary/60 p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-5 rounded bg-neutral-200/60" />
        ))}
      </div>
    </div>
  );
}
