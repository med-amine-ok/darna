import { useTranslations } from "next-intl";

/** Route-level loading state: content-shaped skeletons (header, KPI strip, filter bar, table rows). */
export default function PanelLoading() {
  const t = useTranslations("errors");
  const widths = ["w-3/4", "w-1/2", "w-2/3", "w-2/5", "w-3/5"];

  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <span className="sr-only">{t("loading")}</span>
      <div aria-hidden="true" className="space-y-2.5">
        <div className="skeleton h-8 w-64 max-w-full rounded-lg" />
        <div className="skeleton h-4 w-96 max-w-full rounded-md" />
      </div>
      <div aria-hidden="true" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[88px] rounded-2xl bg-white shadow-e1 p-3.5 flex items-center gap-3">
            <div className="skeleton w-10 h-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-5 w-16 rounded-md" />
              <div className="skeleton h-3 w-24 rounded-md" />
            </div>
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="rounded-2xl bg-white shadow-e1 p-3.5 flex gap-3">
        <div className="skeleton h-10 flex-1 rounded-xl" />
        <div className="skeleton h-10 w-36 rounded-xl hidden sm:block" />
        <div className="skeleton h-10 w-36 rounded-xl hidden md:block" />
      </div>
      <div aria-hidden="true" className="rounded-2xl bg-white shadow-e1 overflow-hidden">
        <div className="h-11 bg-darnaBg-100 border-b border-primary/[0.08]" />
        {Array.from({ length: 7 }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3.5 border-b border-primary/[0.06] last:border-b-0">
            <div className="skeleton w-9 h-9 rounded-lg shrink-0" />
            {Array.from({ length: 4 }).map((__, c) => (
              <div key={c} className="flex-1">
                <div className={`skeleton h-3.5 rounded-md ${widths[(r + c) % widths.length]}`} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
