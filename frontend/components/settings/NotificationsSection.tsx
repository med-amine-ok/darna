"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { SectionHeader } from "./settingsUi";

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

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-start">
          <caption className="sr-only">{t("notifications.title")}</caption>
          <thead>
            <tr className="border-b border-tertiary/60 text-neutral-600">
              <th scope="col" className="py-3 text-start font-semibold">
                {t("notifications.type")}
              </th>
              {CHANNELS.map((ch) => (
                <th key={ch} scope="col" className="py-3 text-center font-semibold">
                  {t(`notifications.channel${ch}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-tertiary/30">
            {ROWS.map((row) => (
              <tr key={row}>
                <th scope="row" className="py-3 text-start font-semibold text-primary">
                  {t(`notifications.rows.${row}`)}
                </th>
                {CHANNELS.map((ch) => {
                  const key = `${row}${ch}` as MatrixKey;
                  return (
                    <td key={ch} className="text-center py-3">
                      <input
                        type="checkbox"
                        checked={notifMatrix[key]}
                        onChange={() => toggleNotif(key)}
                        aria-label={t("notifications.toggleLabel", {
                          type: t(`notifications.rows.${row}`),
                          channel: t(`notifications.channel${ch}`),
                        })}
                        className="rounded text-primary focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
