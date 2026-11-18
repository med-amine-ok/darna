"use client";

import React from "react";
import { useTranslations } from "next-intl";
import type { NotificationPreference } from "@/types";
import NotificationPreferences from "@/components/notifications/NotificationPreferences";
import { SectionHeader } from "./settingsUi";

/** The real notification switches (GET / PUT /me/notification-preferences), shared with /notifications. */
export default function NotificationsSection({
  preferences,
}: {
  /** null when the API could not be reached. */
  preferences: NotificationPreference[] | null;
}) {
  const t = useTranslations("settings");
  return (
    <section aria-labelledby="settings-notifications-title" className="space-y-6">
      <SectionHeader
        id="settings-notifications-title"
        title={t("notifications.title")}
        description={t("notifications.description")}
      />
      <NotificationPreferences initialPreferences={preferences} />
    </section>
  );
}
