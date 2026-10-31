import { getTranslations } from "next-intl/server";
import { Link } from "@/navigation";
import { ArchRosette } from "@/components/ui/EmptyState";

/** 403 view rendered by guardPage() when the admin's role lacks a permission. */
export async function ForbiddenView() {
  const t = await getTranslations("auth.forbidden");
  return (
    <div
      role="alert"
      className="max-w-lg mx-auto mt-10 py-10 px-6 sm:px-10 flex flex-col items-center justify-center text-center rounded-2xl bg-white shadow-e1"
    >
      <div className="w-20 h-20 rounded-full bg-darnaBg-300/70 grid place-items-center mb-4" aria-hidden="true">
        <ArchRosette className="w-14 h-14" />
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-700">403</p>
      <h1 className="font-serif text-heading text-primary-900 mt-1">{t("title")}</h1>
      <p className="text-meta text-primary-600 mt-2 max-w-sm">{t("description")}</p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center px-4 min-h-[44px] sm:min-h-[40px] rounded-xl bg-primary-800 hover:bg-primary-900 text-white text-meta font-semibold shadow-e1 shadow-highlight transition duration-fast ease-standard active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
