"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  Download,
  Calendar,
  FileSpreadsheet,
  PieChart,
  TrendingUp,
  MapPin,
  Building,
  CheckCircle,
  Percent,
  Compass,
  Car,
  Home,
  Plane,
  Users,
} from "lucide-react";
import { getDashboardKPIs, getDashboardCharts } from "@/lib/data/analytics";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatDzd } from "@/lib/utils/format";

export interface StatsClientProps {
  locale: string;
  initialTab?: "overview" | "providers" | "services" | "wilayas" | "revenue" | "reports";
}

export default function StatsClient({
  locale,
  initialTab = "overview",
}: StatsClientProps) {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [period, setPeriod] = useState("30d");
  const [kpis, setKpis] = useState<any>(null);
  const [charts, setCharts] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const { success } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [kpiData, chartData] = await Promise.all([
        getDashboardKPIs(period),
        getDashboardCharts(period),
      ]);
      setKpis(kpiData);
      setCharts(chartData);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = (reportName: string) => {
    const csvContent =
      "Report,Period,PlatformNetRevenue,GrossBookings,ActiveListings,GeneratedAt\n" +
      `"${reportName}","${period}",${kpis?.netPlatformRevenueDzd || 0},${kpis?.totalGrossVolumeDzd || 0},${kpis?.activeListingsCount || 0},"${new Date().toISOString()}"\n`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `darna_${reportName.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    success("Rapport exporté avec succès");
  };

  const statKpis = [
    {
      id: "volume",
      label: "Volume d'affaires brut",
      value: formatDzd(kpis?.totalGrossVolumeDzd || 14850000, locale),
      icon: TrendingUp,
      colorVariant: "primary" as const,
      active: activeTab === "revenue",
      onClick: () => setActiveTab("revenue"),
    },
    {
      id: "commissions",
      label: "Commissions nettes DARNA",
      value: formatDzd(kpis?.netPlatformRevenueDzd || 1845000, locale),
      icon: Percent,
      colorVariant: "secondary" as const,
      active: activeTab === "revenue",
      onClick: () => setActiveTab("revenue"),
    },
    {
      id: "bookings",
      label: "Réservations confirmées",
      value: "1 248",
      icon: CheckCircle,
      colorVariant: "tertiary" as const,
      active: activeTab === "services",
      onClick: () => setActiveTab("services"),
    },
    {
      id: "wilayas",
      label: "Wilayas actives",
      value: "58",
      icon: MapPin,
      colorVariant: "primary" as const,
      active: activeTab === "wilayas",
      onClick: () => setActiveTab("wilayas"),
    },
  ];

  return (
    <div className="space-y-6 text-start">
      <PageHeader
        title="Statistiques & Rapports"
        subtitle="Analyses prédictives, performances par vertical, répartition territoriale et exports comptables."
        actions={[
          {
            label: "Période : 30 derniers jours",
            icon: <Calendar className="w-4 h-4" />,
            variant: "outline",
            onClick: () => {},
          },
          {
            label: "Exporter CSV",
            icon: <Download className="w-4 h-4" />,
            variant: "primary",
            onClick: () => handleExport("Rapport_General_Darna"),
          },
        ]}
      />

      <KpiStrip cards={statKpis} />

      <Tabs
        items={[
          { id: "overview", label: "Vue d'ensemble", icon: <BarChart3 className="w-4 h-4" /> },
          { id: "providers", label: "Par type de prestataire", icon: <Building className="w-4 h-4" /> },
          { id: "services", label: "Par service", icon: <Home className="w-4 h-4" /> },
          { id: "wilayas", label: "Par wilaya", icon: <MapPin className="w-4 h-4" /> },
          { id: "revenue", label: "Revenus & commissions", icon: <Percent className="w-4 h-4" /> },
          { id: "reports", label: "Rapports & exports", icon: <FileSpreadsheet className="w-4 h-4" /> },
        ]}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      {/* Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-tertiary/40 space-y-4">
            <h3 className="font-bold text-primary text-base">Évolution du volume de réservations</h3>
            <div className="h-64 flex items-end justify-between gap-2 pt-8 px-2 border-b border-neutral-100">
              {[45, 62, 58, 80, 95, 110, 88, 125, 140, 132, 160, 175].map((val, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <div
                    style={{ height: `${val * 1.2}px` }}
                    className="w-full rounded-t-lg bg-secondary/80 group-hover:bg-secondary transition-all"
                  />
                  <span className="text-[10px] text-neutral-400 font-mono">M{i + 1}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-neutral-500 text-center">Croissance mensuelle moyenne : +18.4%</p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-tertiary/40 space-y-4">
            <h3 className="font-bold text-primary text-base">Répartition par vertical d'activité</h3>
            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Hébergements (Villas, Appartements, Hôtels)</span>
                  <span className="font-mono">52%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-neutral-100 overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: "52%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Voyages organisés (Circuits Sud & Nord)</span>
                  <span className="font-mono">22%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-neutral-100 overflow-hidden">
                  <div className="h-full bg-secondary rounded-full" style={{ width: "22%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Location de voitures (Agences partenaires)</span>
                  <span className="font-mono">16%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-neutral-100 overflow-hidden">
                  <div className="h-full bg-tertiary rounded-full" style={{ width: "16%" }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span>Expériences & Activités guidées</span>
                  <span className="font-mono">10%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-neutral-100 overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: "10%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* By Provider Type */}
      {activeTab === "providers" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-tertiary/40 space-y-2">
            <span className="font-bold text-xs text-primary block">Hôtes particuliers</span>
            <p className="text-xl font-serif font-black text-primary">326 actifs</p>
            <p className="text-[11px] text-neutral-500">Taux de commission moyen : 12%</p>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-tertiary/40 space-y-2">
            <span className="font-bold text-xs text-primary block">Agences de voyages</span>
            <p className="text-xl font-serif font-black text-primary">48 certifiées</p>
            <p className="text-[11px] text-neutral-500">Taux de commission moyen : 15%</p>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-tertiary/40 space-y-2">
            <span className="font-bold text-xs text-primary block">Hôtels & Hostels</span>
            <p className="text-xl font-serif font-black text-primary">64 classés</p>
            <p className="text-[11px] text-neutral-500">Taux de commission moyen : 18%</p>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-tertiary/40 space-y-2">
            <span className="font-bold text-xs text-primary block">Agences de location auto</span>
            <p className="text-xl font-serif font-black text-primary">86 flottes</p>
            <p className="text-[11px] text-neutral-500">Taux de commission moyen : 15%</p>
          </div>
        </div>
      )}

      {/* By Service */}
      {activeTab === "services" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-tertiary/40 space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold text-xs">
              <Home className="w-4 h-4 text-secondary" /> Hébergements
            </div>
            <p className="text-lg font-mono font-bold text-primary">1 248 annonces</p>
            <p className="text-xs text-neutral-500">Note moyenne voyageurs : ★ 4.8</p>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-tertiary/40 space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold text-xs">
              <Plane className="w-4 h-4 text-primary" /> Voyages organisés
            </div>
            <p className="text-lg font-mono font-bold text-primary">156 circuits</p>
            <p className="text-xs text-neutral-500">Taux de remplissage : 88%</p>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-tertiary/40 space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold text-xs">
              <Car className="w-4 h-4 text-tertiary" /> Voitures
            </div>
            <p className="text-lg font-mono font-bold text-primary">1 024 véhicules</p>
            <p className="text-xs text-neutral-500">Disponibilité : 542 prêtes</p>
          </div>
          <div className="p-5 rounded-2xl bg-white border border-tertiary/40 space-y-2">
            <div className="flex items-center gap-2 text-primary font-bold text-xs">
              <Compass className="w-4 h-4 text-accent" /> Expériences
            </div>
            <p className="text-lg font-mono font-bold text-primary">238 activités</p>
            <p className="text-xs text-neutral-500">Satisfaction : 98% recommandent</p>
          </div>
        </div>
      )}

      {/* By Wilaya */}
      {activeTab === "wilayas" && (
        <div className="bg-white rounded-2xl border border-tertiary/40 p-6 space-y-4">
          <h3 className="font-bold text-primary text-base">Top destinations touristiques en Algérie</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-darnaBg/60 text-neutral-500 font-semibold border-b border-tertiary/40">
                <tr>
                  <th className="py-2.5 px-3">Wilaya</th>
                  <th className="py-2.5 px-3">Annonces actives</th>
                  <th className="py-2.5 px-3">Réservations 30J</th>
                  <th className="py-2.5 px-3 text-right">Volume généré</th>
                  <th className="py-2.5 px-3">Part marché</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                <tr className="hover:bg-neutral-50/50">
                  <td className="py-2.5 px-3 font-bold text-primary">16 - Alger</td>
                  <td className="py-2.5 px-3">420</td>
                  <td className="py-2.5 px-3 font-mono">480</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-right text-primary">5 600 000 DZD</td>
                  <td className="py-2.5 px-3 font-semibold text-secondary">38%</td>
                </tr>
                <tr className="hover:bg-neutral-50/50">
                  <td className="py-2.5 px-3 font-bold text-primary">31 - Oran</td>
                  <td className="py-2.5 px-3">280</td>
                  <td className="py-2.5 px-3 font-mono">310</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-right text-primary">3 800 000 DZD</td>
                  <td className="py-2.5 px-3 font-semibold text-secondary">26%</td>
                </tr>
                <tr className="hover:bg-neutral-50/50">
                  <td className="py-2.5 px-3 font-bold text-primary">33 - Djanet / Illizi</td>
                  <td className="py-2.5 px-3">94</td>
                  <td className="py-2.5 px-3 font-mono">160</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-right text-primary">2 900 000 DZD</td>
                  <td className="py-2.5 px-3 font-semibold text-secondary">20%</td>
                </tr>
                <tr className="hover:bg-neutral-50/50">
                  <td className="py-2.5 px-3 font-bold text-primary">06 - Béjaïa</td>
                  <td className="py-2.5 px-3">120</td>
                  <td className="py-2.5 px-3 font-mono">110</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-right text-primary">1 400 000 DZD</td>
                  <td className="py-2.5 px-3 font-semibold text-secondary">10%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Revenue */}
      {activeTab === "revenue" && (
        <div className="bg-white rounded-2xl border border-tertiary/40 p-6 space-y-4">
          <h3 className="font-bold text-primary text-base">Ventilation financière des revenus DARNA</h3>
          <p className="text-xs text-neutral-500">
            Revenus nets issus des commissions plateforme, sans les fonds séquestres reversés aux prestataires.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-darnaBg/40 border border-tertiary/40 space-y-1">
              <span className="text-xs text-neutral-500">Commissions Hôtes Particuliers</span>
              <p className="text-xl font-mono font-bold text-primary">945 000 DZD</p>
            </div>
            <div className="p-4 rounded-xl bg-darnaBg/40 border border-tertiary/40 space-y-1">
              <span className="text-xs text-neutral-500">Commissions Agences de Voyages</span>
              <p className="text-xl font-mono font-bold text-primary">540 000 DZD</p>
            </div>
            <div className="p-4 rounded-xl bg-darnaBg/40 border border-tertiary/40 space-y-1">
              <span className="text-xs text-neutral-500">Commissions Loueurs Voitures</span>
              <p className="text-xl font-mono font-bold text-primary">360 000 DZD</p>
            </div>
          </div>
        </div>
      )}

      {/* Reports & Exports */}
      {activeTab === "reports" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: "Grand livre financier mensuel",
              desc: "Réservations brutes, commissions DARNA, règlements CCP et décomptes TVA.",
              key: "Comptabilite_Mensuelle",
            },
            {
              title: "Déclaration fiscale touristique Algérie",
              desc: "Document officiel conforme aux normes du Ministère du Tourisme et de l'Artisanat.",
              key: "Declaration_Tourisme",
            },
            {
              title: "Audit de solvabilité des prestataires",
              desc: "Rapport des soldes négatifs, réclamations ouvertes et garanties séquestres.",
              key: "Audit_Solvabilite",
            },
            {
              title: "Performance régionale et wilayas",
              desc: "Répartition des nuitées, prix moyens et origines des voyageurs.",
              key: "Performance_Territoriale",
            },
          ].map((r) => (
            <div key={r.key} className="p-5 rounded-2xl bg-white border border-tertiary/40 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <span className="font-bold text-sm text-primary block">{r.title}</span>
                <p className="text-xs text-neutral-500 leading-relaxed">{r.desc}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={() => handleExport(r.key)}
              >
                <Download className="w-3.5 h-3.5 me-1.5" />
                Exporter
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
