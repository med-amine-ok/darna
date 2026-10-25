"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "@/navigation";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
  MapPin,
  Star,
  ShieldCheck,
  Eye,
  FileText,
  Home,
  Users,
  Bed,
  Bath,
  Maximize2,
  Calendar,
  AlertTriangle,
  Check,
  CheckCircle2,
} from "lucide-react";
import { Stepper, StepItem } from "@/components/ui/Stepper";
import { Tabs } from "@/components/ui/Tabs";
import { StatusPill } from "@/components/ui/StatusPill";
import { TypePill } from "@/components/ui/TypePill";
import { InfoTile } from "@/components/ui/InfoTile";
import { useToast } from "@/components/ui/Toast";
import { approveListing, rejectListing, requestChangesListing } from "@/lib/data/listings";
import { Listing } from "@/lib/types";

interface StayReviewClientProps {
  stay: Listing;
}

export default function StayReviewClient({ stay }: StayReviewClientProps) {
  const router = useRouter();
  const { addToast } = useToast();

  const [currentStep, setCurrentStep] = useState(4); // Step 4 "Vérification"
  const [activeTab, setActiveTab] = useState("info");
  const [internalNotes, setInternalNotes] = useState("");
  const [selectedDecision, setSelectedDecision] = useState<"approve" | "changes" | "reject">("approve");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stepper definition (Mockup 04)
  const steps: StepItem[] = [
    { id: 1, title: "Informations" },
    { id: 2, title: "Photos" },
    { id: 3, title: "Documents" },
    { id: 4, title: "Vérification" },
    { id: 5, title: "Décision" },
  ];

  // Checklist items (Mockup 04)
  const [checklist, setChecklist] = useState([
    { id: "id_proof", title: "Pièce d'identité du propriétaire", status: "Valide", ok: true },
    { id: "residence_proof", title: "Justificatif de domicile", status: "Valide", ok: true },
    { id: "property_title", title: "Titre de propriété ou contrat", status: "Valide", ok: true },
    { id: "photos", title: "Photos de l'hébergement", status: "Conformes", ok: true },
    { id: "address", title: "Adresse sur la carte", status: "Vérifiée", ok: true },
    { id: "completeness", title: "Informations complètes", status: "Complète", ok: true },
    { id: "rules", title: "Conformité aux règles", status: "Conforme", ok: true },
  ]);

  const toggleCheck = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, ok: !item.ok, status: !item.ok ? "Valide" : "À vérifier" }
          : item
      )
    );
  };

  const handleExecuteDecision = async () => {
    setIsSubmitting(true);
    try {
      const actor = { id: "usr_admin", name: "Admin", role: "super_admin" };
      if (selectedDecision === "approve") {
        await approveListing(stay.id, actor);
        addToast({ title: "Hébergement approuvé et publié avec succès", variant: "success" });
      } else if (selectedDecision === "reject") {
        await rejectListing(stay.id, internalNotes || "Dossier non conforme", actor);
        addToast({ title: "Hébergement refusé. Notification transmise à l'hôte.", variant: "warning" });
      } else {
        await requestChangesListing(stay.id, internalNotes || "Modifications requises", actor);
        addToast({ title: "Demande de compléments envoyée au propriétaire.", variant: "info" });
      }
      router.push("/stays");
    } catch (err: any) {
      addToast({ title: "Erreur", description: err.message, variant: "danger" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const images = stay.imageSrc?.length ? stay.imageSrc : ["/placeholder-stay.jpg"];
  const formattedId = stay.formattedId || `#H${stay.id.replace("lst_", "").padStart(5, "0")}`;

  return (
    <div className="space-y-6">
      {/* 1. Header (Mockup 04) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9C9B2]/50 pb-5">
        <div>
          <button
            onClick={() => router.push("/stays")}
            className="inline-flex items-center gap-1.5 text-xs text-[#2E3A2F]/70 hover:text-[#2E3A2F] mb-2 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour à la liste</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[#2E3A2F]">Validation d'un hébergement</h1>
            <StatusPill status={stay.status} />
          </div>
          <p className="text-xs text-[#2E3A2F]/60 mt-1">
            Vérifiez toutes les informations et documents avant de publier l'annonce.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => window.open(`/stays/${stay.id}`, "_blank")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#2E3A2F] bg-white border border-[#D9C9B2] rounded-lg hover:bg-[#F8F6EE]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Voir sur le site</span>
          </button>
          <button
            onClick={() => setCurrentStep((prev) => Math.min(5, prev + 1))}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#2E3A2F] rounded-lg hover:bg-[#242e25]"
          >
            <span>Suivant →</span>
          </button>
        </div>
      </div>

      {/* 2. Stepper (Mockup 04: 5 steps connected with lines) */}
      <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm">
        <Stepper steps={steps} currentStep={currentStep} onStepClick={setCurrentStep} />
      </div>

      {/* 3. Main Two-Column Layout (Mockup 04) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Gallery (Main + Thumbs) */}
          <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm space-y-3">
            <div className="relative aspect-[16/9] rounded-lg overflow-hidden border border-[#D9C9B2]/40 bg-[#E5DFD3]">
              <Image src={images[0]} alt={stay.title} fill className="object-cover" />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {images.slice(1, 6).map((img, i) => (
                <div key={i} className="relative w-20 h-16 rounded-lg overflow-hidden border border-[#D9C9B2]/50 shrink-0">
                  <Image src={img} alt="" fill className="object-cover" />
                </div>
              ))}
              {images.length > 6 && (
                <div className="w-20 h-16 rounded-lg bg-[#FAF9F5] border border-[#D9C9B2]/60 flex items-center justify-center text-xs font-medium text-[#2E3A2F] shrink-0">
                  +{images.length - 6}
                </div>
              )}
            </div>
          </div>

          {/* Property Header & Stat Tiles */}
          <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#2E3A2F]">{stay.title}</h2>
                  <span className="px-2 py-0.5 text-xs bg-[#FAF9F5] text-[#2E3A2F] border border-[#D9C9B2] rounded">
                    {stay.propertyType}
                  </span>
                  <StatusPill status={stay.status} />
                </div>
                <div className="text-xs text-[#2E3A2F]/60 flex items-center gap-2 mt-1">
                  <span>ID: {formattedId}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-[#6B7F5B]">
                    <MapPin className="w-3.5 h-3.5" /> {stay.city}, {stay.wilayaCode}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 pt-3 border-t border-[#D9C9B2]/40">
              <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#D9C9B2]/40 text-center">
                <Users className="w-4 h-4 text-[#6B7F5B] mx-auto mb-1" />
                <span className="text-xs font-bold text-[#2E3A2F] block">{stay.guestCapacity}</span>
                <span className="text-[11px] text-[#2E3A2F]/60">Voyageurs</span>
              </div>
              <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#D9C9B2]/40 text-center">
                <Bed className="w-4 h-4 text-[#6B7F5B] mx-auto mb-1" />
                <span className="text-xs font-bold text-[#2E3A2F] block">{stay.bedroomCount || 1}</span>
                <span className="text-[11px] text-[#2E3A2F]/60">Chambres</span>
              </div>
              <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#D9C9B2]/40 text-center">
                <Bath className="w-4 h-4 text-[#6B7F5B] mx-auto mb-1" />
                <span className="text-xs font-bold text-[#2E3A2F] block">{stay.bathroomCount || 1}</span>
                <span className="text-[11px] text-[#2E3A2F]/60">Salles de bain</span>
              </div>
              <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#D9C9B2]/40 text-center">
                <Maximize2 className="w-4 h-4 text-[#6B7F5B] mx-auto mb-1" />
                <span className="text-xs font-bold text-[#2E3A2F] block">{stay.surfaceM2 || 120} m²</span>
                <span className="text-[11px] text-[#2E3A2F]/60">Surface</span>
              </div>
            </div>
          </div>

          {/* Host Mini-Card (Mockup 04) */}
          <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#D9C9B2]/40">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#2E3A2F]/70">
                Informations sur le propriétaire
              </span>
              <button
                onClick={() => router.push(`/hosts/${stay.hostId}`)}
                className="text-xs text-[#6B7F5B] font-medium hover:underline"
              >
                Voir le profil complet
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#E5DFD3] flex items-center justify-center font-bold text-base text-[#2E3A2F]">
                {stay.hostName.charAt(0)}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#2E3A2F]">{stay.hostName}</h4>
                <div className="flex items-center gap-2 text-xs text-[#2E3A2F]/60 mt-0.5">
                  <span className="capitalize">{stay.hostType}</span>
                  <span>•</span>
                  <span>Membre depuis 2023</span>
                  <span>•</span>
                  <span className="text-amber-500 font-medium">★ {stay.rating.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs bar: Informations générales · Localisation · Équipements · etc. */}
          <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm space-y-4">
            <Tabs
              items={[
                { id: "info", label: "Informations générales" },
                { id: "location", label: "Localisation" },
                { id: "amenities", label: "Équipements" },
                { id: "pricing", label: "Tarifs et disponibilité" },
                { id: "rules", label: "Règles" },
              ]}
              activeId={activeTab}
              onChange={setActiveTab}
            />

            {activeTab === "info" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <InfoTile label="Titre" value={stay.title} />
                  <InfoTile label="Type de logement" value={stay.propertyType} />
                  <InfoTile label="Catégorie" value={stay.category} />
                  <InfoTile label="Capacité d'accueil" value={`${stay.guestCapacity} personnes`} />
                  <InfoTile label="Chambres" value={`${stay.bedroomCount || 1}`} />
                  <InfoTile label="Salles de bain" value={`${stay.bathroomCount || 1}`} />
                  <InfoTile label="Surface" value={`${stay.surfaceM2 || 120} m²`} />
                  <InfoTile label="Année de construction" value={`${stay.constructionYear || 2020}`} />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-[#2E3A2F] mb-1.5">Description</h4>
                  <p className="text-xs text-[#2E3A2F]/80 leading-relaxed bg-[#FAF9F5] p-3 rounded-lg border border-[#D9C9B2]/40">
                    {stay.description}
                  </p>
                </div>
              </div>
            )}

            {activeTab === "amenities" && (
              <div className="flex flex-wrap gap-2">
                {stay.amenities.map((am, i) => (
                  <span key={i} className="px-3 py-1.5 bg-[#FAF9F5] border border-[#D9C9B2]/50 rounded-lg text-xs text-[#2E3A2F] flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-[#6B7F5B]" />
                    <span>{am}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Verification Checklist + Internal Notes + Decision (Mockup 04) */}
        <div className="space-y-6">
          {/* Vérification et conformité Checklist */}
          <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-[#2E3A2F] pb-2 border-b border-[#D9C9B2]/40">
              Vérification et conformité
            </h3>
            <div className="space-y-2.5">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF9F5] border border-[#D9C9B2]/40 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <input
                      type="checkbox"
                      checked={item.ok}
                      onChange={() => toggleCheck(item.id)}
                      className="w-4 h-4 rounded text-[#2E3A2F] accent-[#2E3A2F]"
                    />
                    <span className="text-[#2E3A2F] font-medium truncate">{item.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${item.ok ? "bg-secondary/15 text-secondary" : "bg-amber-100 text-amber-800"}`}>
                      {item.status}
                    </span>
                    <button className="p-1 text-[#2E3A2F]/60 hover:text-[#2E3A2F]" title="Examiner">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes Internes (Mockup 04) */}
          <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-[#2E3A2F] pb-2 border-b border-[#D9C9B2]/40">
              Notes internes
            </h3>
            <p className="text-[11px] text-[#2E3A2F]/60">
              Visible uniquement par les administrateurs et modérateurs de DARNA.
            </p>
            <textarea
              rows={3}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Ajouter une remarque pour les modérateurs ou consigner une vérification..."
              className="w-full px-3 py-2 text-xs bg-[#FAF9F5] border border-[#D9C9B2] rounded-lg text-[#2E3A2F] focus:outline-none focus:ring-1 focus:ring-[#2E3A2F]"
            />
          </div>

          {/* Décision Radio Group + Action Buttons (Mockup 04) */}
          <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-[#2E3A2F] pb-2 border-b border-[#D9C9B2]/40">
              Décision
            </h3>
            <div className="space-y-3 text-xs">
              <label
                onClick={() => setSelectedDecision("approve")}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedDecision === "approve"
                    ? "bg-secondary/10 border-secondary"
                    : "bg-[#FAF9F5] border-[#D9C9B2]/50 hover:bg-[#F8F6EE]"
                }`}
              >
                <input
                  type="radio"
                  name="decision"
                  checked={selectedDecision === "approve"}
                  onChange={() => setSelectedDecision("approve")}
                  className="mt-0.5 accent-[#6B7F5B]"
                />
                <div>
                  <span className="font-semibold text-[#2E3A2F] block">Approuver et publier</span>
                  <span className="text-[#2E3A2F]/70 text-[11px]">
                    L'annonce sera immédiatement publiée sur la plateforme.
                  </span>
                </div>
              </label>

              <label
                onClick={() => setSelectedDecision("changes")}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedDecision === "changes"
                    ? "bg-[#D9C9B2]/30 border-[#8C682E]"
                    : "bg-[#FAF9F5] border-[#D9C9B2]/50 hover:bg-[#F8F6EE]"
                }`}
              >
                <input
                  type="radio"
                  name="decision"
                  checked={selectedDecision === "changes"}
                  onChange={() => setSelectedDecision("changes")}
                  className="mt-0.5 accent-[#8C682E]"
                />
                <div>
                  <span className="font-semibold text-[#2E3A2F] block">Demander des modifications</span>
                  <span className="text-[#2E3A2F]/70 text-[11px]">
                    L'hôte devra apporter des modifications avant une nouvelle validation.
                  </span>
                </div>
              </label>

              <label
                onClick={() => setSelectedDecision("reject")}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedDecision === "reject"
                    ? "bg-accent/10 border-accent"
                    : "bg-[#FAF9F5] border-[#D9C9B2]/50 hover:bg-[#F8F6EE]"
                }`}
              >
                <input
                  type="radio"
                  name="decision"
                  checked={selectedDecision === "reject"}
                  onChange={() => setSelectedDecision("reject")}
                  className="mt-0.5 accent-[#C96F4F]"
                />
                <div>
                  <span className="font-semibold text-[#2E3A2F] block">Refuser</span>
                  <span className="text-[#2E3A2F]/70 text-[11px]">
                    L'annonce sera refusée et l'hôte en sera informé avec le motif.
                  </span>
                </div>
              </label>
            </div>

            {/* Action buttons (Mockup 04) */}
            <div className="pt-2 space-y-2">
              <button
                disabled={isSubmitting}
                onClick={handleExecuteDecision}
                className={`w-full py-2.5 px-4 rounded-lg font-semibold text-xs text-white shadow-sm transition-colors ${
                  selectedDecision === "approve"
                    ? "bg-[#6B7F5B] hover:bg-[#5a6b4c]"
                    : selectedDecision === "reject"
                    ? "bg-[#C96F4F] hover:bg-[#b05f42]"
                    : "bg-[#2E3A2F] hover:bg-[#242e25]"
                }`}
              >
                {selectedDecision === "approve"
                  ? "Approuver et publier"
                  : selectedDecision === "reject"
                  ? "Confirmer le refus"
                  : "Envoyer la demande de modification"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
