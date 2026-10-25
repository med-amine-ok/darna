"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Mail,
  Send,
  MessageSquare,
  Bell,
  FileText,
  User,
  Clock,
  CheckCheck,
  Search,
  PlusCircle,
  Copy,
  Languages,
  CheckCircle2,
  AlertCircle,
  Download,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/ui/StatusPill";
import { Avatar } from "@/components/ui/Avatar";
import { useToast } from "@/components/ui/Toast";
import { Dialog } from "@/components/ui/Dialog";

export interface MessagesClientProps {
  locale: string;
  initialTab?: "conversations" | "notifications" | "templates";
}

interface MessageThread {
  id: string;
  senderName: string;
  senderRole: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  avatar?: string;
  messages: {
    id: string;
    sender: "user" | "admin";
    text: string;
    time: string;
  }[];
}

export default function MessagesClient({
  locale,
  initialTab = "conversations",
}: MessagesClientProps) {
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
      senderRole: "Hôte particulier · Hydra",
      lastMessage: "Bonjour, j'ai envoyé les justificatifs de propriété pour la Villa Hydra.",
      time: "10:24",
      unreadCount: 1,
      messages: [
        {
          id: "m1",
          sender: "user",
          text: "Bonjour, j'ai déposé une demande de validation pour mon hébergement. Est-il possible d'avoir un retour ?",
          time: "Hier 16:40",
        },
        {
          id: "m2",
          sender: "admin",
          text: "Bonjour Ahmed, nous vérifions actuellement votre titre de propriété et votre pièce d'identité. Comptez 24 à 48 heures.",
          time: "Hier 17:15",
        },
        {
          id: "m3",
          sender: "user",
          text: "Bonjour, j'ai envoyé les justificatifs de propriété pour la Villa Hydra. Merci !",
          time: "Aujourd'hui 10:24",
        },
      ],
    },
    {
      id: "thread_2",
      senderName: "Voyages Sahara Evasion",
      senderRole: "Agence de voyage · Tamanrasset",
      lastMessage: "Nous souhaitons augmenter la taille maximale des groupes pour le circuit Tassili.",
      time: "Hier",
      unreadCount: 0,
      messages: [
        {
          id: "m4",
          sender: "user",
          text: "Bonjour le support DARNA, nous souhaitons passer le groupe max à 16 personnes.",
          time: "Hier 14:00",
        },
      ],
    },
    {
      id: "thread_3",
      senderName: "Karim Mansouri",
      senderRole: "Voyageur",
      lastMessage: "Merci pour le remboursement rapide de la réservation annulée.",
      time: "12 mars",
      unreadCount: 0,
      messages: [
        {
          id: "m5",
          sender: "user",
          text: "Merci pour le remboursement rapide de la réservation annulée.",
          time: "12 mars 11:00",
        },
      ],
    },
  ]);

  const activeThread = threads.find((t) => t.id === selectedThreadId) || threads[0];

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id === activeThread.id) {
          return {
            ...t,
            messages: [
              ...t.messages,
              {
                id: `m_${Date.now()}`,
                sender: "admin",
                text: replyText.trim(),
                time: "À l'instant",
              },
            ],
            unreadCount: 0,
          };
        }
        return t;
      })
    );
    setReplyText("");
    success("Message envoyé avec succès");
  };

  const kpis = [
    {
      id: "all",
      label: "Conversations actives",
      value: threads.length,
      icon: MessageSquare,
      colorVariant: "primary" as const,
      active: activeTab === "conversations",
      onClick: () => setActiveTab("conversations"),
    },
    {
      id: "unread",
      label: "Messages non lus",
      value: 3,
      icon: Mail,
      colorVariant: "accent" as const,
      active: false,
    },
    {
      id: "notifications",
      label: "Notifications envoyées",
      value: 1420,
      icon: Bell,
      colorVariant: "secondary" as const,
      active: activeTab === "notifications",
      onClick: () => setActiveTab("notifications"),
    },
    {
      id: "templates",
      label: "Modèles configurés",
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
        title="Messagerie & Communications"
        subtitle="Gérez les échanges avec les utilisateurs, notifications automatiques et modèles multilingues."
        actions={[
          {
            label: "Envoyer une notification",
            icon: <PlusCircle className="w-4 h-4" />,
            variant: "primary",
            onClick: () => setNotificationDialogOpen(true),
          },
        ]}
      />

      <KpiStrip cards={kpis} />

      <Tabs
        items={[
          { id: "conversations", label: "Conversations", count: threads.length, icon: <MessageSquare className="w-4 h-4" /> },
          { id: "notifications", label: "Notifications envoyées", icon: <Bell className="w-4 h-4" /> },
          { id: "templates", label: "Modèles de messages (3 langues)", icon: <Languages className="w-4 h-4" /> },
        ]}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      {/* Conversations Tab */}
      {activeTab === "conversations" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[560px]">
          {/* Threads List (4 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-tertiary/40 overflow-hidden flex flex-col">
            <div className="p-3.5 border-b border-tertiary/40">
              <div className="relative">
                <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Rechercher une conversation..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-xs rounded-xl bg-darnaBg/40 border border-tertiary/60 py-2 ps-9 pe-3 text-primary focus:outline-none focus:border-secondary"
                />
              </div>
            </div>

            <div className="divide-y divide-neutral-100 overflow-y-auto flex-1">
              {threads.map((thread) => {
                const isSelected = thread.id === activeThread.id;
                return (
                  <div
                    key={thread.id}
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={`p-4 transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? "bg-secondary/10 border-s-4 border-s-secondary"
                        : "hover:bg-neutral-50/70"
                    }`}
                  >
                    <Avatar name={thread.senderName} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-primary truncate">
                          {thread.senderName}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          {thread.time}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400 block truncate">
                        {thread.senderRole}
                      </span>
                      <p className="text-xs text-neutral-600 line-clamp-1 mt-1">
                        {thread.lastMessage}
                      </p>
                    </div>
                    {thread.unreadCount > 0 && (
                      <span className="w-2.5 h-2.5 rounded-full bg-accent shrink-0 mt-1" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Thread Message Viewer (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-tertiary/40 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-tertiary/40 flex items-center justify-between bg-darnaBg/30">
              <div className="flex items-center gap-3">
                <Avatar name={activeThread.senderName} size={42} />
                <div>
                  <h4 className="font-bold text-sm text-primary">{activeThread.senderName}</h4>
                  <span className="text-xs text-neutral-500">{activeThread.senderRole}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => info("Fiche utilisateur ouverte")}>
                Voir le profil
              </Button>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-neutral-50/30">
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
                        : "bg-white border border-tertiary/60 text-primary rounded-es-none shadow-2xs"
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-neutral-400 mt-1 px-1">
                    {msg.time}
                  </span>
                </div>
              ))}
            </div>

            {/* Reply Composer */}
            <div className="p-3 border-t border-tertiary/40 bg-white space-y-2">
              <div className="flex items-center gap-2">
                <textarea
                  rows={2}
                  placeholder="Écrivez votre message à l'utilisateur..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full text-xs rounded-xl bg-darnaBg/30 border border-tertiary/70 p-2.5 text-primary focus:outline-none focus:border-secondary resize-none"
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
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                <span>Réponses rapides :</span>
                <button
                  type="button"
                  onClick={() => setReplyText("Vos documents ont été validés avec succès.")}
                  className="underline hover:text-primary cursor-pointer"
                >
                  Validation OK
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={() => setReplyText("Merci de nous fournir un justificatif de domicile récent.")}
                  className="underline hover:text-primary cursor-pointer"
                >
                  Complément requis
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="bg-white rounded-2xl border border-tertiary/40 overflow-hidden shadow-2xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-darnaBg/60 text-neutral-500 font-semibold border-b border-tertiary/40">
              <tr>
                <th className="py-3 px-4">Date & Heure</th>
                <th className="py-3 px-4">Titre de la notification</th>
                <th className="py-3 px-4">Canal</th>
                <th className="py-3 px-4">Destinataires</th>
                <th className="py-3 px-4">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              <tr className="hover:bg-neutral-50/50">
                <td className="py-3 px-4 font-mono text-neutral-500">20/10/2024 · 09:30</td>
                <td className="py-3 px-4 font-bold text-primary">Votre annonce Villa Hydra est désormais en ligne</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-primary">
                    Email + In-app
                  </span>
                </td>
                <td className="py-3 px-4 text-neutral-600">Ahmed Benali (Hôte)</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary/15 text-secondary">
                    Délivrée
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-neutral-50/50">
                <td className="py-3 px-4 font-mono text-neutral-500">18/10/2024 · 14:15</td>
                <td className="py-3 px-4 font-bold text-primary">Rappel : mise à jour des conditions tarifaires 2025</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-primary">
                    In-app Broadcast
                  </span>
                </td>
                <td className="py-3 px-4 text-neutral-600">Tous les prestataires (450)</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary/15 text-secondary">
                    Délivrée
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-tertiary/40 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-primary">Confirmation de réservation</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                FR / EN / AR
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Envoyé automatiquement dès confirmation du paiement d'une réservation.
            </p>
            <div className="bg-darnaBg/40 p-3 rounded-xl border border-tertiary/40 text-[11px] font-mono text-primary leading-relaxed">
              &quot;Bonjour &#123;userName&#125;, votre réservation &#123;bookingId&#125; pour &#123;listingTitle&#125; du &#123;startDate&#125; au &#123;endDate&#125; est confirmée !&quot;
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-tertiary/40 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-primary">Demande de compléments de dossier</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                FR / EN / AR
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Envoyé par l'administrateur lors du rejet partiel d'un justificatif prestataire.
            </p>
            <div className="bg-darnaBg/40 p-3 rounded-xl border border-tertiary/40 text-[11px] font-mono text-primary leading-relaxed">
              &quot;Bonjour &#123;hostName&#125;, votre dossier nécessite une mise à jour : &#123;reasonText&#125;. Merci de déposer le document requis.&quot;
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Notification Dialog */}
      <Dialog
        isOpen={notificationDialogOpen}
        onClose={() => setNotificationDialogOpen(false)}
        title="Diffuser une notification"
        description="Envoyer une notification push ou email ciblée aux utilisateurs ou prestataires."
      >
        <div className="space-y-4 text-xs text-start">
          <div>
            <label className="block font-bold text-primary mb-1">Cible des destinataires</label>
            <select className="w-full rounded-xl bg-white border border-tertiary/70 p-2.5 text-primary focus:outline-none focus:border-secondary cursor-pointer">
              <option>Tous les utilisateurs</option>
              <option>Tous les prestataires</option>
              <option>Hôtes hébergements uniquement</option>
              <option>Agences de voyages</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-primary mb-1">Titre de la notification</label>
            <input
              type="text"
              placeholder="ex: Maintenance planifiée de la plateforme"
              className="w-full rounded-xl bg-white border border-tertiary/70 p-2.5 text-primary focus:outline-none focus:border-secondary"
            />
          </div>

          <div>
            <label className="block font-bold text-primary mb-1">Message</label>
            <textarea
              rows={3}
              placeholder="Contenu de la notification..."
              className="w-full rounded-xl bg-white border border-tertiary/70 p-2.5 text-primary focus:outline-none focus:border-secondary resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setNotificationDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                success("Notification diffusée aux destinataires");
                setNotificationDialogOpen(false);
              }}
            >
              Envoyer la notification
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
