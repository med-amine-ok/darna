"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Home,
  Compass,
  Plane,
  Car,
  Star,
  Users,
  CheckCircle,
  AlertTriangle,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { StatusPill } from "@/components/ui/StatusPill";
import { TypePill } from "@/components/ui/TypePill";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { InfoTile } from "@/components/ui/InfoTile";
import { DocumentTile } from "@/components/ui/DocumentTile";
import { Stepper } from "@/components/ui/Stepper";
import { LivePreviewCard } from "@/components/ui/LivePreviewCard";
import { ProgressChecklist } from "@/components/ui/ProgressChecklist";
import { TipsCard } from "@/components/ui/TipsCard";

export default function DesignShowcasePage() {
  const [activeTab, setActiveTab] = useState("tokens");

  return (
    <div className="space-y-8 text-start max-w-6xl mx-auto pb-16">
      <PageHeader
        title="DARNA Admin — Design System & Tokens Showcase"
        subtitle="Palette Earthy Minimal exclusive (#2E3A2F, #6B7F5B, #D9C9B2, #C96F4F, #F8F6EE)."
      />

      <Tabs
        items={[
          { id: "tokens", label: "Palette & Tokens" },
          { id: "pills", label: "Pills & Badges" },
          { id: "components", label: "Composants Spécialisés" },
        ]}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      {/* Palette Tokens */}
      {activeTab === "tokens" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div className="p-5 rounded-2xl bg-[#2E3A2F] text-white space-y-2">
              <span className="font-bold text-xs block">Primary</span>
              <p className="font-mono text-sm">#2E3A2F</p>
              <p className="text-[11px] text-white/70">Sidebar, titres H1, boutons principaux</p>
            </div>
            <div className="p-5 rounded-2xl bg-[#6B7F5B] text-white space-y-2">
              <span className="font-bold text-xs block">Secondary</span>
              <p className="font-mono text-sm">#6B7F5B</p>
              <p className="text-[11px] text-white/70">Validation, disponible, succès, liens</p>
            </div>
            <div className="p-5 rounded-2xl bg-[#D9C9B2] text-primary space-y-2">
              <span className="font-bold text-xs block">Tertiary</span>
              <p className="font-mono text-sm">#D9C9B2</p>
              <p className="text-[11px] text-primary/70">Bordures, neutre chaud, en attente</p>
            </div>
            <div className="p-5 rounded-2xl bg-[#C96F4F] text-white space-y-2">
              <span className="font-bold text-xs block">Accent</span>
              <p className="font-mono text-sm">#C96F4F</p>
              <p className="text-[11px] text-white/70">Refusé, alertes, suppressions, badges urgents</p>
            </div>
            <div className="p-5 rounded-2xl bg-[#F8F6EE] text-primary border border-tertiary/60 space-y-2">
              <span className="font-bold text-xs block">Background</span>
              <p className="font-mono text-sm">#F8F6EE</p>
              <p className="text-[11px] text-primary/70">Fond de page global, zones de contenu</p>
            </div>
          </div>
        </div>
      )}

      {/* Pills & Badges */}
      {activeTab === "pills" && (
        <div className="space-y-6 bg-white p-6 rounded-2xl border border-tertiary/40">
          <h3 className="font-bold text-primary text-base">Status & Type Vocabulary (lib/status.ts)</h3>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Statuts Annonces & Prestataires</h4>
            <div className="flex flex-wrap gap-2">
              <StatusPill status="published" />
              <StatusPill status="pending" />
              <StatusPill status="suspended" />
              <StatusPill status="refused" />
              <StatusPill status="draft" />
              <StatusPill status="confirmed" />
              <StatusPill status="in_progress" />
              <StatusPill status="completed" />
              <StatusPill status="cancelled" />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-neutral-100">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Pills de types de prestataires</h4>
            <div className="flex flex-wrap gap-2">
              <TypePill type="host" />
              <TypePill type="hotel" />
              <TypePill type="hostel" />
              <TypePill type="travel_agency" />
              <TypePill type="experience_company" />
              <TypePill type="rental_agency" />
            </div>
          </div>
        </div>
      )}

      {/* Specialized Components */}
      {activeTab === "components" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InfoTile label="Capacité d'accueil" value="8 voyageurs" />
            <InfoTile label="Chambres" value="4 chambres" />
            <InfoTile label="Surface" value="250 m²" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DocumentTile
              title="Pièce d'identité (CNI)"
              fileName="cni_benali_recto.jpg"
              size="2.4 Mo"
              status="valid"
              onView={() => {}}
            />
            <DocumentTile
              title="Titre de propriété foncier"
              fileName="acte_notarie_hydra.pdf"
              size="8.1 Mo"
              status="to_check"
              onView={() => {}}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProgressChecklist
              currentStep={2}
              totalSteps={6}
              steps={[
                { number: 1, title: "Informations générales", completed: true },
                { number: 2, title: "Localisation", completed: false },
                { number: 3, title: "Équipements", completed: false },
                { number: 4, title: "Photos & médias", completed: false },
                { number: 5, title: "Tarifs & disponibilités", completed: false },
                { number: 6, title: "Règles & validation", completed: false },
              ]}
            />
            <TipsCard
              title="Conseils pour la localisation"
              tips={[
                "Positionnez précisément le repère sur la carte pour aider les voyageurs.",
                "Vous pouvez masquer l'adresse exacte jusqu'à la confirmation de réservation.",
                "Renseignez au moins 2 points d'intérêt ou commodités à proximité.",
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
}
