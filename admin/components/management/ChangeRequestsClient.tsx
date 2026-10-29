"use client";

import React, { useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { useToast } from "@/components/ui/Toast";
import { formatDate, formatDzd } from "@/lib/utils/format";

type ChangeValue =
  | { kind: "money"; amount: number }
  | { kind: "guests"; count: number }
  | { kind: "text"; text: string };

type ChangeField = "pricePerNight" | "capacity" | "descriptionAmenities";

interface ChangeRequestItem {
  id: string;
  listingId: string;
  listingTitle: string;
  hostName: string;
  field: ChangeField;
  oldValue: ChangeValue;
  newValue: ChangeValue;
  requestedAt: string;
  status: "pending" | "approved" | "rejected";
}

interface Props {
  title: string;
  subtitle: string;
  backRoute: string;
}

export default function ChangeRequestsClient({ title, subtitle, backRoute }: Props) {
  const t = useTranslations("changeRequests");
  const locale = useLocale();
  const router = useRouter();
  const { addToast } = useToast();

  const [requests, setRequests] = useState<ChangeRequestItem[]>([
    {
      id: "cr_1",
      listingId: "lst_001",
      listingTitle: "Villa avec piscine – Hydra",
      hostName: "Ahmed Benali",
      field: "pricePerNight",
      oldValue: { kind: "money", amount: 32000 },
      newValue: { kind: "money", amount: 35000 },
      requestedAt: "2024-10-24T10:15:00Z",
      status: "pending",
    },
    {
      id: "cr_2",
      listingId: "lst_004",
      listingTitle: "Riad authentique Casbah",
      hostName: "Immobilier Casbah",
      field: "capacity",
      oldValue: { kind: "guests", count: 6 },
      newValue: { kind: "guests", count: 8 },
      requestedAt: "2024-10-23T14:20:00Z",
      status: "pending",
    },
    {
      id: "cr_3",
      listingId: "lst_008",
      listingTitle: "Chalet montagnard Tikjda",
      hostName: "Nord Aventures",
      field: "descriptionAmenities",
      oldValue: { kind: "text", text: "Sans jacuzzi" },
      newValue: { kind: "text", text: "Ajout d'un Jacuzzi extérieur chauffé" },
      requestedAt: "2024-10-22T09:40:00Z",
      status: "pending",
    },
  ]);

  const renderValue = (v: ChangeValue) => {
    if (v.kind === "money") return formatDzd(v.amount, locale);
    if (v.kind === "guests") return t("guests", { count: v.count });
    return v.text;
  };

  const handleAction = (id: string, action: "approved" | "rejected") => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: action } : r))
    );
    addToast({
      title: action === "approved" ? t("toastApproved") : t("toastRejected"),
      description: t("toastDescription"),
      variant: action === "approved" ? "success" : "warning",
    });
  };

  const columns: Column<ChangeRequestItem>[] = [
    {
      key: "listing",
      header: t("columns.listing"),
      render: (row) => (
        <div>
          <div className="font-medium text-[#2E3A2F] text-xs">{row.listingTitle}</div>
          <div className="text-[11px] text-[#2E3A2F]/70">{t("host", { name: row.hostName })}</div>
        </div>
      ),
    },
    {
      key: "field",
      header: t("columns.field"),
      render: (row) => <span className="font-semibold text-xs text-[#2E3A2F]">{t(`fields.${row.field}`)}</span>,
    },
    {
      key: "diff",
      header: t("columns.diff"),
      render: (row) => (
        <div className="flex items-center gap-2 text-xs">
          <del className="text-accent-700 bg-[#C96F4F]/10 px-2 py-0.5 rounded">
            <span className="sr-only">{t("before")} </span>
            {renderValue(row.oldValue)}
          </del>
          <ArrowRight className="w-3.5 h-3.5 text-[#2E3A2F]/50 rtl:rotate-180" aria-hidden="true" />
          <ins className="no-underline font-medium text-secondary-800 bg-secondary/15 px-2 py-0.5 rounded">
            <span className="sr-only">{t("after")} </span>
            {renderValue(row.newValue)}
          </ins>
        </div>
      ),
    },
    {
      key: "date",
      header: t("columns.date"),
      render: (row) => (
        <span className="text-xs text-[#2E3A2F]/70">
          {formatDate(row.requestedAt, locale)}
        </span>
      ),
    },
    {
      key: "actions",
      header: t("columns.decision"),
      className: "text-end",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.status === "pending" ? (
            <>
              <button
                type="button"
                onClick={() => handleAction(row.id, "approved")}
                aria-label={t("approveAria", { field: t(`fields.${row.field}`), listing: row.listingTitle })}
                className="px-2.5 py-1 text-xs font-medium text-white bg-secondary-700 rounded-md hover:bg-secondary-800"
              >
                {t("approve")}
              </button>
              <button
                type="button"
                onClick={() => handleAction(row.id, "rejected")}
                aria-label={t("rejectAria", { field: t(`fields.${row.field}`), listing: row.listingTitle })}
                className="px-2.5 py-1 text-xs font-medium text-accent-700 border border-[#C96F4F]/40 rounded-md hover:bg-[#C96F4F]/10"
              >
                {t("reject")}
              </button>
            </>
          ) : (
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded ${
                row.status === "approved"
                  ? "bg-secondary/15 text-secondary-800"
                  : "bg-accent/15 text-accent-800"
              }`}
            >
              {row.status === "approved" ? t("approved") : t("rejected")}
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
          type="button"
          onClick={() => router.push(backRoute)}
          className="inline-flex items-center gap-1.5 text-xs text-[#2E3A2F]/70 hover:text-[#2E3A2F] font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
          <span>{t("back")}</span>
        </button>
      </div>

      <PageHeader title={title} subtitle={subtitle} />

      <div className="bg-white rounded-xl border border-[#D9C9B2]/60 shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={requests}
          keyExtractor={(r) => r.id}
          emptyMessage={t("empty")}
        />
      </div>
    </div>
  );
}
