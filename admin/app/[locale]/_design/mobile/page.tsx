"use client";

import React, { useState } from "react";
import {
  Sparkles,
  SlidersHorizontal,
  Home,
  Check,
  Eye,
  MoreVertical,
  Plus,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Stepper, StepItem } from "@/components/ui/Stepper";
import { StatusPill } from "@/components/ui/StatusPill";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DetailPanel } from "@/components/ui/DetailPanel";
import { FilterDrawer } from "@/components/ui/FilterDrawer";
import { useToast } from "@/components/ui/Toast";
import { KpiStrip } from "@/components/ui/KpiStrip";

export default function MobileDesignShowcase() {
  const { addToast } = useToast();
  const [currentStep, setCurrentStep] = useState(2);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const steps: StepItem[] = [
    { id: 1, title: "Informations générales" },
    { id: 2, title: "Localisation & Wilaya" },
    { id: 3, title: "Équipements & Services" },
    { id: 4, title: "Photos & Galerie" },
    { id: 5, title: "Tarification" },
    { id: 6, title: "Récapitulatif" },
  ];

  return (
    <div className="min-h-screen bg-darnaBg/60 p-3 sm:p-6 max-w-md mx-auto space-y-6 pb-24 text-start">
      {/* Header */}
      <div className="space-y-1">
        <span className="text-[10px] uppercase font-bold tracking-wider text-secondary px-2 py-0.5 rounded-full bg-secondary-100 border border-secondary-200">
          Mobile Primitives Showcase
        </span>
        <h1 className="text-xl font-bold text-primary tracking-tight">
          DARNA Mobile UX System
        </h1>
        <p className="text-xs text-neutral-500">
          Visual regression environment for mobile phone components (320px–430px).
        </p>
      </div>

      {/* 1. Mobile Stepper Primitives */}
      <section className="bg-white rounded-2xl p-4 border border-tertiary-200 shadow-xs space-y-3">
        <h2 className="text-xs font-bold text-primary uppercase tracking-wide">
          1. Compact Mobile Stepper
        </h2>
        <Stepper
          steps={steps}
          currentStep={currentStep}
          onStepClick={(id) => setCurrentStep(id)}
        />
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
            disabled={currentStep === 1}
            className="flex-1 text-xs"
          >
            Précédent
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setCurrentStep((s) => Math.min(6, s + 1))}
            disabled={currentStep === 6}
            className="flex-1 text-xs"
          >
            Suivant
          </Button>
        </div>
      </section>

      {/* 2. Mobile Card List Mode */}
      <section className="bg-white rounded-2xl p-4 border border-tertiary-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-primary uppercase tracking-wide">
            2. Mobile Card List Pattern
          </h2>
          <span className="text-[10px] text-neutral-400 font-medium">1 résultat</span>
        </div>

        <div className="p-3.5 rounded-xl border border-tertiary-200/80 bg-neutral-50/50 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-bold text-primary truncate">
                Villa des Dunes Sahariennes
              </h3>
              <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                Taghit, Bechar • Riad traditionnel
              </p>
            </div>
            <StatusPill status="approved" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-neutral-100">
            <div>
              <span className="text-neutral-400 block text-[10px]">Tarif / nuit</span>
              <span className="font-mono font-bold text-primary">18 500 DZD</span>
            </div>
            <div>
              <span className="text-neutral-400 block text-[10px]">Hôte</span>
              <span className="text-neutral-700 font-medium truncate block">
                Karim Hadj
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-neutral-100">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Eye className="w-3.5 h-3.5" />}
              onClick={() => setDetailOpen(true)}
              className="text-xs flex-1 justify-center me-2"
            >
              Voir la fiche
            </Button>
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Check className="w-3.5 h-3.5" />}
              onClick={() => addToast({ title: "Annonce approuvée", variant: "success" })}
              className="text-xs"
            >
              Approuver
            </Button>
          </div>
        </div>
      </section>

      {/* 3. Action Sheets & Modals */}
      <section className="bg-white rounded-2xl p-4 border border-tertiary-200 shadow-xs space-y-3">
        <h2 className="text-xs font-bold text-primary uppercase tracking-wide">
          3. Touch Drawers & Sheets
        </h2>
        <div className="space-y-2">
          <Button
            variant="outline"
            onClick={() => setFilterDrawerOpen(true)}
            leftIcon={<SlidersHorizontal className="w-4 h-4" />}
            className="w-full justify-center text-xs"
          >
            Ouvrir le tiroir de filtres (100dvh)
          </Button>

          <Button
            variant="outline"
            onClick={() => setConfirmOpen(true)}
            leftIcon={<Trash2 className="w-4 h-4 text-accent" />}
            className="w-full justify-center text-xs"
          >
            Dialogue de confirmation mobile
          </Button>

          <Button
            variant="secondary"
            onClick={() => addToast({ title: "Action effectuée avec succès au-dessus de la nav", variant: "success" })}
            className="w-full justify-center text-xs"
          >
            Déclencher Toast mobile safe-area
          </Button>
        </div>
      </section>

      {/* Slide-over Detail Sheet */}
      <DetailPanel
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Villa des Dunes Sahariennes"
        subtitle="Hébergement #STAY-001 • Taghit"
        status="approved"
        tabs={[
          { id: "details", label: "Détails" },
          { id: "pricing", label: "Tarifs" },
          { id: "history", label: "Historique" },
        ]}
        activeTab="details"
        onTabChange={() => {}}
        actions={
          <div className="w-full flex gap-2">
            <Button
              variant="primary"
              onClick={() => setDetailOpen(false)}
              className="flex-1 justify-center text-xs"
            >
              Fermer la fiche
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-xs text-neutral-600">
          <p>
            Cette vue démontre le panneau coulissant mobile pleine hauteur (100dvh)
            avec barre d'action inférieure ancrée au-dessus des marges de sécurité iOS/Android.
          </p>
          <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 space-y-1">
            <span className="font-bold text-primary block">Wilaya: Bechar (08)</span>
            <span className="text-neutral-500 block">Capacité: 6 personnes • 3 chambres</span>
          </div>
        </div>
      </DetailPanel>

      {/* Filter Drawer */}
      <FilterDrawer
        isOpen={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        onReset={() => setFilterDrawerOpen(false)}
        onApply={() => setFilterDrawerOpen(false)}
        activeFilterCount={2}
      >
        <div className="space-y-4 py-2 text-xs">
          <div>
            <label className="font-bold text-primary block mb-1.5">Wilaya</label>
            <select className="w-full p-2.5 rounded-xl border border-tertiary-200 text-base sm:text-xs">
              <option>Toutes les wilayas</option>
              <option>16 - Alger</option>
              <option>31 - Oran</option>
              <option>08 - Bechar</option>
            </select>
          </div>
        </div>
      </FilterDrawer>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          addToast({ title: "Suppression confirmée", variant: "warning" });
        }}
        title="Supprimer cette ressource ?"
        description="Cette action est irréversible. Les boutons s'empilent verticalement sur mobile."
        confirmText="Supprimer définitivement"
        cancelLabel="Annuler"
        variant="danger"
      />
    </div>
  );
}
