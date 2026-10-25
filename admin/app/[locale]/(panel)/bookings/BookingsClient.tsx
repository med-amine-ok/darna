"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/navigation";
import {
  Calendar,
  Download,
  FileText,
  Plus,
  Eye,
  ExternalLink,
  MapPin,
  Clock,
  Printer,
  MoreHorizontal,
  Home,
  Compass,
  Plane,
  Car,
  User,
  Phone,
  Mail,
  ShieldCheck,
  CreditCard,
  MessageSquare,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Maximize2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs, TabItem } from "@/components/ui/Tabs";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilterDrawer } from "@/components/ui/FilterDrawer";
import { DataTable, Column } from "@/components/data-table/DataTable";
import { Pagination } from "@/components/ui/Pagination";
import { SplitView } from "@/components/ui/SplitView";
import { DetailPanel } from "@/components/ui/DetailPanel";
import { ImageCarousel } from "@/components/ui/ImageCarousel";
import { StatusPill } from "@/components/ui/StatusPill";
import { InfoTile } from "@/components/ui/InfoTile";
import { useToast } from "@/components/ui/Toast";
import { useLocale } from "next-intl";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { listBookings, cancelBooking, refundBooking } from "@/lib/data/bookings";
import { Booking, BookingStatus, ListingVertical } from "@/lib/types";
import { WILAYAS, getWilayaLabel } from "@/lib/utils/wilayas";

export interface BookingsClientProps {
  initialStatus?: string;
  initialVertical?: string;
}

export default function BookingsClient({
  initialStatus = "all",
  initialVertical = "all",
}: BookingsClientProps) {
  const locale = useLocale() as "en" | "fr" | "ar";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  const currentVertical = searchParams.get("vertical") || initialVertical || "all";
  const currentStatus = searchParams.get("status") || initialStatus || "all";
  const selectedBookingIdFromUrl = searchParams.get("selected") || null;
  const initialPage = Number(searchParams.get("page")) || 1;

  const [data, setData] = useState<Booking[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [facets, setFacets] = useState<Record<string, Record<string, number>>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWilaya, setSelectedWilaya] = useState("all");
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(10);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(selectedBookingIdFromUrl);
  const [panelTab, setPanelTab] = useState("details");
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    type: "cancel" | "refund";
    booking: Booking;
  } | null>(null);

  const updateUrl = (newParams: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([k, v]) => {
      if (v === null || v === "" || v === "all") {
        params.delete(k);
      } else {
        params.set(k, v);
      }
    });
    router.push(`${pathname}?${params.toString()}`);
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Map vertical query to ListingVertical if needed
      let vertParam = currentVertical;
      if (vertParam === "stays") vertParam = "home";
      if (vertParam === "experiences") vertParam = "experience";
      if (vertParam === "trips") vertParam = "trip";
      if (vertParam === "cars") vertParam = "vehicle";

      const res = await listBookings({
        status: currentStatus,
        vertical: vertParam !== "all" ? vertParam : undefined,
        wilayaCode: selectedWilaya !== "all" ? selectedWilaya : undefined,
        search: searchQuery || undefined,
        page,
        pageSize,
      });
      setData(res.rows);
      setTotal(res.total);
      setTotalPages(res.totalPages || Math.ceil(res.total / pageSize));
      setFacets(res.facets || {});
    } catch (err: any) {
      addToast({ title: "Erreur", description: err.message, variant: "danger" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentVertical, currentStatus, selectedWilaya, page, pageSize, searchQuery]);

  const selectedBooking = data.find((b) => b.id === selectedBookingId) || null;

  const handleSelectBooking = (b: Booking) => {
    setSelectedBookingId(b.id);
    updateUrl({ selected: b.id });
  };

  const handleClosePanel = () => {
    setSelectedBookingId(null);
    updateUrl({ selected: null });
  };

  // Vertical tabs with counts (Mockup 11: Toutes 1,248 · Hébergements 642 · Expériences 238 · Voyages 156 · Voitures 212)
  const verticalTabs: TabItem[] = [
    { id: "all", label: "Toutes", count: 1248 },
    { id: "stays", label: "Hébergements", count: 642, icon: <Home className="w-3.5 h-3.5" /> },
    { id: "experiences", label: "Expériences", count: 238, icon: <Compass className="w-3.5 h-3.5" /> },
    { id: "trips", label: "Voyages organisés", count: 156, icon: <Plane className="w-3.5 h-3.5" /> },
    { id: "cars", label: "Voitures", count: 212, icon: <Car className="w-3.5 h-3.5" /> },
  ];

  // Table columns (Mockup 11)
  const columns: Column<Booking>[] = [
    {
      key: "booking",
      header: "Réservation",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#E5DFD3] shrink-0 border border-[#D9C9B2]/40">
            <Image
              src={row.listingImage || "/placeholder-booking.jpg"}
              alt={row.listingTitle}
              fill
              className="object-cover"
            />
          </div>
          <div className="min-w-0">
            <div
              className="font-medium text-[#2E3A2F] text-xs font-mono hover:underline cursor-pointer"
              onClick={() => handleSelectBooking(row)}
            >
              {row.reference || `#R${row.id.replace("bkg_", "").padStart(4, "0")}`}
            </div>
            <div className="text-[11px] text-[#2E3A2F]/60 mt-0.5">
              {new Date(row.checkInDate).toLocaleDateString("fr-FR")}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "guest",
      header: "Client",
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#EAE5D9] flex items-center justify-center font-semibold text-xs text-[#2E3A2F] border border-[#D9C9B2]/50">
            {row.guestName.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-[#2E3A2F] truncate">{row.guestName}</div>
            <div className="text-[11px] text-[#2E3A2F]/60 truncate">{row.guestEmail}</div>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (row) => {
        let label = "Hébergement";
        let icon = <Home className="w-3 h-3 text-[#6B7F5B]" />;
        if (row.vertical === "experience") {
          label = "Expérience";
          icon = <Compass className="w-3 h-3 text-[#6B7F5B]" />;
        } else if (row.vertical === "trip") {
          label = "Voyage";
          icon = <Plane className="w-3 h-3 text-[#6B7F5B]" />;
        } else if (row.vertical === "vehicle") {
          label = "Voiture";
          icon = <Car className="w-3 h-3 text-[#6B7F5B]" />;
        }
        return (
          <span className="inline-flex items-center gap-1 text-xs text-[#2E3A2F] font-medium">
            {icon}
            <span>{label}</span>
          </span>
        );
      },
    },
    {
      key: "details",
      header: "Détails",
      render: (row) => (
        <div className="min-w-0">
          <div className="text-xs font-medium text-[#2E3A2F] truncate max-w-[180px]">
            {row.listingTitle}
          </div>
          <div className="text-[11px] text-[#2E3A2F]/60 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-[#6B7F5B]" />
            <span>Wilaya {row.wilayaCode}</span>
          </div>
        </div>
      ),
    },
    {
      key: "dates",
      header: "Dates",
      render: (row) => (
        <div className="text-xs text-[#2E3A2F]">
          <div>{new Date(row.checkInDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} - {new Date(row.checkOutDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</div>
          <div className="text-[11px] text-[#2E3A2F]/60">{row.nightsCount} nuits</div>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Montant",
      render: (row) => (
        <div className="text-xs font-semibold text-[#2E3A2F]">
          {row.totalAmountDzd.toLocaleString("fr-FR")} DZD
        </div>
      ),
    },
    {
      key: "status",
      header: "Statut",
      render: (row) => <StatusPill status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-end",
      render: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleSelectBooking(row)}
            className="p-1.5 rounded-lg text-[#2E3A2F]/70 hover:bg-[#EAE5D9] transition-colors"
            title="Aperçu rapide"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              addToast({ title: "Facture téléchargée", variant: "info" });
            }}
            className="p-1.5 rounded-lg text-[#2E3A2F]/70 hover:bg-[#EAE5D9] transition-colors"
            title="Facture"
          >
            <FileText className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Page Header (Mockup 11: Exporter, Rapport, + Nouvelle réservation) */}
      <PageHeader
        title="Gestion des réservations"
        subtitle="Suivez l'état des réservations, les paiements reçus et les demandes d'annulation."
        actions={[
          {
            label: "Exporter",
            icon: <Download className="w-4 h-4" />,
            onClick: () => {
              addToast({ title: "Export en cours", description: "Le fichier CSV sera téléchargé sous peu.", variant: "info" });
            },
            variant: "outline",
          },
          {
            label: "Rapport",
            icon: <FileText className="w-4 h-4" />,
            onClick: () => router.push("/stats"),
            variant: "outline",
          },
          {
            label: "Nouvelle réservation",
            icon: <Plus className="w-4 h-4" />,
            onClick: () => addToast({ title: "Création manuelle", description: "Ouvre le formulaire de réservation assistée.", variant: "info" }),
            variant: "primary",
          },
        ]}
      />

      {/* 2. Vertical Tabs (Mockup 11) */}
      <div className="flex items-center justify-between border-b border-[#D9C9B2]/50 pb-1">
        <Tabs
          items={verticalTabs}
          activeId={currentVertical}
          onChange={(tabId) => {
            updateUrl({ vertical: tabId === "all" ? null : tabId, page: "1" });
          }}
          variant="line"
        />

        <div className="hidden sm:flex items-center gap-2 text-xs text-[#2E3A2F]/70">
          <Calendar className="w-4 h-4 text-[#6B7F5B]" />
          <span>01/03/2024 – 31/03/2024</span>
        </div>
      </div>

      {/* 3. Filter Bar (Mockup 11) */}
      <FilterBar
        searchPlaceholder="Rechercher par numéro, nom, email..."
        searchValue={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          setPage(1);
        }}
        selects={[
          {
            id: "status",
            label: "Statut",
            value: currentStatus,
            options: [
              { value: "all", label: "Tous les statuts" },
              { value: "confirmed", label: "Confirmée" },
              { value: "pending", label: "En attente" },
              { value: "completed", label: "Terminée" },
              { value: "cancelled", label: "Annulée" },
              { value: "refunded", label: "Remboursée" },
            ],
            onChange: (val) => {
              updateUrl({ status: val === "all" ? null : val, page: "1" });
            },
          },
          {
            id: "wilaya",
            label: "Région / Wilaya",
            value: selectedWilaya,
            options: [
              { value: "all", label: locale === "ar" ? "كل الولايات" : locale === "en" ? "All wilayas" : "Toutes les wilayas" },
              ...WILAYAS.map((w) => ({ value: w.code, label: `${w.code} - ${getWilayaLabel(w, locale)}` })),
            ],
            onChange: (val) => {
              setSelectedWilaya(val);
              setPage(1);
            },
          },
        ]}
        onOpenAdvanced={() => setIsFilterDrawerOpen(true)}
        hasActiveFilters={currentStatus !== "all" || selectedWilaya !== "all" || !!searchQuery}
        onReset={() => {
          setSearchQuery("");
          setSelectedWilaya("all");
          updateUrl({ status: null, vertical: null, page: "1" });
        }}
      />

      {/* 4. Split View: Table + Detail Panel (Mockup 11) */}
      <SplitView
        isPanelOpen={!!selectedBooking}
        mainContent={
          <div className="bg-white rounded-xl border border-[#D9C9B2]/60 shadow-sm overflow-hidden flex flex-col">
            <DataTable
              columns={columns}
              data={data}
              keyExtractor={(b) => b.id}
              selectedRowId={selectedBookingId || undefined}
              onRowClick={handleSelectBooking}
              isLoading={isLoading}
              emptyMessage="Aucune réservation trouvée."
              selection={{
                selectedIds: selectedRowIds,
                onSelectionChange: setSelectedRowIds,
              }}
            />
            <div className="p-4 border-t border-[#D9C9B2]/40 bg-[#FAF9F5]">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(p) => {
                  setPage(p);
                  updateUrl({ page: String(p) });
                }}
                pageSize={pageSize}
                totalItems={total}
                itemLabel="réservations"
              />
            </div>
          </div>
        }
        detailPanel={
          selectedBooking ? (
            <DetailPanel
              isOpen={true}
              onClose={handleClosePanel}
              title={selectedBooking.reference || `#R${selectedBooking.id}`}
              subtitle={`Réservé le ${new Date(selectedBooking.checkInDate).toLocaleDateString("fr-FR")}`}
              statusBadge={<StatusPill status={selectedBooking.status} />}
              actions={
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => window.print()}
                    className="p-1 text-[#2E3A2F]/60 hover:text-[#2E3A2F] rounded"
                    title="Imprimer la réservation"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              }
              footer={
                <div className="flex items-center justify-between gap-2 w-full">
                  <div className="flex items-center gap-2">
                    {selectedBooking.status !== "cancelled" && (
                      <button
                        onClick={() => setConfirmModal({ type: "cancel", booking: selectedBooking })}
                        className="px-3 py-1.5 text-xs font-medium text-[#C96F4F] border border-[#C96F4F]/40 rounded-lg hover:bg-[#C96F4F]/10"
                      >
                        Annuler
                      </button>
                    )}
                    {selectedBooking.status === "cancelled" && (
                      <button
                        onClick={() => setConfirmModal({ type: "refund", booking: selectedBooking })}
                        className="px-3 py-1.5 text-xs font-medium text-[#8C682E] border border-[#D9C9B2] rounded-lg hover:bg-[#F8F6EE]"
                      >
                        Rembourser
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => addToast({ title: "Modification de dates", variant: "info" })}
                    className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#2E3A2F] rounded-lg hover:bg-[#242e25]"
                  >
                    Modifier la réservation
                  </button>
                </div>
              }
            >
              <div className="space-y-5">
                <div className="relative aspect-[16/9] rounded-lg overflow-hidden border border-[#D9C9B2]/40 bg-[#E5DFD3]">
                  <Image
                    src={selectedBooking.listingImage || "/placeholder-booking.jpg"}
                    alt={selectedBooking.listingTitle}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="border-b border-[#D9C9B2]/40 pb-3">
                  <h4 className="font-bold text-sm text-[#2E3A2F]">{selectedBooking.listingTitle}</h4>
                  <div className="flex items-center gap-1 text-xs text-[#6B7F5B] mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Wilaya {selectedBooking.wilayaCode}</span>
                  </div>
                </div>

                <Tabs
                  items={[
                    { id: "details", label: "Détails" },
                    { id: "guest", label: "Client" },
                    { id: "payment", label: "Paiement" },
                    { id: "messages", label: "Messages" },
                  ]}
                  activeId={panelTab}
                  onChange={setPanelTab}
                />

                {panelTab === "details" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                      <InfoTile label="Arrivée" value={new Date(selectedBooking.checkInDate).toLocaleDateString("fr-FR")} />
                      <InfoTile label="Départ" value={new Date(selectedBooking.checkOutDate).toLocaleDateString("fr-FR")} />
                      <InfoTile label="Durée" value={`${selectedBooking.nightsCount} nuits`} />
                      <InfoTile label="Voyageurs" value={`${selectedBooking.guestsCount} personnes`} />
                    </div>

                    {/* Breakdown */}
                    <div className="p-3.5 bg-[#FAF9F5] rounded-lg border border-[#D9C9B2]/50 text-xs space-y-2">
                      <div className="font-semibold text-[#2E3A2F] pb-1 border-b border-[#D9C9B2]/40">
                        Montant et détails tarifaires
                      </div>
                      <div className="flex justify-between text-[#2E3A2F]/70">
                        <span>Tarif de base ({selectedBooking.nightsCount} nuits)</span>
                        <span>{selectedBooking.basePriceDzd.toLocaleString("fr-FR")} DZD</span>
                      </div>
                      <div className="flex justify-between text-[#2E3A2F]/70">
                        <span>Frais de service DARNA</span>
                        <span>{selectedBooking.serviceFeeDzd.toLocaleString("fr-FR")} DZD</span>
                      </div>
                      <div className="flex justify-between font-bold text-sm text-[#2E3A2F] pt-1.5 border-t border-[#D9C9B2]/40">
                        <span>Total payé</span>
                        <span className="text-[#6B7F5B]">{selectedBooking.totalAmountDzd.toLocaleString("fr-FR")} DZD</span>
                      </div>
                    </div>
                  </div>
                )}

                {panelTab === "guest" && (
                  <div className="bg-[#FAF9F5] p-3.5 rounded-lg border border-[#D9C9B2]/50 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#E5DFD3] flex items-center justify-center font-bold text-sm text-[#2E3A2F]">
                        {selectedBooking.guestName.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-[#2E3A2F]">{selectedBooking.guestName}</div>
                        <div className="text-xs text-[#2E3A2F]/60">{selectedBooking.guestEmail}</div>
                      </div>
                    </div>
                    <div className="text-xs text-[#2E3A2F] pt-2 border-t border-[#D9C9B2]/40 space-y-1">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-[#6B7F5B]" />
                        <span>{selectedBooking.guestPhone || "+213 555 12 34 56"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#6B7F5B]" />
                        <span>Compte vérifié</span>
                      </div>
                    </div>
                  </div>
                )}

                {panelTab === "payment" && (
                  <div className="p-3.5 bg-[#FAF9F5] rounded-lg border border-[#D9C9B2]/50 text-xs space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#D9C9B2]/40">
                      <span className="font-semibold text-[#2E3A2F]">Paiement reçu</span>
                      <span className="font-bold text-secondary">{selectedBooking.totalAmountDzd.toLocaleString("fr-FR")} DZD</span>
                    </div>
                    <div className="space-y-1 text-[#2E3A2F]/70">
                      <p>Mode: Carte CIB / Edahabia</p>
                      <p>Date: {new Date(selectedBooking.checkInDate).toLocaleDateString("fr-FR")}</p>
                      <p>Statut: Réglé avec succès</p>
                    </div>
                    <button
                      onClick={() => addToast({ title: "Téléchargement de la facture PDF", variant: "info" })}
                      className="w-full mt-2 py-2 bg-white border border-[#D9C9B2] rounded-lg font-medium text-xs text-[#2E3A2F] hover:bg-[#F8F6EE]"
                    >
                      Télécharger la facture
                    </button>
                  </div>
                )}
              </div>
            </DetailPanel>
          ) : null
        }
      />

      {confirmModal && (
        <ConfirmDialog
          isOpen={true}
          title={
            confirmModal.type === "cancel"
              ? "Annuler cette réservation ?"
              : "Rembourser cette réservation ?"
          }
          description={`Vous vous apprêtez à ${confirmModal.type === "cancel" ? "annuler" : "rembourser"} la réservation ${confirmModal.booking.reference}.`}
          variant={confirmModal.type === "cancel" ? "danger" : "primary"}
          onConfirm={async () => {
            const actor = { id: "usr_admin", name: "Admin", role: "super_admin" };
            if (confirmModal.type === "cancel") {
              await cancelBooking(confirmModal.booking.id, "Annulation administrative", actor);
              addToast({ title: "Réservation annulée", variant: "warning" });
            } else {
              await refundBooking(confirmModal.booking.id, confirmModal.booking.totalAmountDzd, "Remboursement suite à annulation", actor);
              addToast({ title: "Remboursement exécuté", variant: "info" });
            }
            setConfirmModal(null);
            fetchData();
          }}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
