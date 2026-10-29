import Image, { getImageProps } from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/navigation";

export async function generateMetadata() {
  const t = await getTranslations("errors");
  return { title: t("notFoundMetaTitle"), robots: { index: false } };
}

export default async function NotFound() {
  const t = await getTranslations("errors");
  const common = { alt: "", sizes: "288px", className: "object-contain" };
  const {
    props: { srcSet: mobileSrcSet },
  } = getImageProps({ ...common, src: "/assets/404-illustration-mobile.png", width: 640, height: 1147 });

  return (
    <div className="min-h-[85dvh] flex flex-col items-center justify-center p-6 text-center">
      <div className="relative w-72 h-72 mb-6">
        <picture>
          <source media="(max-width: 640px)" srcSet={mobileSrcSet} />
          <Image {...common} alt="" src="/assets/404-illustration.png" fill priority />
        </picture>
      </div>
      <h1 className="text-3xl font-bold text-primary mb-2">{t("notFoundTitle")}</h1>
      <p className="text-sm text-neutral-600 max-w-md mb-8">{t("notFoundBody")}</p>
      <Link
        href="/"
        className="px-8 py-3 rounded-full bg-accent-600 text-white font-medium hover:bg-accent-700 transition shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
      >
        {t("explore")}
      </Link>
    </div>
  );
}
