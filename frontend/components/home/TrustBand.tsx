"use client";

import { useTranslations } from "next-intl";
import SectionHeader from "@/components/ui/SectionHeader";
import { RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { BrandCashIcon, BrandMessageIcon, BrandShieldIcon } from "@/components/icons";

const ITEMS = [
  { Icon: BrandShieldIcon, title: "trustVerifiedTitle", body: "trustVerifiedBody" },
  { Icon: BrandCashIcon, title: "trustDinarTitle", body: "trustDinarBody" },
  { Icon: BrandMessageIcon, title: "trustSupportTitle", body: "trustSupportBody" },
] as const;

/** Three quiet trust promises (verified hosts, DZD all-in pricing, local support). */
export default function TrustBand() {
  const t = useTranslations("homeHero.sections");
  return (
    <section aria-labelledby="trust-heading" className="space-y-10">
      <SectionHeader id="trust-heading" eyebrow={t("trustEyebrow")} title={t("trustTitle")} align="center" />
      <RevealGroup as="ul" className="grid gap-5 md:grid-cols-3">
        {ITEMS.map(({ Icon, title, body }) => (
          <RevealItem as="li" key={title} className="relative rounded-3xl bg-white/70 shadow-e1 p-7 overflow-hidden">
            <div aria-hidden="true" className="absolute -top-10 -end-10 w-32 h-32 texture-zellige opacity-80 rounded-full" />
            <span className="relative w-12 h-12 rounded-2xl bg-secondary-50 text-secondary-700 flex items-center justify-center shadow-highlight ring-1 ring-secondary-200/60">
              <Icon size={22} />
            </span>
            <h3 className="relative mt-5 text-title font-semibold text-primary-900">{t(title)}</h3>
            <p className="relative mt-2 text-body text-primary-500">{t(body)}</p>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}
