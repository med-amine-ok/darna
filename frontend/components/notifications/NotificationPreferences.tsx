"use client";

/**
 * Notification preferences (/notifications): one row per topic (kinds grouped by their
 * family, e.g. booking.*), one switch per channel (email, SMS, push). In-app notifications
 * always exist. Switches the backend locks (critical email and SMS, BR-PRV-03) are shown
 * on and disabled. Saved through a server action (PUT /me/notification-preferences).
 */

import React, { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import type { NotificationPreference } from "@/types";
import { updateNotificationPreferencesAction } from "@/app/actions/notifications";
import { useActionError } from "@/hook/useActionError";
import { Banner } from "@/components/ui/Feedback";
import { Switch } from "@/components/ui";

const CHANNELS = ["email", "sms", "push"] as const;
type Channel = (typeof CHANNELS)[number];
const KNOWN_GROUPS = ["booking", "refund", "review", "message", "verification", "listing", "wallet"] as const;

const groupOf = (kind: string) => {
  const family = kind.split(".")[0];
  return (KNOWN_GROUPS as readonly string[]).includes(family) ? family : "other";
};

interface Cell {
  kinds: NotificationPreference[];
  enabled: boolean;
  locked: boolean;
}

export default function NotificationPreferences({
  initialPreferences,
}: {
  /** null when the API could not be reached. */
  initialPreferences: NotificationPreference[] | null;
}) {
  const t = useTranslations("notifications");
  const errorText = useActionError();
  const [prefs, setPrefs] = useState<NotificationPreference[] | null>(initialPreferences);
  const [saving, setSaving] = useState<string | null>(null);

  const rows = useMemo(() => {
    const groups = new Map<string, Record<Channel, Cell>>();
    for (const pref of prefs ?? []) {
      const group = groupOf(pref.kind);
      if (!groups.has(group)) {
        groups.set(group, {
          email: { kinds: [], enabled: false, locked: false },
          sms: { kinds: [], enabled: false, locked: false },
          push: { kinds: [], enabled: false, locked: false },
        });
      }
      groups.get(group)![pref.channel].kinds.push(pref);
    }
    for (const cells of Array.from(groups.values())) {
      for (const channel of CHANNELS) {
        const cell = cells[channel];
        const free = cell.kinds.filter((k) => !k.locked);
        cell.locked = cell.kinds.length > 0 && free.length === 0;
        cell.enabled = cell.kinds.length > 0 && (free.length ? free.every((k) => k.enabled) : true);
      }
    }
    const order = [...KNOWN_GROUPS, "other"];
    return Array.from(groups.entries()).sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  }, [prefs]);

  const toggle = async (group: string, channel: Channel, cell: Cell, next: boolean) => {
    const items = cell.kinds.filter((k) => !k.locked).map((k) => ({ kind: k.kind, channel, enabled: next }));
    if (!items.length) return;
    const key = `${group}:${channel}`;
    setSaving(key);
    try {
      const result = await updateNotificationPreferencesAction(items);
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      setPrefs(result.data);
      toast.success(t("prefs.saved"));
    } catch {
      toast.error(t("updateFailed"));
    } finally {
      setSaving(null);
    }
  };

  return (
    <section aria-labelledby="notification-prefs-title" className="mt-12">
      <h2 id="notification-prefs-title" className="font-serif text-heading text-primary-900">
        {t("prefs.title")}
      </h2>
      <p className="mt-1 text-meta text-primary-600">{t("prefs.subtitle")}</p>

      {prefs === null ? (
        <div className="mt-4">
          <Banner tone="danger">{t("prefs.loadFailed")}</Banner>
        </div>
      ) : rows.length === 0 ? null : (
        <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-e1">
          <table className="w-full min-w-[28rem] text-start text-body">
            <thead>
              <tr className="border-b border-primary/[0.06] text-meta text-primary-600">
                <th scope="col" className="p-4 text-start font-semibold">
                  {t("prefs.topic")}
                </th>
                {CHANNELS.map((channel) => (
                  <th key={channel} scope="col" className="p-4 text-center font-semibold">
                    {t(`prefs.channels.${channel}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/[0.06]">
              {rows.map(([group, cells]) => (
                <tr key={group}>
                  <th scope="row" className="p-4 text-start font-medium text-primary-900">
                    {t(`prefs.groups.${group}`)}
                  </th>
                  {CHANNELS.map((channel) => {
                    const cell = cells[channel];
                    const label = `${t(`prefs.groups.${group}`)}: ${t(`prefs.channels.${channel}`)}`;
                    return (
                      <td key={channel} className="p-4">
                        {cell.kinds.length === 0 ? null : (
                          <div className="flex justify-center" title={cell.locked ? t("prefs.locked") : undefined}>
                            <Switch
                              size="sm"
                              ariaLabel={cell.locked ? `${label}. ${t("prefs.locked")}` : label}
                              checked={cell.enabled}
                              disabled={cell.locked || saving !== null}
                              onCheckedChange={(next) => toggle(group, channel, cell, next)}
                            />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
