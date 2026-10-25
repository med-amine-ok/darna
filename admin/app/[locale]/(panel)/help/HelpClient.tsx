"use client";

import React, { useState } from "react";
import { Link } from "@/navigation";
import { useLocale } from "next-intl";
import {
  HelpCircle,
  BookOpen,
  Search,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Building,
  RotateCcw,
  Compass,
  FileText,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Tabs } from "@/components/ui/Tabs";
import { WHERE_DID_IT_GO_ITEMS } from "@/lib/glossary";

export default function HelpClient() {
  const locale = useLocale() as "en" | "fr" | "ar";
  const [activeTab, setActiveTab] = useState("guides");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredMigration = WHERE_DID_IT_GO_ITEMS.filter((item) => {
    const q = searchQuery.toLowerCase();
    const oldN = (item.oldName[locale] || item.oldName.en).toLowerCase();
    const newN = (item.newName[locale] || item.newName.en).toLowerCase();
    const desc = (item.description[locale] || item.description.en).toLowerCase();
    return oldN.includes(q) || newN.includes(q) || desc.includes(q);
  });

  const kpis = [
    {
      id: "guides",
      label: "Guides opérationnels",
      value: "8 fiches",
      icon: BookOpen,
      colorVariant: "primary" as const,
      active: activeTab === "guides",
      onClick: () => setActiveTab("guides"),
    },
    {
      id: "glossary",
      label: "Glossaire DARNA",
      value: "14 définitions",
      icon: FileText,
      colorVariant: "secondary" as const,
      active: activeTab === "glossary",
      onClick: () => setActiveTab("glossary"),
    },
    {
      id: "migration",
      label: "Où est passée ma page ?",
      value: "18 correspondances",
      icon: Compass,
      colorVariant: "tertiary" as const,
      active: activeTab === "migration",
      onClick: () => setActiveTab("migration"),
    },
  ];

  return (
    <div className="space-y-6 text-start max-w-6xl mx-auto">
      <PageHeader
        title="Centre d'aide & Formation DARNA"
        subtitle="Guides opérationnels pas-à-pas, définitions métiers et guide de navigation."
      />

      <KpiStrip cards={kpis} />

      <Tabs
        items={[
          { id: "guides", label: "Guides pratiques pas-à-pas", icon: <BookOpen className="w-4 h-4" /> },
          { id: "glossary", label: "Glossaire des termes métiers", icon: <FileText className="w-4 h-4" /> },
          { id: "migration", label: "Où est passée ma page ?", icon: <Compass className="w-4 h-4" /> },
        ]}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      {/* Task Guides */}
      {activeTab === "guides" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl bg-white border border-tertiary/40 space-y-3 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center text-secondary">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-primary text-base">
              Comment valider ou refuser un nouveau prestataire ?
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Consultez les pièces d'identité, registre de commerce ou licence d'agence de voyage. Chaque document dispose d'un bouton de vérification individuelle avant approbation définitive.
            </p>
            <div className="pt-2">
              <Link
                href="/moderation/providers"
                className="text-xs font-bold text-secondary flex items-center gap-1 hover:underline"
              >
                Accéder à la validation des prestataires →
              </Link>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-tertiary/40 space-y-3 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <RotateCcw className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-primary text-base">
              Comment traiter un remboursement suite à annulation ?
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Dans la liste des réservations, ouvrez le panneau latéral et vérifiez la politique d'annulation (&gt;48h = 100%). Cliquez sur &quot;Rembourser&quot; pour enregistrer la ligne au grand livre.
            </p>
            <div className="pt-2">
              <Link
                href="/bookings"
                className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
              >
                Accéder à la gestion des réservations →
              </Link>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-tertiary/40 space-y-3 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-tertiary/20 flex items-center justify-center text-primary">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-primary text-base">
              Comment fonctionnent les commissions et le séquestre ?
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Les fonds versés par les voyageurs sont conservés sous séquestre jusqu'à la fin de la prestation. Les commissions (10% à 18%) sont automatiquement retenues lors du virement prestataire.
            </p>
            <div className="pt-2">
              <Link
                href="/payments/commissions"
                className="text-xs font-bold text-primary flex items-center gap-1 hover:underline"
              >
                Configurer les taux de commissions →
              </Link>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-tertiary/40 space-y-3 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center text-accent">
              <Building className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-primary text-base">
              Distinction entre Hébergement particulier et Hôtel/Hostel
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Les hôtels et auberges de jeunesse disposent de types de chambres multiples (chambre privée ou lit en dortoir) et sont classés par étoiles ou licence hôtelière officielle.
            </p>
            <div className="pt-2">
              <Link
                href="/stays"
                className="text-xs font-bold text-accent flex items-center gap-1 hover:underline"
              >
                Voir le catalogue des hébergements →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Glossary */}
      {activeTab === "glossary" && (
        <div className="bg-white rounded-2xl border border-tertiary/40 p-6 space-y-4">
          <h3 className="font-bold text-primary text-base">Terminologie officielle DARNA</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-3.5 rounded-xl bg-darnaBg/30 border border-tertiary/40 space-y-1">
              <span className="font-bold text-xs text-primary block">DZD (Dinar Algérien)</span>
              <p className="text-xs text-neutral-600">
                Monnaie unique de tarification et de versement sur la plateforme. Toutes les écritures comptables utilisent le DZD.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-darnaBg/30 border border-tertiary/40 space-y-1">
              <span className="font-bold text-xs text-primary block">Séquestre (Escrow)</span>
              <p className="text-xs text-neutral-600">
                Mécanisme de garantie retenant les montants payés jusqu'au lendemain du check-in ou début de l'activité.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-darnaBg/30 border border-tertiary/40 space-y-1">
              <span className="font-bold text-xs text-primary block">Hôte Individuel (Particulier)</span>
              <p className="text-xs text-neutral-600">
                Personne physique louant un logement chez l'habitant, une villa ou un appartement meublé.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-darnaBg/30 border border-tertiary/40 space-y-1">
              <span className="font-bold text-xs text-primary block">Agence de Voyage</span>
              <p className="text-xs text-neutral-600">
                Structure professionnelle titulaire d'une licence agréée par le Ministère du Tourisme pour organiser des circuits touristiques.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Migration / Where did it go */}
      {activeTab === "migration" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-tertiary/40">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-neutral-400 absolute start-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher l'ancien nom de la page..."
                className="w-full ps-9 pe-4 py-2 text-xs rounded-xl bg-darnaBg/50 border border-tertiary/70 text-primary focus:outline-none focus:border-secondary"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-tertiary/40 overflow-hidden shadow-2xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-darnaBg/60 text-neutral-500 font-semibold border-b border-tertiary/40">
                <tr>
                  <th className="py-3 px-4">Ancien nom de page</th>
                  <th className="py-3 px-4">Nouvelle rubrique dans le menu</th>
                  <th className="py-3 px-4">Description & utilité</th>
                  <th className="py-3 px-4 text-end">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredMigration.map((item, idx) => (
                  <tr key={idx} className="hover:bg-neutral-50/50">
                    <td className="py-3 px-4 font-mono text-neutral-500">
                      {item.oldName[locale] || item.oldName.en}
                    </td>
                    <td className="py-3 px-4 font-bold text-primary">
                      {item.newName[locale] || item.newName.en}
                    </td>
                    <td className="py-3 px-4 text-neutral-600">
                      {item.description[locale] || item.description.en}
                    </td>
                    <td className="py-3 px-4 text-end">
                      <Link
                        href={item.href}
                        className="text-xs font-bold text-secondary hover:underline inline-flex items-center gap-1"
                      >
                        Ouvrir →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
