"use client";

import React, { useState } from "react";
import { ArrowLeft, Check, X, Eye, Clock, FileText, ArrowRight } from "lucide-react";
import { useRouter } from "@/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { useToast } from "@/components/ui/Toast";

interface ChangeRequestItem {
  id: string;
  listingId: string;
  listingTitle: string;
  hostName: string;
  field: string;
  oldValue: string;
  newValue: string;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
}

interface Props {
  title: string;
  subtitle: string;
  backRoute: string;
}

export default function ChangeRequestsClient({ title, subtitle, backRoute }: Props) {
  const router = useRouter();
  const { addToast } = useToast();

  const [requests, setRequests] = useState<ChangeRequestItem[]>([
    {
      id: "cr_1",
      listingId: "lst_001",
      listingTitle: "Villa avec piscine – Hydra",
      hostName: "Ahmed Benali",
      field: "Prix par nuit",
      oldValue: "32 000 DZD",
      newValue: "35 000 DZD",
      requestedAt: "2024-10-24T10:15:00Z",
      status: "pending",
    },
    {
      id: "cr_2",
      listingId: "lst_004",
      listingTitle: "Riad authentique Casbah",
      hostName: "Immobilier Casbah",
      field: "Capacité d'accueil",
      oldValue: "6 personnes",
      newValue: "8 personnes",
      requestedAt: "2024-10-23T14:20:00Z",
      status: "pending",
    },
    {
      id: "cr_3",
      listingId: "lst_008",
      listingTitle: "Chalet montagnard Tikjda",
      hostName: "Nord Aventures",
      field: "Description & Équipements",
      oldValue: "Sans jacuzzi",
      newValue: "Ajout d'un Jacuzzi extérieur chauffé",
      requestedAt: "2024-10-22T09:40:00Z",
      status: "pending",
    },
  ]);

  const handleAction = (id: string, action: "approved" | "rejected") => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: action } : r))
    );
    addToast({
      title: action === "approved" ? "Demande validée" : "Demande refusée",
      description: "Le propriétaire recevra une notification avec les détails.",
      variant: action === "approved" ? "success" : "warning",
    });
  };

  const columns: Column<ChangeRequestItem>[] = [
    {
      key: "listing",
      header: "Annonce concernée",
      render: (row) => (
        <div>
          <div className="font-medium text-[#2E3A2F] text-xs">{row.listingTitle}</div>
          <div className="text-[11px] text-[#2E3A2F]/60">Hôte: {row.hostName}</div>
        </div>
      ),
    },
    {
      key: "field",
      header: "Champ modifié",
      render: (row) => <span className="font-semibold text-xs text-[#2E3A2F]">{row.field}</span>,
    },
    {
      key: "diff",
      header: "Comparaison (Avant / Après)",
      render: (row) => (
        <div className="flex items-center gap-2 text-xs">
          <span className="line-through text-[#C96F4F] bg-[#C96F4F]/10 px-2 py-0.5 rounded">
            {row.oldValue}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-[#2E3A2F]/50" />
          <span className="font-medium text-secondary bg-secondary/15 px-2 py-0.5 rounded">
            {row.newValue}
          </span>
        </div>
      ),
    },
    {
      key: "date",
      header: "Date de demande",
      render: (row) => (
        <span className="text-xs text-[#2E3A2F]/70">
          {new Date(row.requestedAt).toLocaleDateString("fr-FR")}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Décision",
      className: "text-end",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.status === "pending" ? (
            <>
              <button
                onClick={() => handleAction(row.id, "approved")}
                className="px-2.5 py-1 text-xs font-medium text-white bg-[#6B7F5B] rounded-md hover:bg-[#5a6b4c]"
              >
                Approuver
              </button>
              <button
                onClick={() => handleAction(row.id, "rejected")}
                className="px-2.5 py-1 text-xs font-medium text-[#C96F4F] border border-[#C96F4F]/40 rounded-md hover:bg-[#C96F4F]/10"
              >
                Refuser
              </button>
            </>
          ) : (
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded ${
                row.status === "approved"
                  ? "bg-secondary/15 text-secondary"
                  : "bg-accent/15 text-accent"
              }`}
            >
              {row.status === "approved" ? "Approuvé" : "Refusé"}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push(backRoute)}
          className="inline-flex items-center gap-1.5 text-xs text-[#2E3A2F]/70 hover:text-[#2E3A2F] font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Retour</span>
        </button>
      </div>

      <PageHeader title={title} subtitle={subtitle} />

      <div className="bg-white rounded-xl border border-[#D9C9B2]/60 shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={requests}
          keyExtractor={(r) => r.id}
          emptyMessage="Aucune demande de modification en attente."
        />
      </div>
    </div>
  );
}
