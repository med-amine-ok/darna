"use client";

import { useTranslations } from "next-intl";
import { m } from "framer-motion";
import { Link } from "@/navigation";
import ArchImage from "@/components/ui/ArchImage";
import { Reveal } from "@/components/motion/Reveal";
import { imagery } from "@/lib/imagery";
import { pressable } from "@/lib/motion";
import { BrandArrowRightIcon } from "@/components/icons";

/** Dark ink band inviting hosts, with zellige texture and an arch-masked riad photo. */
export default function HostCta() {
  const t = useTranslations("homeHero.sections");
  return (
    <Reveal as="section" className="relative overflow-hidden rounded-[2rem] bg-primary-800 text-white shadow-e4">
      <div aria-hidden="true" className="texture-zellige-dark zellige-fade-edges pointer-events-none absolute inset-0 opacity-80" />
      <div aria-hidden="true" className="absolute -bottom-32 -start-24 w-[28rem] h-[28rem] rounded-full bg-[radial-gradient(closest-side,rgba(122,145,104,0.35),rgba(122,145,104,0))]" />
      <div className="relative grid md:grid-cols-12 gap-10 items-center p-8 sm:p-12 lg:p-16">
        <div className="md:col-span-7">
          <p className="flex items-center gap-2 text-eyebrow uppercase font-semibold text-tertiary-300">
            <span aria-hidden="true" className="h-px w-6 bg-tertiary-300/60" />
            {t("hostEyebrow")}
          </p>
          <h2 className="mt-4 font-serif text-display-md text-white max-w-[20ch]">{t("hostTitle")}</h2>
          <p className="mt-4 text-body-lg text-white/75 max-w-[48ch]">{t("hostBody")}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <m.span {...pressable} className="inline-flex">
              <Link
                href="/become-a-host"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-cta text-white font-semibold shadow-glow hover:brightness-110 transition duration-fast ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary-200 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-800"
              >
                {t("hostCta")}
                <BrandArrowRightIcon size={16} className="rtl:rotate-180" />
              </Link>
            </m.span>
            <Link
              href="/help"
              className="text-sm font-semibold text-white/85 hover:text-white rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary-200 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-800"
            >
              <span className="link-underline pb-0.5">{t("hostSecondary")}</span>
            </Link>
          </div>
        </div>
        <div className="md:col-span-5 hidden md:block">
          <ArchImage
            src={`${imagery.riadCourtyard}?auto=format&fit=crop&w=900&q=78`}
            alt=""
            sizes="(min-width: 1024px) 380px, 40vw"
            className="aspect-[4/5] max-w-[340px] ms-auto"
          />
        </div>
      </div>
    </Reveal>
  );
}
