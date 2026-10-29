import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/navigation";

/** 404 for unknown admin URLs and for notFound() calls (unknown ids). */
export default function LocaleNotFound() {
  const t = useTranslations("errors");

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <Image
          src="/assets/404-illustration.png"
          alt=""
          width={1376}
          height={768}
          sizes="256px"
          className="mx-auto h-auto w-64"
          priority
        />
        <h1 className="mt-6 text-2xl font-serif font-black text-primary">{t("notFoundTitle")}</h1>
        <p className="mt-2 text-sm text-neutral-600 leading-relaxed">{t("notFoundDescription")}</p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] rounded-xl bg-primary hover:bg-primary-700 text-white text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
        >
          {t("backToDashboard")}
        </Link>
      </div>
    </main>
  );
}
