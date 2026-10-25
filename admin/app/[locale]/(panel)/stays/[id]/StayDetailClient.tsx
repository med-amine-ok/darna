"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "@/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Star,
  ShieldCheck,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Eye,
  Download,
  Edit,
  Trash2,
  Home,
  Users,
  Bed,
  Bath,
  Maximize2,
  Calendar,
  AlertTriangle,
  Info,
  Check,
  RotateCcw,
} from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import { StatusPill } from "@/components/ui/StatusPill";
import { TypePill } from "@/components/ui/TypePill";
import { InfoTile } from "@/components/ui/InfoTile";
import { useToast } from "@/components/ui/Toast";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getListingById, approveListing, rejectListing, requestChangesListing, restoreListing } from "@/lib/data/listings";
import { Listing } from "@/lib/types";

interface StayDetailClientProps {
  initialStay: Listing | null;
  stayId: string;
}

export default function StayDetailClient({ initialStay, stayId }: StayDetailClientProps) {
  const router = useRouter();
  const { addToast } = useToast();

  const [stay, setStay] = useState<Listing | null>(initialStay);
  const [activeTab, setActiveTab] = useState("overview");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [decisionModal, setDecisionModal] = useState<"approve" | "reject" | "changes" | null>(null);
  const [decisionNotes, setDecisionNotes] = useState("");

  const formattedId = stay?.formattedId || `#H${stayId.replace("lst_", "").padStart(5, "0")}`;

  const handleApprove = async () => {
    if (!stay) return;
    try {
      const updated = await approveListing(stay.id, { id: "usr_admin", name: "Admin", role: "super_admin" });
      setStay(updated);
      addToast({ title: "Hébergement approuvé et publié", variant: "success" });
      setDecisionModal(null);
    } catch (err: any) {
      addToast({ title: "Erreur", description: err.message, variant: "danger" });
    }
  };

  const handleReject = async () => {
    if (!stay) return;
    try {
      const updated = await rejectListing(stay.id, decisionNotes || "Dossier non conforme", {
        id: "usr_admin",
        name: "Admin",
        role: "super_admin",
      });
      setStay(updated);
      addToast({ title: "Hébergement refusé", variant: "warning" });
      setDecisionModal(null);
    } catch (err: any) {
      addToast({ title: "Erreur", description: err.message, variant: "danger" });
    }
  };

  const handleRequestChanges = async () => {
    if (!stay) return;
    try {
      const updated = await requestChangesListing(stay.id, decisionNotes || "Modifications requises", {
        id: "usr_admin",
        name: "Admin",
        role: "super_admin",
      });
      setStay(updated);
      addToast({ title: "Modifications demandées à l'hôte", variant: "info" });
      setDecisionModal(null);
    } catch (err: any) {
      addToast({ title: "Erreur", description: err.message, variant: "danger" });
    }
  };

  const handleRestore = async () => {
    if (!stay) return;
    try {
      const updated = await restoreListing(stay.id, { id: "usr_admin", name: "Admin", role: "super_admin" });
      setStay(updated);
      addToast({ title: "Suspension annulée / Hébergement réactivé", variant: "success" });
    } catch (err: any) {
      addToast({ title: "Erreur", description: err.message, variant: "danger" });
    }
  };

  if (!stay) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-[#D9C9B2]/60">
        <h2 className="text-base font-semibold text-[#2E3A2F]">Hébergement introuvable</h2>
        <p className="text-xs text-[#2E3A2F]/60 mt-1">L'annonce demandée n'existe pas ou a été supprimée.</p>
        <button
          onClick={() => router.push("/stays")}
          className="mt-4 px-4 py-2 bg-[#2E3A2F] text-white rounded-lg text-xs"
        >
          Retour aux hébergements
        </button>
      </div>
    );
  }

  const images = stay.imageSrc?.length ? stay.imageSrc : ["/placeholder-stay.jpg"];

  return (
    <div className="space-y-6">
      {/* 1. Header (Mockup 06: Back link, title, status pill, id, prev/next) */}
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
            <h1 className="text-xl font-bold text-[#2E3A2F]">{stay.title}</h1>
            <StatusPill status={stay.status} />
          </div>
          <div className="flex items-center gap-2 text-xs text-[#2E3A2F]/60 mt-1">
            <span className="font-mono font-medium">{formattedId}</span>
            <span>•</span>
            <span>Ajouté le {new Date(stay.createdAt).toLocaleDateString("fr-FR")} à {new Date(stay.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
            <span>•</span>
            <span className="text-[#6B7F5B] flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {stay.city}, {stay.wilayaCode}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/stays/${stay.id}/review`)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#2E3A2F] bg-white border border-[#D9C9B2] rounded-lg hover:bg-[#F8F6EE]"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Vérification & Modération</span>
          </button>
          <button
            className="p-2 border border-[#D9C9B2] rounded-lg bg-white text-[#2E3A2F]/70 hover:bg-[#F8F6EE]"
            title="Précédent"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            className="p-2 border border-[#D9C9B2] rounded-lg bg-white text-[#2E3A2F]/70 hover:bg-[#F8F6EE]"
            title="Suivant"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Tab Bar (Mockup 06: 9 tabs) */}
      <Tabs
        items={[
          { id: "overview", label: "Vue d'ensemble" },
          { id: "info", label: "Informations" },
          { id: "photos", label: "Photos" },
          { id: "amenities", label: "Équipements" },
          { id: "pricing", label: "Tarifs et disponibilité" },
          { id: "rules", label: "Règles" },
          { id: "calendar", label: "Calendrier" },
          { id: "documents", label: "Documents" },
          { id: "history", label: "Historique" },
        ]}
        activeId={activeTab}
        onChange={setActiveTab}
      />

      {/* 3. Main Body: Left Content + Right Rail (Mockup 06) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Gallery Card */}
          <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm space-y-3">
            <div className="relative aspect-[16/9] rounded-lg overflow-hidden border border-[#D9C9B2]/40 bg-[#E5DFD3]">
              <Image
                src={images[0]}
                alt={stay.title}
                fill
                className="object-cover"
              />
              <span className="absolute top-3 start-3 px-2.5 py-1 text-[11px] font-medium bg-[#2E3A2F]/80 text-white backdrop-blur-sm rounded-md">
                Image principale
              </span>
            </div>

            {/* Thumbnail Strip */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {images.slice(1, 6).map((img, i) => (
                <div
                  key={i}
                  onClick={() => setLightboxImage(img)}
                  className="relative w-20 h-16 rounded-lg overflow-hidden border border-[#D9C9B2]/50 shrink-0 cursor-pointer hover:opacity-90"
                >
                  <Image src={img} alt="" fill className="object-cover" />
                </div>
              ))}
              {images.length > 6 && (
                <button
                  onClick={() => setActiveTab("photos")}
                  className="w-20 h-16 rounded-lg bg-[#FAF9F5] border border-[#D9C9B2]/60 flex items-center justify-center text-xs font-medium text-[#2E3A2F] shrink-0 hover:bg-[#EAE5D9]"
                >
                  +{images.length - 6} photos
                </button>
              )}
            </div>
          </div>

          {/* Informations Générales Card (3-column field grid) */}
          <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#D9C9B2]/40">
              <h3 className="text-sm font-semibold text-[#2E3A2F]">Informations générales</h3>
              <button className="text-xs font-medium text-[#6B7F5B] hover:underline flex items-center gap-1">
                <Edit className="w-3.5 h-3.5" /> Modifier
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <InfoTile label="Type de logement" value={stay.propertyType} />
              <InfoTile label="Catégorie" value={stay.category} />
              <InfoTile label="Capacité d'accueil" value={`${stay.guestCapacity} personnes`} />
              <InfoTile label="Chambres" value={`${stay.bedroomCount || 1}`} />
              <InfoTile label="Salles de bain" value={`${stay.bathroomCount || 1}`} />
              <InfoTile label="Surface" value={`${stay.surfaceM2 || 120} m²`} />
              <InfoTile label="Année de construction" value={`${stay.constructionYear || 2020}`} />
              <InfoTile label="Prix par nuit" value={`${stay.price.toLocaleString("fr-FR")} DZD`} />
              <InfoTile label="Mode d'approbation" value={stay.bookingApprovalMode === "instant" ? "Instantanée" : "Sur demande"} />
            </div>

            <div className="mt-4 pt-4 border-t border-[#D9C9B2]/40">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#2E3A2F]/70 mb-1.5">Description</h4>
              <p className="text-xs text-[#2E3A2F]/80 leading-relaxed bg-[#FAF9F5] p-3 rounded-lg border border-[#D9C9B2]/40">
                {stay.description}
              </p>
            </div>
          </div>

          {/* Équipements Card (Grid of icons) */}
          <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#D9C9B2]/40">
              <div>
                <h3 className="text-sm font-semibold text-[#2E3A2F]">Équipements ({stay.amenities.length})</h3>
                <p className="text-xs text-[#2E3A2F]/60">Équipements déclarés disponibles par l'hôte</p>
              </div>
              <button
                onClick={() => setActiveTab("amenities")}
                className="text-xs font-medium text-[#6B7F5B] hover:underline"
              >
                Voir tous ({stay.amenities.length})
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {stay.amenities.slice(0, 9).map((amenity, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 bg-[#FAF9F5] rounded-lg border border-[#D9C9B2]/40 text-xs text-[#2E3A2F]"
                >
                  <Check className="w-3.5 h-3.5 text-[#6B7F5B] shrink-0" />
                  <span className="truncate">{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Règles de la maison Card */}
          <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#D9C9B2]/40">
              <h3 className="text-sm font-semibold text-[#2E3A2F]">Règles de la maison</h3>
              <button className="text-xs font-medium text-[#6B7F5B] hover:underline flex items-center gap-1">
                <Edit className="w-3.5 h-3.5" /> Modifier
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-[#2E3A2F]">
              <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#D9C9B2]/40">
                <span className="text-[#2E3A2F]/60 block text-[11px]">Arrivée</span>
                <span className="font-semibold text-sm">À partir de 15:00</span>
              </div>
              <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#D9C9B2]/40">
                <span className="text-[#2E3A2F]/60 block text-[11px]">Départ</span>
                <span className="font-semibold text-sm">Avant 11:00</span>
              </div>
              <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#D9C9B2]/40">
                <span className="text-[#2E3A2F]/60 block text-[11px]">Animaux</span>
                <span className="font-medium text-[#C96F4F]">Non autorisés</span>
              </div>
              <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#D9C9B2]/40">
                <span className="text-[#2E3A2F]/60 block text-[11px]">Fumeurs</span>
                <span className="font-medium text-[#C96F4F]">Non autorisé</span>
              </div>
              <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#D9C9B2]/40">
                <span className="text-[#2E3A2F]/60 block text-[11px]">Fêtes & Événements</span>
                <span className="font-medium text-[#C96F4F]">Non autorisées</span>
              </div>
              <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#D9C9B2]/40">
                <span className="text-[#2E3A2F]/60 block text-[11px]">Enfants</span>
                <span className="font-medium text-[#6B7F5B]">Adapté aux enfants</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Rail (1 col) - Mockup 06 */}
        <div className="space-y-6">
          {/* Statut de validation Card */}
          <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D9C9B2]/40">
              <h3 className="text-sm font-semibold text-[#2E3A2F]">Statut de validation</h3>
              <StatusPill status={stay.status} />
            </div>
            <p className="text-xs text-[#2E3A2F]/70 leading-relaxed">
              {(stay.status === "approved" || stay.status === "published")
                ? "Cet hébergement est actuellement validé et visible publiquement par tous les voyageurs."
                : (stay.status === "pending_review" || stay.status === "pending")
                ? "Cet hébergement est en attente d'examen par l'équipe de modération."
                : "Cet hébergement nécessite votre attention ou a été suspendu."}
            </p>
            <div className="space-y-2 pt-1">
              {stay.status !== "approved" && stay.status !== "published" && (
                <button
                  onClick={() => setDecisionModal("approve")}
                  className="w-full py-2.5 px-3 bg-[#6B7F5B] hover:bg-[#5a6b4c] text-white text-xs font-semibold rounded-lg shadow-sm transition-colors text-center"
                >
                  Approuver et publier
                </button>
              )}
              <button
                onClick={() => setDecisionModal("changes")}
                className="w-full py-2 px-3 border border-[#D9C9B2] hover:bg-[#F8F6EE] text-[#2E3A2F] text-xs font-medium rounded-lg transition-colors text-center"
              >
                Demander des modifications
              </button>
              {stay.status !== "rejected" && (
                <button
                  onClick={() => setDecisionModal("reject")}
                  className="w-full py-2 px-3 border border-[#C96F4F]/40 hover:bg-[#C96F4F]/10 text-[#C96F4F] text-xs font-medium rounded-lg transition-colors text-center"
                >
                  Refuser
                </button>
              )}
              {(stay.status === "suspended" || stay.status === "rejected" || stay.status === "refused") && (
                <button
                  onClick={handleRestore}
                  className="w-full py-2.5 px-3 bg-[#D9C9B2]/40 hover:bg-[#D9C9B2]/70 border border-[#D9C9B2] text-[#2E3A2F] text-xs font-semibold rounded-lg transition-colors text-center flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#6B7F5B]" />
                  <span>Annuler la suspension / Réactiver</span>
                </button>
              )}
            </div>
          </div>

          {/* À Vérifier Quick Checklist */}
          <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-[#2E3A2F] pb-2 border-b border-[#D9C9B2]/40">
              Points à vérifier
            </h3>
            <div className="space-y-2 text-xs">
              {[
                { label: "Documents du propriétaire", status: "Conforme" },
                { label: "Conformité des photos", status: "Vérifiée" },
                { label: "Adresse exacte sur la carte", status: "Vérifiée" },
                { label: "Équipements déclarés", status: "Complet" },
                { label: "Tarifs et politique d'annulation", status: "Conforme" },
                { label: "Règles de la maison", status: "Conforme" },
              ].map((pt, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-[#FAF9F5] border border-[#D9C9B2]/30">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#6B7F5B]" />
                    <span className="text-[#2E3A2F] font-medium">{pt.label}</span>
                  </div>
                  <span className="text-[11px] text-[#6B7F5B] font-semibold">{pt.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Hôte / Propriétaire Card with Verification Badges */}
          <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#D9C9B2]/40">
              <h3 className="text-sm font-semibold text-[#2E3A2F]">Hôte / Propriétaire</h3>
              <TypePill type={stay.hostType} />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#E5DFD3] flex items-center justify-center font-bold text-base text-[#2E3A2F]">
                {stay.hostName.charAt(0)}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#2E3A2F]">{stay.hostName}</h4>
                <div className="flex items-center gap-1 text-xs text-amber-500 font-semibold">
                  <Star className="w-3.5 h-3.5 fill-amber-500" />
                  <span>{stay.rating.toFixed(1)}</span>
                  <span className="text-[#2E3A2F]/60">({stay.reviewsCount} avis)</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-[#D9C9B2]/40 text-xs">
              <div className="flex items-center justify-between text-[#2E3A2F]/80">
                <span>Identité</span>
                <span className="text-[#6B7F5B] font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Vérifiée
                </span>
              </div>
              <div className="flex items-center justify-between text-[#2E3A2F]/80">
                <span>Téléphone</span>
                <span className="text-[#6B7F5B] font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Vérifié
                </span>
              </div>
              <div className="flex items-center justify-between text-[#2E3A2F]/80">
                <span>Email</span>
                <span className="text-[#6B7F5B] font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Vérifié
                </span>
              </div>
            </div>
          </div>

          {/* Documents du propriétaire List */}
          <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-[#2E3A2F] pb-2 border-b border-[#D9C9B2]/40">
              Documents du propriétaire
            </h3>
            <div className="space-y-2 text-xs">
              {[
                { name: "Pièce d'identité", ext: "PDF", size: "1.8 Mo", status: "Validé" },
                { name: "Titre de propriété", ext: "PDF", size: "4.2 Mo", status: "Validé" },
                { name: "Justificatif de domicile", ext: "JPG", size: "2.1 Mo", status: "À vérifier" },
              ].map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-[#FAF9F5] border border-[#D9C9B2]/40">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#6B7F5B]" />
                    <div>
                      <div className="font-medium text-[#2E3A2F]">{doc.name}</div>
                      <div className="text-[11px] text-[#2E3A2F]/60">{doc.ext} • {doc.size}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-1 hover:bg-[#EAE5D9] rounded text-[#2E3A2F]/70">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1 hover:bg-[#EAE5D9] rounded text-[#2E3A2F]/70">
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Decision Dialog */}
      {decisionModal && (
        <ConfirmDialog
          isOpen={true}
          title={
            decisionModal === "approve"
              ? "Approuver et publier cet hébergement ?"
              : decisionModal === "reject"
              ? "Refuser cet hébergement ?"
              : "Demander des modifications à l'hôte ?"
          }
          description={
            decisionModal === "approve"
              ? "L'annonce sera immédiatement visible sur DARNA et ouverte aux réservations."
              : "Veuillez préciser la raison de cette décision qui sera transmise au propriétaire."
          }
          confirmLabel={
            decisionModal === "approve"
              ? "Approuver et publier"
              : decisionModal === "reject"
              ? "Confirmer le refus"
              : "Envoyer la demande"
          }
          variant={decisionModal === "reject" ? "danger" : "primary"}
          onConfirm={
            decisionModal === "approve"
              ? handleApprove
              : decisionModal === "reject"
              ? handleReject
              : handleRequestChanges
          }
          onCancel={() => setDecisionModal(null)}
        />
      )}
    </div>
  );
}
