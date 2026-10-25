"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "@/navigation";
import {
  ArrowLeft,
  Save,
  Check,
  ChevronRight,
  ChevronLeft,
  Home,
  MapPin,
  Clock,
  Sparkles,
  Phone,
  Mail,
  Camera,
  DollarSign,
  ShieldCheck,
  Plus,
  Trash2,
} from "lucide-react";
import { Stepper, StepItem } from "@/components/ui/Stepper";
import { LivePreviewCard } from "@/components/ui/LivePreviewCard";
import { ProgressChecklist } from "@/components/ui/ProgressChecklist";
import { TipsCard } from "@/components/ui/TipsCard";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { ChipInput } from "@/components/ui/ChipInput";
import { RichTextField } from "@/components/ui/RichTextField";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { MapPicker } from "@/components/ui/MapPicker";
import { useToast } from "@/components/ui/Toast";
import { useLocale } from "next-intl";
import { WILAYAS, getWilayaLabel } from "@/lib/utils/wilayas";

const PROPERTY_TYPES = [
  "Villa avec piscine",
  "Appartement haut standing",
  "Maison traditionnelle / Casbah",
  "Bungalow bord de mer",
  "Chalet de montagne",
  "Studio moderne",
  "Hôtel / Suite",
  "Auberge de jeunesse (Hostel)",
];

const AMENITIES_CATALOG = [
  "Wifi haute vitesse",
  "Piscine privée",
  "Climatisation réversible",
  "Cuisine équipée",
  "Parking sécurisé",
  "Télévision 4K",
  "Lave-linge",
  "Vue sur mer",
  "Chauffage central",
  "Espace de travail",
  "Jacuzzi / Spa",
  "Barbecue extérieur",
];

export default function StayWizardClient() {
  const locale = useLocale() as "en" | "fr" | "ar";
  const router = useRouter();
  const { addToast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [draftSavedAt, setDraftSavedAt] = useState<string>("10:15");

  // Form state
  const [formData, setFormData] = useState({
    title: "Villa panoramique avec piscine – Hydra",
    propertyType: "Villa avec piscine",
    category: "home",
    guestCapacity: 8,
    bedroomCount: 4,
    bathroomCount: 3,
    surfaceM2: 280,
    constructionYear: 2022,
    hostName: "Ahmed Benali",
    hostType: "individual",
    price: 35000,
    cleaningFee: 5000,
    deposit: 20000,
    minStayDays: 2,
    bookingApprovalMode: "instant" as "instant" | "request",
    shortDescription: "Superbe villa contemporaine sur les hauteurs d'Hydra avec piscine à débordement et vue dégagée sur la baie.",
    fullDescription: "Cette élégante demeure allie le confort moderne aux touches architecturales algéroises. Idéale pour les séjours en famille ou professionnels.",
    address: "12 Chemin des Crêtes, Hydra",
    wilayaCode: "16",
    city: "Alger",
    phone: "555123456",
    email: "contact@ahmed-benali.dz",
    showContactOnListing: true,
    petsAllowed: false,
    partiesAllowed: false,
    smokingAllowed: false,
    childrenAllowed: true,
    checkInTime: "15:00",
    checkOutTime: "11:00",
    amenities: ["Wifi haute vitesse", "Piscine privée", "Climatisation réversible", "Cuisine équipée", "Parking sécurisé"],
    images: ["/placeholder-stay.jpg"],
    coordinates: { lat: 36.7525, lng: 3.042 },
  });

  // 6 numbered steps (Mockup 08)
  const steps: StepItem[] = [
    { id: 1, title: "Informations générales" },
    { id: 2, title: "Localisation" },
    { id: 3, title: "Équipements" },
    { id: 4, title: "Photos et description" },
    { id: 5, title: "Tarifs et disponibilité" },
    { id: 6, title: "Règles et validation" },
  ];

  const handleSaveDraft = () => {
    const time = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    setDraftSavedAt(time);
    addToast({
      title: "Brouillon sauvegardé",
      description: `Enregistré à ${time}. Vous pouvez reprendre à tout moment.`,
      variant: "info",
    });
  };

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep((prev) => prev + 1);
    } else {
      addToast({
        title: "Hébergement créé avec succès",
        description: "L'annonce a été enregistrée et envoyée pour publication.",
        variant: "success",
      });
      router.push("/stays");
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else {
      router.push("/stays");
    }
  };

  const tipsPerStep: Record<number, { title: string; tips: string[] }> = {
    1: {
      title: "Conseils pour une bonne annonce",
      tips: [
        "Choisissez un titre accrocheur qui mentionne le type de logement et son atout clé.",
        "Renseignez la surface réelle et le nombre exact de chambres et lits disponibles.",
        "Assurez-vous de sélectionner le propriétaire vérifié dans le répertoire DARNA.",
      ],
    },
    2: {
      title: "Conseils de localisation",
      tips: [
        "Positionnez le repère précisément sur la carte pour aider les voyageurs à situer le quartier.",
        "Indiquez les points de repère ou attractions majeures à moins de 15 minutes.",
        "L'adresse exacte peut être protégée jusqu'à la confirmation de réservation.",
      ],
    },
    3: {
      title: "Sélection des équipements",
      tips: [
        "Les hébergements avec Wifi et Climatisation reçoivent 40% de réservations en plus.",
        "Indiquez si le stationnement est gratuit ou payant sur place.",
      ],
    },
    4: {
      title: "Photos percutantes",
      tips: [
        "Téléchargez au moins 5 photos haute résolution avec éclairage naturel.",
        "Prenez en photo toutes les pièces principales, la vue et l'extérieur.",
      ],
    },
    5: {
      title: "Tarification optimale",
      tips: [
        "Fixez un tarif de base adapté aux prix du marché de la wilaya.",
        "La réservation instantanée maximise le taux de conversion.",
      ],
    },
    6: {
      title: "Validation finale",
      tips: [
        "Vérifiez l'ensemble des règles de la maison.",
        "Une fois soumis, l'hébergement sera immédiatement indexé sur DARNA.",
      ],
    },
  };

  return (
    <div className="space-y-6">
      {/* 1. Wizard Header (Mockup 08) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9C9B2]/50 pb-5">
        <div>
          <button
            onClick={() => router.push("/stays")}
            className="inline-flex items-center gap-1.5 text-xs text-[#2E3A2F]/70 hover:text-[#2E3A2F] mb-2 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour</span>
          </button>
          <h1 className="text-xl font-bold text-[#2E3A2F]">Ajouter un hébergement</h1>
          <p className="text-xs text-[#2E3A2F]/60 mt-0.5">
            Remplissez les informations étape par étape pour créer et publier une nouvelle annonce d'hébergement.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-[11px] text-[#2E3A2F]/60 hidden sm:inline">
            Brouillon enregistré à {draftSavedAt}
          </span>
          <button
            onClick={handleSaveDraft}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#2E3A2F] bg-white border border-[#D9C9B2] rounded-lg hover:bg-[#F8F6EE] transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Enregistrer en brouillon</span>
          </button>
          <button
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#2E3A2F] rounded-lg hover:bg-[#242e25] transition-colors"
          >
            <span>{currentStep === 6 ? "Publier l'hébergement" : "Suivant →"}</span>
          </button>
        </div>
      </div>

      {/* 2. Stepper (Mockup 08: 6 steps) */}
      <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm">
        <Stepper steps={steps} currentStep={currentStep} onStepClick={setCurrentStep} />
      </div>

      {/* 3. Three-Column Body: Form Cards (Left/Center) + Right Rail (Mockup 08) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Body (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* STEP 1: Informations Générales */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Card 1: Informations Générales */}
              <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-[#2E3A2F] pb-2 border-b border-[#D9C9B2]/40">
                  Informations générales
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                    Titre de l'hébergement *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
                    placeholder="Ex: Villa panoramique avec piscine – Hydra"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                      Type de logement *
                    </label>
                    <select
                      value={formData.propertyType}
                      onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
                    >
                      {PROPERTY_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                      Catégorie *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
                    >
                      <option value="home">Logement entier (Maison / Villa / Appartement)</option>
                      <option value="hotel">Hôtel / Établissement</option>
                      <option value="hostel">Auberge de jeunesse</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                      Capacité *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.guestCapacity}
                      onChange={(e) => setFormData({ ...formData, guestCapacity: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                      Chambres *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.bedroomCount}
                      onChange={(e) => setFormData({ ...formData, bedroomCount: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                      Salles de bain *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.bathroomCount}
                      onChange={(e) => setFormData({ ...formData, bathroomCount: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                      Surface (m²) *
                    </label>
                    <input
                      type="number"
                      min="10"
                      value={formData.surfaceM2}
                      onChange={(e) => setFormData({ ...formData, surfaceM2: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                    Hôte / Propriétaire *
                  </label>
                  <select
                    value={formData.hostName}
                    onChange={(e) => setFormData({ ...formData, hostName: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
                  >
                    <option value="Ahmed Benali">Ahmed Benali (Particulier - Alger)</option>
                    <option value="Immobilier Casbah SAS">Immobilier Casbah SAS (Agence)</option>
                    <option value="Hôtel El Aurassi">Hôtel El Aurassi (Établissement)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                    Description courte * ({formData.shortDescription.length}/300)
                  </label>
                  <textarea
                    rows={2}
                    maxLength={300}
                    value={formData.shortDescription}
                    onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                    Description détaillée *
                  </label>
                  <RichTextField
                    value={formData.fullDescription}
                    onChange={(val) => setFormData({ ...formData, fullDescription: val })}
                    maxLength={2000}
                  />
                </div>
              </div>

              {/* Card 2: Règles principales (Toggles + times) */}
              <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-[#2E3A2F] pb-2 border-b border-[#D9C9B2]/40">
                  Règles principales
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.petsAllowed}
                      onChange={(e) => setFormData({ ...formData, petsAllowed: e.target.checked })}
                      className="accent-[#2E3A2F] rounded"
                    />
                    <span>Animaux autorisés</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.partiesAllowed}
                      onChange={(e) => setFormData({ ...formData, partiesAllowed: e.target.checked })}
                      className="accent-[#2E3A2F] rounded"
                    />
                    <span>Fêtes & événements</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.smokingAllowed}
                      onChange={(e) => setFormData({ ...formData, smokingAllowed: e.target.checked })}
                      className="accent-[#2E3A2F] rounded"
                    />
                    <span>Fumer autorisé</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.childrenAllowed}
                      onChange={(e) => setFormData({ ...formData, childrenAllowed: e.target.checked })}
                      className="accent-[#2E3A2F] rounded"
                    />
                    <span>Adapté aux enfants</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[#D9C9B2]/40 text-xs">
                  <div>
                    <label className="block font-semibold text-[#2E3A2F] mb-1">Heure d'arrivée</label>
                    <input
                      type="text"
                      value={formData.checkInTime}
                      onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-[#D9C9B2] rounded-lg"
                      placeholder="15:00"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#2E3A2F] mb-1">Heure de départ</label>
                    <input
                      type="text"
                      value={formData.checkOutTime}
                      onChange={(e) => setFormData({ ...formData, checkOutTime: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-[#D9C9B2] rounded-lg"
                      placeholder="11:00"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Localisation & Contact */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-[#2E3A2F] pb-2 border-b border-[#D9C9B2]/40">
                  Adresse et géolocalisation
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                      Wilaya *
                    </label>
                    <select
                      value={formData.wilayaCode}
                      onChange={(e) => setFormData({ ...formData, wilayaCode: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
                    >
                      {WILAYAS.map((w) => (
                        <option key={w.code} value={w.code}>
                          {w.code} - {getWilayaLabel(w, locale)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                      Commune / Ville *
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                    Adresse exacte *
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2E3A2F] mb-2">
                    Position sur la carte (déplacez le repère pour affiner)
                  </label>
                  <MapPicker
                    lat={formData.coordinates.lat}
                    lng={formData.coordinates.lng}
                    onChange={(lat, lng) => setFormData({ ...formData, coordinates: { lat, lng } })}
                  />
                </div>
              </div>

              {/* Contact Card */}
              <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-[#2E3A2F] pb-2 border-b border-[#D9C9B2]/40">
                  Coordonnées du contact
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                      Numéro de téléphone *
                    </label>
                    <PhoneInput
                      value={formData.phone}
                      onChange={(val) => setFormData({ ...formData, phone: val })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                      Adresse email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-xs text-[#2E3A2F] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showContactOnListing}
                    onChange={(e) => setFormData({ ...formData, showContactOnListing: e.target.checked })}
                    className="accent-[#2E3A2F] rounded"
                  />
                  <span>Afficher le contact public sur l'annonce après validation</span>
                </label>
              </div>
            </div>
          )}

          {/* STEP 3: Équipements */}
          {currentStep === 3 && (
            <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-[#2E3A2F] pb-2 border-b border-[#D9C9B2]/40">
                Sélection des équipements
              </h3>
              <p className="text-xs text-[#2E3A2F]/60">
                Cochez tous les équipements et commodités inclus dans cet hébergement.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {AMENITIES_CATALOG.map((am) => {
                  const isChecked = formData.amenities.includes(am);
                  return (
                    <label
                      key={am}
                      className={`flex items-center gap-2.5 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-secondary/10 border-secondary text-[#2E3A2F] font-semibold"
                          : "bg-[#FAF9F5] border-[#D9C9B2]/50 text-[#2E3A2F]/80 hover:bg-[#F8F6EE]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setFormData({
                              ...formData,
                              amenities: formData.amenities.filter((a) => a !== am),
                            });
                          } else {
                            setFormData({
                              ...formData,
                              amenities: [...formData.amenities, am],
                            });
                          }
                        }}
                        className="accent-[#6B7F5B] rounded"
                      />
                      <span>{am}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4: Photos */}
          {currentStep === 4 && (
            <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-[#2E3A2F] pb-2 border-b border-[#D9C9B2]/40">
                Photos et galerie (min. 5 photos recommandées)
              </h3>
              <FileDropzone
                label="Déposez les photos de l'hébergement ici"
                hint="Formats acceptés: JPG, PNG, WEBP jusqu'à 10 Mo par photo"
                onFileSelect={(file) => {
                  addToast({ title: "Photo ajoutée", variant: "info" });
                }}
              />
              <div className="grid grid-cols-3 gap-3 pt-3">
                <div className="relative aspect-video rounded-lg overflow-hidden border border-[#D9C9B2]">
                  <Image src="/placeholder-stay.jpg" alt="" fill className="object-cover" />
                  <span className="absolute bottom-1 start-1 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded">
                    Couverture
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Tarifs et Disponibilité */}
          {currentStep === 5 && (
            <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-[#2E3A2F] pb-2 border-b border-[#D9C9B2]/40">
                Tarifs et conditions de réservation
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                    Prix par nuit (DZD) *
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                    Frais de ménage (DZD)
                  </label>
                  <input
                    type="number"
                    value={formData.cleaningFee}
                    onChange={(e) => setFormData({ ...formData, cleaningFee: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                    Caution exigée (DZD)
                  </label>
                  <input
                    type="number"
                    value={formData.deposit}
                    onChange={(e) => setFormData({ ...formData, deposit: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                    Séjour minimum (nuits)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.minStayDays}
                    onChange={(e) => setFormData({ ...formData, minStayDays: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                  Mode de réservation
                </label>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <label
                    className={`p-3 rounded-lg border cursor-pointer ${
                      formData.bookingApprovalMode === "instant"
                        ? "bg-secondary/10 border-secondary"
                        : "bg-[#FAF9F5] border-[#D9C9B2]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="approval"
                      checked={formData.bookingApprovalMode === "instant"}
                      onChange={() => setFormData({ ...formData, bookingApprovalMode: "instant" })}
                      className="accent-[#6B7F5B] me-2"
                    />
                    <span className="font-semibold">Instantanée</span>
                    <p className="text-[11px] text-[#2E3A2F]/60 mt-1">Le voyageur réserve sans attente.</p>
                  </label>
                  <label
                    className={`p-3 rounded-lg border cursor-pointer ${
                      formData.bookingApprovalMode === "request"
                        ? "bg-[#D9C9B2]/30 border-[#8C682E]"
                        : "bg-[#FAF9F5] border-[#D9C9B2]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="approval"
                      checked={formData.bookingApprovalMode === "request"}
                      onChange={() => setFormData({ ...formData, bookingApprovalMode: "request" })}
                      className="accent-[#8C682E] me-2"
                    />
                    <span className="font-semibold">Sur demande</span>
                    <p className="text-[11px] text-[#2E3A2F]/60 mt-1">L'hôte doit valider chaque demande.</p>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Règles & Validation */}
          {currentStep === 6 && (
            <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-[#2E3A2F] pb-2 border-b border-[#D9C9B2]/40">
                Récapitulatif avant publication
              </h3>
              <p className="text-xs text-[#2E3A2F]/70">
                Vérifiez que toutes les données ci-dessous sont complètes et conformes aux règles de modération DARNA.
              </p>
              <div className="p-4 bg-[#FAF9F5] rounded-lg border border-[#D9C9B2]/50 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#2E3A2F]/60">Titre:</span>
                  <span className="font-medium text-[#2E3A2F]">{formData.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#2E3A2F]/60">Localisation:</span>
                  <span className="font-medium text-[#2E3A2F]">{formData.city}, Wilaya {formData.wilayaCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#2E3A2F]/60">Capacité:</span>
                  <span className="font-medium text-[#2E3A2F]">{formData.guestCapacity} voyageurs • {formData.bedroomCount} chambres</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#2E3A2F]/60">Tarif par nuit:</span>
                  <span className="font-semibold text-[#2E3A2F]">{formData.price.toLocaleString("fr-FR")} DZD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#2E3A2F]/60">Équipements déclarés:</span>
                  <span className="font-medium text-[#2E3A2F]">{formData.amenities.length} sélectionnés</span>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-[#D9C9B2]/40">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#2E3A2F] bg-white border border-[#D9C9B2] rounded-lg hover:bg-[#F8F6EE]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>{currentStep === 1 ? "Annuler" : "Précédent"}</span>
            </button>
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-medium text-white bg-[#2E3A2F] rounded-lg hover:bg-[#242e25]"
            >
              <span>{currentStep === 6 ? "Publier l'hébergement" : "Suivant →"}</span>
              {currentStep < 6 && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Right Rail: Live Preview + Checklist + Tips (Mockup 08) */}
        <div className="space-y-6">
          {/* Live Preview Card */}
          <LivePreviewCard
            title={formData.title}
            propertyType={formData.propertyType}
            location={`${formData.city}, Wilaya ${formData.wilayaCode}`}
            priceDzd={formData.price}
            guestCapacity={formData.guestCapacity}
            bedroomCount={formData.bedroomCount}
            surfaceM2={formData.surfaceM2}
            imageSrc={formData.images[0]}
          />

          {/* Creation Progress Checklist */}
          <ProgressChecklist
            currentStep={currentStep}
            totalSteps={6}
            items={[
              { stepNumber: 1, label: "Informations générales", completed: currentStep > 1 },
              { stepNumber: 2, label: "Localisation & Contact", completed: currentStep > 2 },
              { stepNumber: 3, label: "Équipements", completed: currentStep > 3 },
              { stepNumber: 4, label: "Photos & médias", completed: currentStep > 4 },
              { stepNumber: 5, label: "Tarifs & disponibilité", completed: currentStep > 5 },
              { stepNumber: 6, label: "Règles & validation", completed: currentStep > 6 },
            ]}
          />

          {/* Step-Specific Tips */}
          <TipsCard
            title={tipsPerStep[currentStep]?.title || "Conseils"}
            tips={tipsPerStep[currentStep]?.tips || []}
          />
        </div>
      </div>
    </div>
  );
}
