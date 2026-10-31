"use client";

import React from "react";
import { m } from "framer-motion";
import { useTranslations } from "next-intl";
import { useMotionPreference } from "@/components/motion/MotionProvider";
import { useIsRtl } from "@/components/ui/hooks";
import { SectionHeader, SettingsCard, SwitchRow } from "./settingsUi";

/**
 * Accessibility: in-app "Reduce motion" on top of the OS setting. "reduce" forces
 * MotionConfig reducedMotion="always" and <html data-reduce-motion>; "system" follows
 * prefers-reduced-motion. Stored on this device (localStorage) by MotionProvider.
 */
export default function AccessibilitySection() {
  const t = useTranslations("settings");
  const { preference, setPreference } = useMotionPreference();
  const reduced = preference === "reduce";
  const isRtl = useIsRtl();

  return (
    <section aria-labelledby="settings-accessibility-title" className="space-y-6">
      <SectionHeader
        id="settings-accessibility-title"
        title={t("accessibility.title")}
        description={t("accessibility.description")}
      />
      <SettingsCard>
        <SwitchRow
          label={t("accessibility.reduceMotion")}
          description={t("accessibility.reduceMotionDescription")}
          checked={reduced}
          onChange={(next) => setPreference(next ? "reduce" : "system")}
        />
        <div className="mt-5 flex items-center gap-4 rounded-2xl bg-darnaBg-300/60 p-4" aria-hidden="true">
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-primary/10">
            <m.span
              className="absolute inset-y-0 start-0 w-1/3 rounded-full bg-accent-500"
              animate={{ x: ["0%", isRtl ? "-200%" : "200%", "0%"] }}
              transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity }}
            />
          </div>
          <m.span
            className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-e1"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-secondary-600" />
          </m.span>
        </div>
        <p className="mt-2 text-meta text-primary-600" aria-live="polite">
          {reduced ? t("accessibility.previewReduced") : t("accessibility.previewFull")}
        </p>
      </SettingsCard>
    </section>
  );
}
