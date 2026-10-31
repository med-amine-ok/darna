"use client";

import { useTranslations } from "next-intl";
import { BrandShieldIcon } from "@/components/icons";

/**
 * Price breakdown line: DARNA charges travellers nothing; its commission is paid by the
 * host out of their payout (lib/booking/config.ts).
 */
export default function NoGuestFees() {
  const t = useTranslations("listing");
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-secondary-50 px-3 py-2.5 text-meta text-secondary-800">
      <BrandShieldIcon size={15} className="mt-0.5 shrink-0 text-secondary-700" aria-hidden="true" />
      <p>
        <span className="font-semibold">{t("noGuestFees")}</span> {t("noGuestFeesHint")}
      </p>
    </div>
  );
}
