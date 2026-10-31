import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/navigation";
import { BrandSearchIcon, BrandPinIcon } from "@/components/icons";
import ArchImage from "@/components/ui/ArchImage";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { POPULAR_DESTINATIONS } from "@/components/search/destinations";
import { imagery, wilayaImagery } from "@/lib/imagery";

export async function generateMetadata() {
  const t = await getTranslations("errors");
  return { title: t("notFoundMetaTitle"), robots: { index: false } };
}

const POPULAR_KEYS = ["algiers", "oran", "constantine", "ghardaia", "djanet", "taghit"];

/**
 * Localized 404: editorial split with an arch-masked Tassili photograph, a search box
 * (plain GET form to /search, works without JS) and popular wilayas.
 */
export default async function NotFound() {
  const t = await getTranslations("errors");
  const tDest = await getTranslations("search.destinations");
  const locale = await getLocale();
  const popular = POPULAR_DESTINATIONS.filter((d) => POPULAR_KEYS.includes(d.key));

  return (
    <div className="relative overflow-hidden bg-darnaBg">
      <div aria-hidden="true" className="texture-zellige pointer-events-none absolute inset-x-0 top-0 h-80 opacity-50" />
      <div className="relative mx-auto grid min-h-[80dvh] w-full max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16 lg:px-8 lg:py-20">
        <div className="order-2 lg:order-1">
          <p className="enter-up flex items-center gap-2 text-eyebrow uppercase font-semibold text-secondary-700">
            <span aria-hidden="true" className="h-px w-6 bg-secondary-600/60" />
            {t("notFoundEyebrow")}
          </p>
          <h1
            className="enter-up mt-3 font-serif text-display-lg text-primary-900 [text-wrap:balance]"
            style={{ animationDelay: "60ms" }}
          >
            {t("notFoundTitle")}
          </h1>
          <p className="enter-up mt-4 max-w-[52ch] text-body-lg text-primary-600" style={{ animationDelay: "120ms" }}>
            {t("notFoundBody")}
          </p>

          <form
            action={`/${locale}/search`}
            method="get"
            role="search"
            className="enter-up mt-8 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-start"
            style={{ animationDelay: "180ms" }}
          >
            <Input
              name="destination"
              label={t("notFoundSearchLabel")}
              prefix={<BrandSearchIcon size={18} aria-hidden="true" />}
              autoComplete="off"
              containerClassName="sm:flex-1"
            />
            <Button type="submit" size="lg" className="sm:mt-0.5">
              {t("notFoundSearchSubmit")}
            </Button>
          </form>

          <div className="enter-up mt-8" style={{ animationDelay: "240ms" }}>
            <h2 className="text-meta font-semibold text-primary-800">{t("notFoundPopular")}</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {popular.map((d) => (
                <li key={d.key}>
                  <Link
                    href={{ pathname: "/search", query: { destination: d.name } }}
                    className="group inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white py-1 pe-4 ps-1 text-meta font-semibold text-primary-800 shadow-e1 transition-[box-shadow,transform] duration-fast ease-standard hover:-translate-y-0.5 hover:shadow-e2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 focus-visible:ring-offset-darnaBg"
                  >
                    {wilayaImagery[d.key] ? (
                      <span
                        aria-hidden="true"
                        className="h-9 w-9 shrink-0 rounded-full bg-tertiary-100 bg-cover bg-center"
                        style={{ backgroundImage: `url(${wilayaImagery[d.key]}?auto=format&fit=crop&w=96&q=60)` }}
                      />
                    ) : (
                      <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full bg-secondary-100 text-secondary-700">
                        <BrandPinIcon size={16} />
                      </span>
                    )}
                    {tDest(`${d.key}.name`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="enter-up mt-10 flex flex-wrap gap-3" style={{ animationDelay: "300ms" }}>
            <Button href="/" variant="secondary">
              {t("explore")}
            </Button>
            <Button href="/help" variant="ghost">
              {t("notFoundHelp")}
            </Button>
          </div>
        </div>

        <div className="relative order-1 mx-auto w-full max-w-[15rem] sm:max-w-[18rem] lg:order-2 lg:max-w-[24rem]">
          <ArchImage
            src={imagery.tassiliArch}
            alt={t("notFoundImageAlt")}
            sizes="(min-width: 1024px) 384px, 288px"
            priority
            className="aspect-[4/5] enter-rise"
          />
          <span
            aria-hidden="true"
            className="enter-pop absolute -bottom-4 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 rounded-full bg-white px-5 py-2 font-serif text-heading tabular-nums text-primary-900 shadow-e3"
            style={{ animationDelay: "400ms" }}
          >
            404
          </span>
        </div>
      </div>
    </div>
  );
}
