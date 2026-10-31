"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { Switch } from "@/components/ui/Choice";
import { SectionHeader, SettingsCard } from "./settingsUi";

const ROWS = ["booking", "messages", "promo", "account"] as const;
const CHANNELS = ["Email", "Push", "Sms"] as const;

type MatrixKey = `${(typeof ROWS)[number]}${(typeof CHANNELS)[number]}`;

export default function NotificationsSection() {
  const t = useTranslations("settings");

  const [notifMatrix, setNotifMatrix] = useState<Record<MatrixKey, boolean>>({
    bookingEmail: true,
    bookingPush: true,
    bookingSms: true,
    messagesEmail: true,
    messagesPush: true,
    messagesSms: false,
    promoEmail: false,
    promoPush: true,
    promoSms: false,
    accountEmail: true,
    accountPush: true,
    accountSms: true,
  });

  const toggleNotif = (key: MatrixKey) => {
    setNotifMatrix((prev) => ({ ...prev, [key]: !prev[key] }));
    toast.success(t("notifications.updated"));
  };

  return (
    <section aria-labelledby="settings-notifications-title" className="space-y-6">
      <SectionHeader
        id="settings-notifications-title"
        title={t("notifications.title")}
        description={t("notifications.description")}
      />

      <SettingsCard padding="none" className="overflow-hidden">
        <table className="w-full text-start">
          <caption className="sr-only">{t("notifications.title")}</caption>
          <thead>
            <tr className="border-b border-primary/[0.08] bg-darnaBg-300/40 text-meta text-primary-600">
              <th scope="col" className="px-4 py-3 text-start font-semibold sm:px-6">
                {t("notifications.type")}
              </th>
              {CHANNELS.map((ch) => (
                <th key={ch} scope="col" className="w-16 px-1 py-3 text-center font-semibold sm:w-24">
                  {t(`notifications.channel${ch}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/[0.08]">
            {ROWS.map((row) => (
              <tr key={row}>
                <th scope="row" className="px-4 py-4 text-start text-body font-medium text-primary-900 sm:px-6">
                  {t(`notifications.rows.${row}`)}
                </th>
                {CHANNELS.map((ch) => {
                  const key = `${row}${ch}` as MatrixKey;
                  return (
                    <td key={ch} className="px-1 py-4 text-center">
                      <Switch
                        size="sm"
                        checked={notifMatrix[key]}
                        onCheckedChange={() => toggleNotif(key)}
                        ariaLabel={t("notifications.toggleLabel", {
                          type: t(`notifications.rows.${row}`),
                          channel: t(`notifications.channel${ch}`),
                        })}
                        className="inline-flex"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </SettingsCard>
    </section>
  );
}
