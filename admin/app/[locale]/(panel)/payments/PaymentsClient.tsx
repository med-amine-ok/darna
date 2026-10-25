"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  CreditCard,
  Building,
  RefreshCw,
  Download,
  Search,
  Filter,
  PlusCircle,
  Percent,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  FileText,
  Clock,
  Eye,
  RotateCcw,
} from "lucide-react";
import {
  listWallets,
  listTransactions,
  rechargeWallet,
  getCommissionRates,
  updateCommissionRates,
  listPayouts,
  approvePayout,
} from "@/lib/data/finance";
import {
  HostWallet,
  WalletTransaction,
  PayoutRequest,
  HostType,
} from "@/lib/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Pagination } from "@/components/ui/Pagination";
import { StatusPill } from "@/components/ui/StatusPill";
import { useToast } from "@/components/ui/Toast";
import { formatDzd, formatDate } from "@/lib/utils/format";
import { WILAYAS } from "@/lib/utils/wilayas";
import { DataTable, Column } from "@/components/data-table/DataTable";

export interface PaymentsClientProps {
  locale: string;
  initialTab?: "overview" | "wallets" | "transactions" | "commissions" | "payouts" | "refunds";
}

export default function PaymentsClient({
  locale,
  initialTab = "overview",
}: PaymentsClientProps) {
  const tCommon = useTranslations("common");
  const { success, error, info } = useToast();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Wallets State
  const [wallets, setWallets] = useState<HostWallet[]>([]);
  const [walletsTotal, setWalletsTotal] = useState(0);
  const [walletsPage, setWalletsPage] = useState(1);
  const [walletsPageSize, setWalletsPageSize] = useState(10);
  const [walletsLoading, setWalletsLoading] = useState(false);
  const [hostTypeFilter, setHostTypeFilter] = useState("all");
  const [walletSearch, setWalletSearch] = useState("");

  // Ledger / Transactions State
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(1);
  const [txTypeFilter, setTxTypeFilter] = useState("all");
  const [txSearch, setTxSearch] = useState("");
  const [txLoading, setTxLoading] = useState(false);

  // Commission Rates State
  const [commissionRates, setCommissionRates] = useState<Record<HostType, number>>({
    individual: 12,
    agency: 15,
    hotel: 18,
    hostel: 10,
  });
  const [commissionSaving, setCommissionSaving] = useState(false);

  // Payouts State
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);

  // Recharge Dialog State
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<HostWallet | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState<number>(50000);
  const [rechargeMethod, setRechargeMethod] = useState("ccp");
  const [rechargeReason, setRechargeReason] = useState("Dépôt de garantie / Recharge manuelle");
  const [rechargeReceipt, setRechargeReceipt] = useState("CCP-REC-2026-9812");
  const [rechargeSubmitting, setRechargeSubmitting] = useState(false);

  // Load Wallets
  const loadWallets = useCallback(async () => {
    setWalletsLoading(true);
    try {
      const res = await listWallets({
        hostType: hostTypeFilter === "all" ? undefined : (hostTypeFilter as HostType),
        search: walletSearch || undefined,
        page: walletsPage,
        pageSize: walletsPageSize,
      });
      setWallets(res.rows);
      setWalletsTotal(res.total);
    } catch (err: any) {
      error("Erreur de chargement", err.message);
    } finally {
      setWalletsLoading(false);
    }
  }, [hostTypeFilter, walletSearch, walletsPage, walletsPageSize, error]);

  // Load Transactions
  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const res = await listTransactions({
        type: txTypeFilter === "all" ? undefined : (txTypeFilter as any),
        search: txSearch || undefined,
        page: txPage,
        pageSize: 10,
      });
      setTransactions(res.rows);
      setTxTotal(res.total);
    } catch (err: any) {
      error("Erreur transactions", err.message);
    } finally {
      setTxLoading(false);
    }
  }, [txTypeFilter, txSearch, txPage, error]);

  // Load Commission Rates
  const loadCommissions = useCallback(async () => {
    try {
      const rates = await getCommissionRates();
      setCommissionRates(rates);
    } catch (err: any) {
      error("Erreur commissions", err.message);
    }
  }, [error]);

  // Load Payouts
  const loadPayouts = useCallback(async () => {
    setPayoutsLoading(true);
    try {
      const res = await listPayouts();
      setPayouts(res);
    } catch (err: any) {
      error("Erreur virements", err.message);
    } finally {
      setPayoutsLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadWallets();
    loadTransactions();
    loadCommissions();
    loadPayouts();
  }, [loadWallets, loadTransactions, loadCommissions, loadPayouts]);

  // Save Commissions
  const handleSaveCommissions = async () => {
    setCommissionSaving(true);
    try {
      await updateCommissionRates(commissionRates, {
        id: "adm_01",
        name: "Admin",
        role: "super_admin",
      });
      success("Taux de commission enregistrés");
    } catch (err: any) {
      error("Erreur de sauvegarde", err.message);
    } finally {
      setCommissionSaving(false);
    }
  };

  // Submit Recharge
  const handleRechargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWallet) return;
    setRechargeSubmitting(true);
    try {
      await rechargeWallet({
        hostId: selectedWallet.hostId,
        amount: rechargeAmount,
        method: rechargeMethod,
        reason: rechargeReason,
        receiptReference: rechargeReceipt,
        actor: { id: "adm_01", name: "Admin", role: "super_admin" },
      });
      success("Portefeuille rechargé avec succès");
      setRechargeDialogOpen(false);
      loadWallets();
      loadTransactions();
    } catch (err: any) {
      error("Erreur de recharge", err.message);
    } finally {
      setRechargeSubmitting(false);
    }
  };

  // Approve Payout
  const handleApprovePayout = async (payoutId: string) => {
    try {
      await approvePayout(payoutId, {
        id: "adm_01",
        name: "Admin",
        role: "super_admin",
      });
      success("Virement prestataire validé");
      loadPayouts();
      loadWallets();
    } catch (err: any) {
      error("Erreur de validation", err.message);
    }
  };

  // KPIs
  const totalBalance = wallets.reduce((acc, w) => acc + (w.balanceDzd ?? w.balance ?? 0), 0);
  const pendingPayoutsTotal = payouts
    .filter((p) => p.status === "pending")
    .reduce((acc, p) => acc + (p.amountDzd || 0), 0);
  const monthlyCommissions = 1845000;
  const refundsTotal = 432000;

  const kpis = [
    {
      id: "wallets",
      label: "Total portefeuilles",
      value: formatDzd(totalBalance, locale),
      icon: Wallet,
      colorVariant: "primary" as const,
      active: activeTab === "wallets",
      onClick: () => setActiveTab("wallets"),
    },
    {
      id: "payouts",
      label: "Paiements en attente",
      value: formatDzd(pendingPayoutsTotal, locale),
      icon: Clock,
      colorVariant: "tertiary" as const,
      active: activeTab === "payouts",
      onClick: () => setActiveTab("payouts"),
    },
    {
      id: "commissions",
      label: "Commissions du mois",
      value: formatDzd(monthlyCommissions, locale),
      icon: Percent,
      colorVariant: "secondary" as const,
      active: activeTab === "commissions",
      onClick: () => setActiveTab("commissions"),
    },
    {
      id: "refunds",
      label: "Remboursements effectués",
      value: formatDzd(refundsTotal, locale),
      icon: RotateCcw,
      colorVariant: "accent" as const,
      active: activeTab === "refunds",
      onClick: () => setActiveTab("refunds"),
    },
  ];

  const tabsList = [
    { id: "overview", label: "Vue d'ensemble", icon: <DollarSign className="w-4 h-4" /> },
    { id: "wallets", label: "Portefeuilles", count: walletsTotal, icon: <Wallet className="w-4 h-4" /> },
    { id: "transactions", label: "Transactions", count: txTotal, icon: <FileText className="w-4 h-4" /> },
    { id: "commissions", label: "Commissions", icon: <Percent className="w-4 h-4" /> },
    { id: "payouts", label: "Paiements prestataires", count: payouts.length, icon: <ArrowUpRight className="w-4 h-4" /> },
    { id: "refunds", label: "Remboursements", icon: <RotateCcw className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 text-start">
      <PageHeader
        title="Paiements & Finances"
        subtitle="Supervisez les portefeuilles prestataires, transactions, commissions et virements."
        actions={[
          {
            label: "Exporter le grand livre",
            icon: <Download className="w-4 h-4" />,
            variant: "outline",
            onClick: () => success("Export du grand livre comptable généré"),
          },
          {
            label: "Recharger un portefeuille",
            icon: <PlusCircle className="w-4 h-4" />,
            variant: "primary",
            onClick: () => {
              if (wallets.length > 0) {
                setSelectedWallet(wallets[0]);
                setRechargeDialogOpen(true);
              } else {
                info("Aucun portefeuille disponible");
              }
            },
          },
        ]}
      />

      <KpiStrip cards={kpis} />

      <Tabs
        items={tabsList}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-tertiary/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-primary">Solde total séquestre</span>
                <span className="p-2 rounded-xl bg-secondary/10 text-secondary">
                  <CreditCard className="w-5 h-5" />
                </span>
              </div>
              <p className="text-2xl font-serif font-black text-primary">
                {formatDzd(totalBalance + 12450000, locale)}
              </p>
              <p className="text-xs text-neutral-500">
                Fonds garantis pour les réservations en cours et à venir.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-tertiary/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-primary">Virements exécutés ce mois</span>
                <span className="p-2 rounded-xl bg-primary/10 text-primary">
                  <ArrowUpRight className="w-5 h-5" />
                </span>
              </div>
              <p className="text-2xl font-serif font-black text-primary">
                {formatDzd(6820000, locale)}
              </p>
              <p className="text-xs text-neutral-500">
                142 virements CCP / Banque vers les prestataires.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-tertiary/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-primary">Revenus nets commissions</span>
                <span className="p-2 rounded-xl bg-tertiary/20 text-primary">
                  <Percent className="w-5 h-5" />
                </span>
              </div>
              <p className="text-2xl font-serif font-black text-secondary">
                {formatDzd(monthlyCommissions, locale)}
              </p>
              <p className="text-xs text-neutral-500">
                Commissions prélevées selon les taux configurés (10% - 18%).
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-tertiary/40 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-primary text-base">Dernières transactions financières</h3>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab("transactions")}>
                Voir tout le grand livre →
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-darnaBg/60 text-neutral-500 font-semibold border-b border-tertiary/40">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">ID Transaction</th>
                    <th className="py-2.5 px-3">Prestataire / Compte</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Montant</th>
                    <th className="py-2.5 px-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {transactions.slice(0, 5).map((tx) => (
                    <tr key={tx.id} className="hover:bg-neutral-50/50">
                      <td className="py-2.5 px-3 font-mono text-neutral-500">
                        {formatDate(tx.createdAt, locale)}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-primary">
                        #{tx.id}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-primary">
                        {tx.hostName || "Prestataire DARNA"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700">
                          {tx.type}
                        </span>
                      </td>
                      <td className={`py-2.5 px-3 font-mono font-bold text-right ${
                        tx.amount >= 0 ? "text-secondary" : "text-accent"
                      }`}>
                        {tx.amount >= 0 ? "+" : ""}{formatDzd(tx.amount, locale)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-secondary/10 text-secondary">
                          Confirmé
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Wallets Tab */}
      {activeTab === "wallets" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-tertiary/40">
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Rechercher par nom de prestataire..."
                value={walletSearch}
                onChange={(e) => setWalletSearch(e.target.value)}
                className="w-full text-xs rounded-xl bg-darnaBg/50 border border-tertiary/60 py-2 ps-9 pe-3 text-primary focus:outline-none focus:border-secondary"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-neutral-500">Type :</label>
              <select
                value={hostTypeFilter}
                onChange={(e) => setHostTypeFilter(e.target.value)}
                className="text-xs rounded-xl bg-white border border-tertiary/60 p-2 text-primary focus:outline-none focus:border-secondary cursor-pointer"
              >
                <option value="all">Tous les types</option>
                <option value="individual">Individuel (Hôte)</option>
                <option value="agency">Agence de voyage</option>
                <option value="hotel">Hôtel</option>
                <option value="hostel">Hostel / Auberge</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-tertiary/40 overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-darnaBg/60 text-neutral-500 font-semibold border-b border-tertiary/40">
                <tr>
                  <th className="py-3 px-4">Prestataire</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Localisation</th>
                  <th className="py-3 px-4 text-right">Solde disponible</th>
                  <th className="py-3 px-4 text-right">Commissions retenues</th>
                  <th className="py-3 px-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {wallets.map((w) => (
                  <tr key={w.hostId} className="hover:bg-neutral-50/50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-primary">{w.hostName || w.ownerName || w.businessName}</div>
                      <div className="text-[11px] text-neutral-400">ID: #{w.hostId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-neutral-100 text-primary">
                        {w.hostType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-600">
                      {w.wilayaCode ? `${w.wilayaCode} - Algérie` : "Alger"}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-right text-primary">
                      {formatDzd(w.balanceDzd ?? w.balance, locale)}
                    </td>
                    <td className="py-3 px-4 font-mono text-right text-neutral-500">
                      {formatDzd(w.totalCommissionsPaidDzd ?? w.totalCommissionsPaid ?? 0, locale)}
                    </td>
                    <td className="py-3 px-4 text-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedWallet(w);
                          setRechargeDialogOpen(true);
                        }}
                      >
                        Recharger
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={walletsPage}
            totalPages={Math.max(1, Math.ceil(walletsTotal / walletsPageSize))}
            totalItems={walletsTotal}
            pageSize={walletsPageSize}
            onPageChange={setWalletsPage}
            onPageSizeChange={setWalletsPageSize}
          />
        </div>
      )}

      {/* Transactions / Ledger Tab */}
      {activeTab === "transactions" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-tertiary/40">
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Rechercher par référence, prestataire..."
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                className="w-full text-xs rounded-xl bg-darnaBg/50 border border-tertiary/60 py-2 ps-9 pe-3 text-primary focus:outline-none focus:border-secondary"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-neutral-500">Type :</label>
              <select
                value={txTypeFilter}
                onChange={(e) => setTxTypeFilter(e.target.value)}
                className="text-xs rounded-xl bg-white border border-tertiary/60 p-2 text-primary focus:outline-none focus:border-secondary cursor-pointer"
              >
                <option value="all">Tous les types</option>
                <option value="deposit">Dépôt / Recharge</option>
                <option value="payout">Virement prestataire</option>
                <option value="booking_payment">Paiement réservation</option>
                <option value="commission">Commission DARNA</option>
                <option value="refund">Remboursement</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-tertiary/40 overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-darnaBg/60 text-neutral-500 font-semibold border-b border-tertiary/40">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Référence</th>
                  <th className="py-3 px-4">Prestataire</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-neutral-50/50">
                    <td className="py-3 px-4 font-mono text-neutral-500">
                      {formatDate(tx.createdAt, locale)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-primary">
                      #{tx.id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-primary">
                      {tx.hostName || "Système"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-700">
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-600">
                      {tx.description}
                    </td>
                    <td className={`py-3 px-4 font-mono font-bold text-right ${
                      tx.amount >= 0 ? "text-secondary" : "text-accent"
                    }`}>
                      {tx.amount >= 0 ? "+" : ""}{formatDzd(tx.amount, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={txPage}
            totalPages={Math.max(1, Math.ceil(txTotal / 10))}
            totalItems={txTotal}
            pageSize={10}
            onPageChange={setTxPage}
          />
        </div>
      )}

      {/* Commissions Tab */}
      {activeTab === "commissions" && (
        <div className="max-w-2xl bg-white rounded-2xl border border-tertiary/40 p-6 space-y-6">
          <div>
            <h3 className="font-bold text-primary text-base">Taux de commissions par type de prestataire</h3>
            <p className="text-xs text-neutral-500 mt-1">
              Les commissions s'appliquent automatiquement lors de la confirmation d'une réservation.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-darnaBg/40 border border-tertiary/40">
              <div>
                <span className="font-bold text-xs text-primary block">Hôtes individuels (Particuliers)</span>
                <span className="text-[11px] text-neutral-500">Logements chez l'habitant, villas, studios</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={commissionRates.individual}
                  onChange={(e) => setCommissionRates({ ...commissionRates, individual: Number(e.target.value) })}
                  className="w-16 text-center font-mono font-bold text-xs rounded-lg border border-tertiary/70 py-1 bg-white"
                />
                <span className="font-bold text-xs text-primary">%</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-darnaBg/40 border border-tertiary/40">
              <div>
                <span className="font-bold text-xs text-primary block">Agences de voyages</span>
                <span className="text-[11px] text-neutral-500">Voyages organisés, circuits, forfaits</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={commissionRates.agency}
                  onChange={(e) => setCommissionRates({ ...commissionRates, agency: Number(e.target.value) })}
                  className="w-16 text-center font-mono font-bold text-xs rounded-lg border border-tertiary/70 py-1 bg-white"
                />
                <span className="font-bold text-xs text-primary">%</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-darnaBg/40 border border-tertiary/40">
              <div>
                <span className="font-bold text-xs text-primary block">Hôtels</span>
                <span className="text-[11px] text-neutral-500">Établissements hôteliers classés (1 à 5 étoiles)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={commissionRates.hotel}
                  onChange={(e) => setCommissionRates({ ...commissionRates, hotel: Number(e.target.value) })}
                  className="w-16 text-center font-mono font-bold text-xs rounded-lg border border-tertiary/70 py-1 bg-white"
                />
                <span className="font-bold text-xs text-primary">%</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-darnaBg/40 border border-tertiary/40">
              <div>
                <span className="font-bold text-xs text-primary block">Auberges de jeunesse (Hostels)</span>
                <span className="text-[11px] text-neutral-500">Dortoirs, lits individuels, auberges</span>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={commissionRates.hostel}
                  onChange={(e) => setCommissionRates({ ...commissionRates, hostel: Number(e.target.value) })}
                  className="w-16 text-center font-mono font-bold text-xs rounded-lg border border-tertiary/70 py-1 bg-white"
                />
                <span className="font-bold text-xs text-primary">%</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              variant="primary"
              onClick={handleSaveCommissions}
              disabled={commissionSaving}
            >
              {commissionSaving ? "Enregistrement..." : "Enregistrer les taux de commission"}
            </Button>
          </div>
        </div>
      )}

      {/* Payouts Tab */}
      {activeTab === "payouts" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-tertiary/40 overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-darnaBg/60 text-neutral-500 font-semibold border-b border-tertiary/40">
                <tr>
                  <th className="py-3 px-4">Date de demande</th>
                  <th className="py-3 px-4">Prestataire</th>
                  <th className="py-3 px-4">Coordonnées bancaires (RIB / RIP)</th>
                  <th className="py-3 px-4 text-right">Montant demandé</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-end">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-neutral-50/50">
                    <td className="py-3 px-4 font-mono text-neutral-500">
                      {formatDate(p.requestedAt, locale)}
                    </td>
                    <td className="py-3 px-4 font-bold text-primary">
                      {p.hostName}
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-600">
                      {p.rib || "007 99999 0001234567 89"}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-right text-primary">
                      {formatDzd(p.amountDzd, locale)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusPill status={p.status} />
                    </td>
                    <td className="py-3 px-4 text-end">
                      {p.status === "pending" ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleApprovePayout(p.id)}
                        >
                          Valider le virement
                        </Button>
                      ) : (
                        <span className="text-secondary font-semibold text-xs">Exécuté</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Refunds Tab */}
      {activeTab === "refunds" && (
        <div className="bg-white rounded-2xl border border-tertiary/40 p-6 space-y-4">
          <h3 className="font-bold text-primary text-base">Historique des remboursements clients</h3>
          <p className="text-xs text-neutral-500">
            Remboursements automatisés ou manuels suite à une annulation de réservation ou résolution de litige.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-darnaBg/60 text-neutral-500 font-semibold border-b border-tertiary/40">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Réservation</th>
                  <th className="py-2.5 px-3">Bénéficiaire</th>
                  <th className="py-2.5 px-3">Motif</th>
                  <th className="py-2.5 px-3 text-right">Montant remboursé</th>
                  <th className="py-2.5 px-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                <tr className="hover:bg-neutral-50/50">
                  <td className="py-2.5 px-3 font-mono text-neutral-500">14 mars 2024</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-primary">#R1205</td>
                  <td className="py-2.5 px-3 font-semibold text-primary">Karim Mansouri</td>
                  <td className="py-2.5 px-3 text-neutral-600">Annulation client dans les délais (&gt;48h)</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-right text-accent">54 000 DZD</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-secondary/10 text-secondary">
                      Remboursé sur carte
                    </span>
                  </td>
                </tr>
                <tr className="hover:bg-neutral-50/50">
                  <td className="py-2.5 px-3 font-mono text-neutral-500">08 mars 2024</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-primary">#R1189</td>
                  <td className="py-2.5 px-3 font-semibold text-primary">Amel Belkacem</td>
                  <td className="py-2.5 px-3 text-neutral-600">Litige résolu en faveur du voyageur</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-right text-accent">38 000 DZD</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-secondary/10 text-secondary">
                      Remboursé sur carte
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recharge Dialog */}
      <Dialog
        isOpen={rechargeDialogOpen}
        onClose={() => setRechargeDialogOpen(false)}
        title="Recharger le portefeuille prestataire"
        description="Créditer manuellement le compte d'un prestataire suite à un versement CCP ou virement bancaire."
      >
        <form onSubmit={handleRechargeSubmit} className="space-y-4 text-xs text-start">
          <div>
            <label className="block font-bold text-primary mb-1">Prestataire</label>
            <input
              type="text"
              disabled
              value={selectedWallet?.hostName || selectedWallet?.ownerName || selectedWallet?.businessName || ""}
              className="w-full rounded-xl bg-neutral-100 border border-tertiary/40 p-2.5 font-bold text-primary"
            />
          </div>

          <div>
            <label className="block font-bold text-primary mb-1">Montant à créditer (DZD)*</label>
            <input
              type="number"
              min="1000"
              step="1000"
              required
              value={rechargeAmount}
              onChange={(e) => setRechargeAmount(Number(e.target.value))}
              className="w-full rounded-xl bg-white border border-tertiary/70 p-2.5 font-mono font-bold text-primary focus:outline-none focus:border-secondary"
            />
          </div>

          <div>
            <label className="block font-bold text-primary mb-1">Mode de règlement</label>
            <select
              value={rechargeMethod}
              onChange={(e) => setRechargeMethod(e.target.value)}
              className="w-full rounded-xl bg-white border border-tertiary/70 p-2.5 text-primary focus:outline-none focus:border-secondary cursor-pointer"
            >
              <option value="ccp">Versement CCP / Algérie Poste</option>
              <option value="bank_transfer">Virement bancaire (BNA, CPA, BEA...)</option>
              <option value="cash_guarantee">Dépôt d'espèces sous garantie</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-primary mb-1">Numéro de reçu / Référence</label>
            <input
              type="text"
              required
              value={rechargeReceipt}
              onChange={(e) => setRechargeReceipt(e.target.value)}
              className="w-full rounded-xl bg-white border border-tertiary/70 p-2.5 text-primary focus:outline-none focus:border-secondary font-mono"
            />
          </div>

          <div>
            <label className="block font-bold text-primary mb-1">Motif interne</label>
            <input
              type="text"
              value={rechargeReason}
              onChange={(e) => setRechargeReason(e.target.value)}
              className="w-full rounded-xl bg-white border border-tertiary/70 p-2.5 text-primary focus:outline-none focus:border-secondary"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRechargeDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={rechargeSubmitting}
            >
              {rechargeSubmitting ? "Traitement..." : "Confirmer le rechargement"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
