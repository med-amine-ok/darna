"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Mail,
  Send,
  MessageSquare,
  Bell,
  FileText,
  Search,
  PlusCircle,
  Languages,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { Dialog } from "@/components/ui/Dialog";
import { formatDate, formatDateTime, formatNumber } from "@/lib/utils/format";

export interface MessagesClientProps {
  locale: string;
  initialTab?: "conversations" | "notifications" | "templates";
}

type SenderRole =
  | { key: "individualHost" | "travelAgency"; place: string }
  | { key: "traveler"; place?: undefined };

interface MessageThread {
  id: string;
  senderName: string;
  senderRole: SenderRole;
  lastMessage: string;
  /** ISO timestamp of the last message */
  time: string;
  unreadCount: number;
  avatar?: string;
  messages: {
    id: string;
    sender: "user" | "admin";
    text: string;
    /** ISO timestamp */
    time: string;
  }[];
}

const FIELD =
  "w-full rounded-xl bg-white border border-primary/[0.12] p-2.5 text-primary focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary/[0.08] shadow-2xs hover:border-primary/25";
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

// Mock sent notifications (titles are record data; channel/recipient labels are translated).
const SENT_NOTIFICATIONS = [
  {
    id: "n1",
    at: "2024-10-20T09:30:00",
    title: "Votre annonce Villa Hydra est désormais en ligne",
    channelKey: "channelEmailInApp",
    recipient: { kind: "host", name: "Ahmed Benali" },
  },
  {
    id: "n2",
    at: "2024-10-18T14:15:00",
    title: "Rappel : mise à jour des conditions tarifaires 2025",
    channelKey: "channelBroadcast",
    recipient: { kind: "allProviders", count: 450 },
  },
] as const;

const TEMPLATES = [
  { id: "booking", titleKey: "bookingTitle", descKey: "bookingDesc", bodyKey: "bookingBody" },
  { id: "docs", titleKey: "docsTitle", descKey: "docsDesc", bodyKey: "docsBody" },
] as const;

export default function MessagesClient({
  locale,
  initialTab = "conversations",
}: MessagesClientProps) {
  const t = useTranslations("inbox");
  const tCommon = useTranslations("common");
  const { success, info } = useToast();
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [search, setSearch] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState<string>("thread_1");
  const [replyText, setReplyText] = useState("");
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);

  // Initial mock threads
  const [threads, setThreads] = useState<MessageThread[]>([
    {
      id: "thread_1",
      senderName: "Ahmed Benali",
      senderRole: { key: "individualHost", place: "Hydra" },
      lastMessage: "Bonjour, j'ai envoyé les justificatifs de propriété pour la Villa Hydra.",
      time: "2024-10-21T10:24:00",
      unreadCount: 1,
      messages: [
        {
          id: "m1",
          sender: "user",
          text: "Bonjour, j'ai déposé une demande de validation pour mon hébergement. Est-il possible d'avoir un retour ?",
          time: "2024-10-20T16:40:00",
        },
        {
          id: "m2",
          sender: "admin",
          text: "Bonjour Ahmed, nous vérifions actuellement votre titre de propriété et votre pièce d'identité. Comptez 24 à 48 heures.",
          time: "2024-10-20T17:15:00",
        },
        {
          id: "m3",
          sender: "user",
          text: "Bonjour, j'ai envoyé les justificatifs de propriété pour la Villa Hydra. Merci !",
          time: "2024-10-21T10:24:00",
        },
      ],
    },
    {
      id: "thread_2",
      senderName: "Voyages Sahara Evasion",
      senderRole: { key: "travelAgency", place: "Tamanrasset" },
      lastMessage: "Nous souhaitons augmenter la taille maximale des groupes pour le circuit Tassili.",
      time: "2024-10-20T14:00:00",
      unreadCount: 0,
      messages: [
        {
          id: "m4",
          sender: "user",
          text: "Bonjour le support BLADUS, nous souhaitons passer le groupe max à 16 personnes.",
          time: "2024-10-20T14:00:00",
        },
      ],
    },
    {
      id: "thread_3",
      senderName: "Karim Mansouri",
      senderRole: { key: "traveler" },
      lastMessage: "Merci pour le remboursement rapide de la réservation annulée.",
      time: "2024-03-12T11:00:00",
      unreadCount: 0,
      messages: [
        {
          id: "m5",
          sender: "user",
          text: "Merci pour le remboursement rapide de la réservation annulée.",
          time: "2024-03-12T11:00:00",
        },
      ],
    },
  ]);

  const activeThread = threads.find((th) => th.id === selectedThreadId) || threads[0];

  const roleLabel = (role: SenderRole) =>
    role.key === "traveler" ? t("roles.traveler") : t(`roles.${role.key}`, { place: role.place });

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    setThreads((prev) =>
      prev.map((th) => {
        if (th.id === activeThread.id) {
          return {
            ...th,
            messages: [
              ...th.messages,
              {
                id: `m_${Date.now()}`,
                sender: "admin",
                text: replyText.trim(),
                time: new Date().toISOString(),
              },
            ],
            unreadCount: 0,
          };
        }
        return th;
      })
    );
    setReplyText("");
    success(t("sent"));
  };

  const kpis = [
    {
      id: "all",
      label: t("kpi.conversations"),
      value: threads.length,
      icon: MessageSquare,
      colorVariant: "primary" as const,
      active: activeTab === "conversations",
      onClick: () => setActiveTab("conversations"),
    },
    {
      id: "unread",
      label: t("kpi.unread"),
      value: 3,
      icon: Mail,
      colorVariant: "accent" as const,
      active: false,
    },
    {
      id: "notifications",
      label: t("kpi.notificationsSent"),
      value: 1420,
      icon: Bell,
      colorVariant: "secondary" as const,
      active: activeTab === "notifications",
      onClick: () => setActiveTab("notifications"),
    },
    {
      id: "templates",
      label: t("kpi.templates"),
      value: 18,
      icon: FileText,
      colorVariant: "tertiary" as const,
      active: activeTab === "templates",
      onClick: () => setActiveTab("templates"),
    },
  ];

  return (
    <div className="space-y-6 text-start">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        actions={[
          {
            label: t("sendNotification"),
            icon: <PlusCircle className="w-4 h-4" aria-hidden="true" />,
            variant: "primary",
            onClick: () => setNotificationDialogOpen(true),
          },
        ]}
      />

      <KpiStrip cards={kpis} />

      <Tabs
        items={[
          { id: "conversations", label: t("tabs.conversations"), count: threads.length, icon: <MessageSquare className="w-4 h-4" aria-hidden="true" /> },
          { id: "notifications", label: t("tabs.notifications"), icon: <Bell className="w-4 h-4" aria-hidden="true" /> },
          { id: "templates", label: t("tabs.templates"), icon: <Languages className="w-4 h-4" aria-hidden="true" /> },
        ]}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      {/* Conversations Tab */}
      {activeTab === "conversations" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[560px]">
          {/* Threads List */}
          <div className="lg:col-span-5 bg-white rounded-2xl overflow-hidden flex flex-col shadow-e1">
            <div className="p-3.5 border-b border-primary/[0.08]">
              <div className="relative">
                <label htmlFor="inbox-search" className="sr-only">{t("searchLabel")}</label>
                <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-500" aria-hidden="true" />
                <input
                  id="inbox-search"
                  type="search"
                  placeholder={t("searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-xs rounded-xl bg-white border border-primary/[0.12] py-2 ps-9 pe-3 text-primary focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary/[0.08] shadow-2xs hover:border-primary/25"
                />
              </div>
            </div>

            <ul className="divide-y divide-primary/[0.06] overflow-y-auto flex-1" aria-label={t("threadsLabel")}>
              {threads.map((thread) => {
                const isSelected = thread.id === activeThread.id;
                return (
                  <li key={thread.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedThreadId(thread.id)}
                      aria-current={isSelected ? "true" : undefined}
                      className={`w-full text-start p-4 transition-all cursor-pointer flex items-start gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-600 ${
                        isSelected
                          ? "bg-secondary/10 border-s-4 border-s-secondary"
                          : "hover:bg-neutral-50/70"
                      }`}
                    >
                      <Avatar name={thread.senderName} size={40} />
                      <span className="min-w-0 flex-1 block">
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-xs text-primary truncate">
                            {thread.senderName}
                          </span>
                          <time dateTime={thread.time} className="text-[11px] text-neutral-500 font-mono shrink-0">
                            {formatDate(thread.time, locale)}
                          </time>
                        </span>
                        <span className="text-[11px] text-neutral-500 block truncate">
                          {roleLabel(thread.senderRole)}
                        </span>
                        <span className="text-xs text-neutral-600 line-clamp-1 mt-1 block">
                          {thread.lastMessage}
                        </span>
                      </span>
                      {thread.unreadCount > 0 && (
                        <span className="shrink-0 mt-1">
                          <span className="block w-2.5 h-2.5 rounded-full bg-accent" aria-hidden="true" />
                          <span className="sr-only">{t("unread", { count: thread.unreadCount })}</span>
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Active Thread Message Viewer */}
          <div className="lg:col-span-7 bg-white rounded-2xl flex flex-col overflow-hidden shadow-e1">
            {/* Header */}
            <div className="p-4 border-b border-primary/[0.08] flex items-center justify-between gap-3 bg-darnaBg/30">
              <div className="flex items-center gap-3">
                <Avatar name={activeThread.senderName} size={42} />
                <div>
                  <h2 className="font-semibold text-sm text-primary">{activeThread.senderName}</h2>
                  <span className="text-xs text-neutral-500">{roleLabel(activeThread.senderRole)}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => info(t("profileOpened"))}>
                {t("viewProfile")}
              </Button>
            </div>

            {/* Messages Scroll Area */}
            <div
              role="log"
              aria-live="polite"
              aria-label={t("messagesLabel", { name: activeThread.senderName })}
              tabIndex={0}
              className={`flex-1 p-5 overflow-y-auto space-y-4 bg-neutral-50/30 ${FOCUS_RING}`}
            >
              {activeThread.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === "admin" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                      msg.sender === "admin"
                        ? "bg-primary text-white rounded-ee-none"
                        : "bg-white text-primary-800 rounded-es-none shadow-e1"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <time dateTime={msg.time} className="text-[11px] text-neutral-500 mt-1 px-1">
                    {formatDateTime(msg.time, locale)}
                  </time>
                </div>
              ))}
            </div>

            {/* Reply Composer */}
            <div className="p-3 border-t border-primary/[0.08] bg-white space-y-2">
              <div className="flex items-center gap-2">
                <label htmlFor="inbox-reply" className="sr-only">
                  {t("replyLabel", { name: activeThread.senderName })}
                </label>
                <textarea
                  id="inbox-reply"
                  rows={2}
                  placeholder={t("replyPlaceholder")}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full text-xs rounded-xl bg-white border border-primary/[0.12] p-2.5 text-primary focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary/[0.08] resize-none shadow-2xs hover:border-primary/25"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                />
                <Button
                  variant="primary"
                  className="px-4 py-3 h-auto"
                  onClick={handleSendReply}
                  aria-label={t("send")}
                  title={t("send")}
                >
                  <Send className="w-4 h-4 rtl:-scale-x-100" aria-hidden="true" />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-neutral-500 flex-wrap">
                <span>{t("quickReplies")}</span>
                <button
                  type="button"
                  onClick={() => setReplyText(t("quick.validatedText"))}
                  className={`underline hover:text-primary cursor-pointer rounded ${FOCUS_RING}`}
                >
                  {t("quick.validatedLabel")}
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => setReplyText(t("quick.moreInfoText"))}
                  className={`underline hover:text-primary cursor-pointer rounded ${FOCUS_RING}`}
                >
                  {t("quick.moreInfoLabel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="relative bg-white rounded-2xl overflow-x-auto shadow-e1">
          <table className="w-full text-xs text-start">
            <thead className="bg-darnaBg-100 text-primary-600 [&_th]:whitespace-nowrap font-semibold border-b border-primary/[0.08]">
              <tr>
                <th scope="col" className="py-3 px-4 text-start">{t("notifications.colDate")}</th>
                <th scope="col" className="py-3 px-4 text-start">{t("notifications.colTitle")}</th>
                <th scope="col" className="py-3 px-4 text-start">{t("notifications.colChannel")}</th>
                <th scope="col" className="py-3 px-4 text-start">{t("notifications.colRecipients")}</th>
                <th scope="col" className="py-3 px-4 text-start">{t("notifications.colStatus")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/[0.06]">
              {SENT_NOTIFICATIONS.map((n) => (
                <tr key={n.id} className="hover:bg-darnaBg-100">
                  <td className="py-3 px-4 tabular-nums text-neutral-500 whitespace-nowrap">
                    <time dateTime={n.at}>{formatDateTime(n.at, locale)}</time>
                  </td>
                  <td className="py-3 px-4 font-semibold text-primary">{n.title}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-neutral-100 text-primary">
                      {t(`notifications.${n.channelKey}`)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-neutral-600">
                    {n.recipient.kind === "host"
                      ? t("notifications.recipientHost", { name: n.recipient.name })
                      : t("notifications.allProviders", { count: formatNumber(n.recipient.count, locale) })}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-secondary/15 text-secondary">
                      {t("notifications.delivered")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TEMPLATES.map((tpl) => (
            <div key={tpl.id} className="bg-white rounded-2xl p-5 space-y-3 shadow-e1">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-sm text-primary">{t(`templates.${tpl.titleKey}`)}</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600" dir="ltr">
                  {t("templates.languages")}
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                {t(`templates.${tpl.descKey}`)}
              </p>
              <div className="bg-darnaBg-100 p-3 rounded-xl text-[11px] font-mono text-primary leading-relaxed">
                {/* raw: the {placeholders} are template variables, shown literally */}
                {t.raw(`templates.${tpl.bodyKey}`) as string}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Broadcast Notification Dialog */}
      <Dialog
        isOpen={notificationDialogOpen}
        onClose={() => setNotificationDialogOpen(false)}
        title={t("broadcast.title")}
        description={t("broadcast.description")}
      >
        <div className="space-y-4 text-xs text-start">
          <div>
            <label htmlFor="broadcast-target" className="block font-semibold text-primary mb-1">
              {t("broadcast.target")}
            </label>
            <select id="broadcast-target" className={`${FIELD} cursor-pointer`}>
              <option value="all_users">{t("broadcast.targetAllUsers")}</option>
              <option value="all_providers">{t("broadcast.targetAllProviders")}</option>
              <option value="home_hosts">{t("broadcast.targetHomeHosts")}</option>
              <option value="agencies">{t("broadcast.targetAgencies")}</option>
            </select>
          </div>

          <div>
            <label htmlFor="broadcast-title" className="block font-semibold text-primary mb-1">
              {t("broadcast.notifTitle")}
            </label>
            <input
              id="broadcast-title"
              type="text"
              placeholder={t("broadcast.notifTitlePlaceholder")}
              className={FIELD}
            />
          </div>

          <div>
            <label htmlFor="broadcast-message" className="block font-semibold text-primary mb-1">
              {t("broadcast.message")}
            </label>
            <textarea
              id="broadcast-message"
              rows={3}
              placeholder={t("broadcast.messagePlaceholder")}
              className={`${FIELD} resize-none`}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setNotificationDialogOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                success(t("broadcast.sent"));
                setNotificationDialogOpen(false);
              }}
            >
              {t("broadcast.submit")}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
