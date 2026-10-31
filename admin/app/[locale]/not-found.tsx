import { useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { ArchRosette } from "@/components/ui/EmptyState";

/** 404 for unknown admin URLs and for notFound() calls (unknown ids). */
export default function LocaleNotFound() {
  const t = useTranslations("errors");

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-md w-full p-8 sm:p-10 rounded-2xl bg-white shadow-e1 text-center flex flex-col items-center">
        <div className="w-24 h-24 rounded-full bg-darnaBg-300/70 grid place-items-center" aria-hidden="true">
          <ArchRosette className="w-16 h-16" />
        </div>
        <p className="mt-5 font-serif text-display-md text-primary-300 leading-none tabular-nums" aria-hidden="true">
          404
        </p>
        <h1 className="mt-3 font-serif text-heading text-primary-900">{t("notFoundTitle")}</h1>
        <p className="mt-2 text-meta text-primary-600 leading-relaxed">{t("notFoundDescription")}</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center px-5 min-h-[44px] rounded-xl bg-primary-800 hover:bg-primary-900 text-white text-meta font-semibold shadow-e1 shadow-highlight transition duration-fast ease-standard active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
        >
          {t("backToDashboard")}
        </Link>
      </div>
    </main>
  );
}
