import { getTranslations } from "next-intl/server";
import { ShieldAlert } from "lucide-react";
import { Link } from "@/navigation";

/** 403 view rendered by guardPage() when the admin's role lacks a permission. */
export async function ForbiddenView() {
  const t = await getTranslations("auth.forbidden");
  return (
    <div
      role="alert"
      className="max-w-lg mx-auto mt-10 py-12 px-6 flex flex-col items-center justify-center text-center rounded-3xl border border-dashed border-tertiary/80 bg-white/60"
    >
      <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center text-accent-700 mb-3.5" aria-hidden="true">
        <ShieldAlert className="w-6 h-6" aria-hidden="true" />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">403</p>
      <h1 className="text-lg font-serif font-black text-primary mt-1">{t("title")}</h1>
      <p className="text-xs text-neutral-500 mt-1.5 max-w-sm">{t("description")}</p>
      <Link
        href="/"
        className="mt-5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
