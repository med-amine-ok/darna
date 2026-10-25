"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "@/navigation";
import {
  ArrowLeft,
  Save,
  Check,
  ChevronRight,
  ChevronLeft,
  Compass,
  MapPin,
  Clock,
  Sparkles,
  Users,
  Calendar,
  Layers,
  Plus,
  Trash2,
  Video,
  FileText,
  DollarSign,
  Tag,
  Navigation,
} from "lucide-react";
import { Stepper, StepItem } from "@/components/ui/Stepper";
import { LivePreviewCard } from "@/components/ui/LivePreviewCard";
import { ProgressChecklist } from "@/components/ui/ProgressChecklist";
import { TipsCard } from "@/components/ui/TipsCard";
import { ChipInput } from "@/components/ui/ChipInput";
import { RichTextField } from "@/components/ui/RichTextField";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { MapPicker } from "@/components/ui/MapPicker";
import { useToast } from "@/components/ui/Toast";
import { useLocale } from "next-intl";
import { WILAYAS, getWilayaLabel } from "@/lib/utils/wilayas";

export default function ExperienceWizardClient() {
  const locale = useLocale() as "en" | "fr" | "ar";
  const router = useRouter();
  const { addToast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [draftSavedAt, setDraftSavedAt] = useState<string>("10:20");

  // Form state (Mockups 03 & 10)
  const [formData, setFormData] = useState({
    title: "Randonnée dans les gorges de Chiffa & Cascade",
    category: "Aventure",
    subCategory: "Randonnée pédestre",
    duration: "4 heures",
    difficulty: "Modéré",
    groupSize: 12,
    languages: ["Français", "Arabe"],
    shortDescription: "Partez à la découverte de la faune préservée et des cascades majestueuses des gorges de Chiffa en compagnie d'un guide local certifié.",
    fullDescription: "Une excursion revigorante au cœur du parc national de Chréa. Nous longerons la rivière ombragée et observerons les célèbres macaques de Barbarie dans leur habitat naturel.",
    highlights: [
      "Baignade rafraîchissante dans les vasques naturelles",
      "Observation respectueuse des macaques de Barbarie",
      "Thé à la menthe traditionnel offert en fin de parcours",
    ],
    experienceType: "excursion",
    tags: ["Nature", "Cascade", "Faune", "Atlas"],
    country: "Algérie",
    wilayaCode: "09",
    city: "Blida",
    address: "Route des Gorges, Ruisseau des Singes, Chiffa",
    coordinates: { lat: 36.425, lng: 2.765 },
    visibilityMode: "exact",
    transportMode: "Véhicule personnel ou Navette",
    accessInstructions: "Point de ralliement sur le parking du restaurant des Singes à 08h30 précises.",
    pois: [
      { name: "Ruisseau des Singes", distance: "200 m", time: "3 min à pied" },
      { name: "Cascade de Chiffa", distance: "2.5 km", time: "45 min de marche" },
    ],
    pricePerPerson: 3500,
    priceChild: 2000,
    approvalMode: "instant" as "instant" | "request",
    included: ["Guide diplômé", "Assurance excursion", "Collation & thé"],
    notIncluded: ["Déjeuner complet", "Transport depuis Alger"],
    whatToBring: ["Chaussures de marche fermées", "Gourde 1.5L", "Chapeau / Casquette"],
    images: ["/placeholder-experience.jpg"],
  });

  const steps: StepItem[] = [
    { id: 1, title: "Informations générales" },
    { id: 2, title: "Localisation" },
    { id: 3, title: "Détails et programme" },
    { id: 4, title: "Tarifs et disponibilités" },
    { id: 5, title: "Photos et médias" },
    { id: 6, title: "Règles et validation" },
  ];

  const handleSaveDraft = () => {
    const time = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    setDraftSavedAt(time);
    addToast({
      title: "Brouillon sauvegardé",
      description: `Enregistré à ${time}.`,
      variant: "info",
    });
  };

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep((prev) => prev + 1);
    } else {
      addToast({
        title: "Expérience créée avec succès",
        description: "L'activité a été soumise à la modération DARNA.",
        variant: "success",
      });
      router.push("/experiences");
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else {
      router.push("/experiences");
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header (Mockup 10) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D9C9B2]/50 pb-5">
        <div>
          <button
            onClick={() => router.push("/experiences")}
            className="inline-flex items-center gap-1.5 text-xs text-[#2E3A2F]/70 hover:text-[#2E3A2F] mb-2 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Retour à la liste</span>
          </button>
          <h1 className="text-xl font-bold text-[#2E3A2F]">Ajouter une expérience</h1>
          <p className="text-xs text-[#2E3A2F]/60 mt-0.5">
            Décrivez votre activité, vos parcours et les tarifs pour accueillir les voyageurs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-[11px] text-[#2E3A2F]/60 hidden sm:inline">
            Brouillon enregistré à {draftSavedAt}
          </span>
          <button
            onClick={handleSaveDraft}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#2E3A2F] bg-white border border-[#D9C9B2] rounded-lg hover:bg-[#F8F6EE]"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Enregistrer en brouillon</span>
          </button>
          <button
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#2E3A2F] rounded-lg hover:bg-[#242e25]"
          >
            <span>{currentStep === 6 ? "Publier l'expérience" : "Suivant →"}</span>
          </button>
        </div>
      </div>

      {/* 2. Stepper */}
      <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm">
        <Stepper steps={steps} currentStep={currentStep} onStepClick={setCurrentStep} />
      </div>

      {/* 3. Three-Column Body: Form (2 cols) + Right Rail (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Body */}
        <div className="lg:col-span-2 space-y-6">
          {/* STEP 1: Informations Générales (Mockup 10) */}
          {currentStep === 1 && (
            <div className="space-y-6">
              {/* Card 1: Informations Générales */}
              <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-[#2E3A2F] pb-2 border-b border-[#D9C9B2]/40">
                  Informations générales
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                    Titre de l'expérience *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                      Catégorie principale *
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
                    >
                      <option value="Aventure">Aventure & Randonnée</option>
                      <option value="Culture">Culture & Histoire</option>
                      <option value="Nature">Nature & Faune</option>
                      <option value="Gastronomie">Gastronomie & Terroir</option>
                      <option value="Mer">Mer & Activités nautiques</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                      Sous-catégorie
                    </label>
                    <input
                      type="text"
                      value={formData.subCategory}
                      onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                      className="w-full px-3.5 py-2 text-xs bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                      Durée *
                    </label>
                    <input
                      type="text"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
                      placeholder="Ex: 3 heures"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                      Niveau de difficulté *
                    </label>
                    <select
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
                    >
                      <option value="Facile">Facile (tous publics)</option>
                      <option value="Modéré">Modéré (bonne condition)</option>
                      <option value="Difficile">Difficile (sportifs)</option>
                      <option value="Expert">Expert (alpinisme/technique)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                      Taille max du groupe *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={formData.groupSize}
                      onChange={(e) => setFormData({ ...formData, groupSize: Number(e.target.value) })}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                    Langues proposées *
                  </label>
                  <ChipInput
                    tags={formData.languages}
                    onChange={(tags) => setFormData({ ...formData, languages: tags })}
                    placeholder="Ajouter une langue..."
                  />
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

                {/* Points forts */}
                <div>
                  <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                    Points forts de l'expérience
                  </label>
                  <div className="space-y-2">
                    {formData.highlights.map((h, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 bg-[#FAF9F5] rounded-lg border border-[#D9C9B2]/50 text-xs text-[#2E3A2F]">
                        <span className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-[#6B7F5B]" />
                          <span>{h}</span>
                        </span>
                        <button
                          onClick={() => setFormData({
                            ...formData,
                            highlights: formData.highlights.filter((_, idx) => idx !== i),
                          })}
                          className="text-[#C96F4F] hover:text-[#b05f42]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card 2: Catégorie et informations complémentaires (Mockup 10) */}
              <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-[#2E3A2F] pb-2 border-b border-[#D9C9B2]/40">
                  Type d'expérience & Mots-clés
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  {[
                    { id: "excursion", label: "Excursion / Visite guidée" },
                    { id: "sport", label: "Activité sportive" },
                    { id: "workshop", label: "Atelier / Cours" },
                    { id: "tasting", label: "Dégustation / Gastronomie" },
                    { id: "other", label: "Autre expérience" },
                  ].map((t) => (
                    <label
                      key={t.id}
                      className={`p-3 rounded-lg border cursor-pointer ${
                        formData.experienceType === t.id
                          ? "bg-secondary/10 border-secondary font-semibold text-[#2E3A2F]"
                          : "bg-[#FAF9F5] border-[#D9C9B2]/50 text-[#2E3A2F]/70"
                      }`}
                    >
                      <input
                        type="radio"
                        name="expType"
                        checked={formData.experienceType === t.id}
                        onChange={() => setFormData({ ...formData, experienceType: t.id })}
                        className="accent-[#6B7F5B] me-2"
                      />
                      <span>{t.label}</span>
                    </label>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                    Mots-clés (tags)
                  </label>
                  <ChipInput
                    tags={formData.tags}
                    onChange={(tags) => setFormData({ ...formData, tags })}
                    placeholder="Ajouter un tag..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Localisation (Mockup 03) */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Adresse et Localisation Card */}
              <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm space-y-4">
                <h3 className="text-sm font-semibold text-[#2E3A2F] pb-2 border-b border-[#D9C9B2]/40">
                  Adresse et localisation
                </h3>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">Pays *</label>
                    <input
                      type="text"
                      disabled
                      value={formData.country}
                      className="w-full px-3 py-2 text-xs bg-[#FAF9F5] border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">Wilaya *</label>
                    <select
                      value={formData.wilayaCode}
                      onChange={(e) => setFormData({ ...formData, wilayaCode: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
                    >
                      {WILAYAS.map((w) => (
                        <option key={w.code} value={w.code}>
                          {w.code} - {getWilayaLabel(w, locale)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">Ville *</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                    Adresse exacte ou point de rencontre *
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
                  />
                  <p className="text-[11px] text-[#2E3A2F]/60 mt-1">
                    Sélectionnez l'emplacement exact sur la carte interactive ci-dessous.
                  </p>
                </div>

                <MapPicker
                  lat={formData.coordinates.lat}
                  lng={formData.coordinates.lng}
                  onChange={(lat, lng) => setFormData({ ...formData, coordinates: { lat, lng } })}
                />
              </div>

              {/* Points d'intérêt à proximité (Mockup 03) */}
              <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#D9C9B2]/40">
                  <h3 className="text-sm font-semibold text-[#2E3A2F]">
                    Points d'intérêt à proximité (max. 5)
                  </h3>
                  <button
                    onClick={() => {
                      if (formData.pois.length < 5) {
                        setFormData({
                          ...formData,
                          pois: [...formData.pois, { name: "Nouveau point", distance: "1 km", time: "15 min" }],
                        });
                      }
                    }}
                    className="text-xs font-medium text-[#6B7F5B] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter un point
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.pois.map((poi, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 bg-[#FAF9F5] rounded-lg border border-[#D9C9B2]/50 text-xs">
                      <div>
                        <span className="font-semibold text-[#2E3A2F]">{poi.name}</span>
                        <span className="text-[#2E3A2F]/60 ms-2">• {poi.distance} ({poi.time})</span>
                      </div>
                      <button
                        onClick={() => setFormData({
                          ...formData,
                          pois: formData.pois.filter((_, i) => i !== idx),
                        })}
                        className="text-[#C96F4F] hover:text-[#b05f42]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Accès et transport (Mockup 03) */}
              <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-semibold text-[#2E3A2F] pb-2 border-b border-[#D9C9B2]/40">
                  Accès et transport
                </h3>
                <div>
                  <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                    Moyen d'accès principal *
                  </label>
                  <input
                    type="text"
                    value={formData.transportMode}
                    onChange={(e) => setFormData({ ...formData, transportMode: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#2E3A2F] mb-1.5">
                    Instructions d'accès pour les participants
                  </label>
                  <textarea
                    rows={2}
                    value={formData.accessInstructions}
                    onChange={(e) => setFormData({ ...formData, accessInstructions: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#D9C9B2] rounded-lg text-[#2E3A2F]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEPS 3-6: Programme, Tarifs, Médias, Validation */}
          {currentStep === 3 && (
            <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-[#2E3A2F] pb-2 border-b border-[#D9C9B2]/40">
                Programme détaillé & Inclusions
              </h3>
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#D9C9B2]/40">
                  <div className="font-semibold text-[#2E3A2F]">Étape 1: Accueil et briefing sécurité</div>
                  <p className="text-[11px] text-[#2E3A2F]/70 mt-0.5">Rassemblement, vérification du matériel et consignes de parcours.</p>
                </div>
                <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#D9C9B2]/40">
                  <div className="font-semibold text-[#2E3A2F]">Étape 2: Marche le long du ruisseau</div>
                  <p className="text-[11px] text-[#2E3A2F]/70 mt-0.5">Observation guidée de la flore et des singes magots.</p>
                </div>
                <div className="p-3 bg-[#FAF9F5] rounded-lg border border-[#D9C9B2]/40">
                  <div className="font-semibold text-[#2E3A2F]">Étape 3: Arrivée à la cascade & Pause thé</div>
                  <p className="text-[11px] text-[#2E3A2F]/70 mt-0.5">Moment de détente, baignade optionnelle et dégustation.</p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-[#2E3A2F] pb-2 border-b border-[#D9C9B2]/40">
                Tarifs par personne & Réservation
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#2E3A2F] mb-1">Tarif adulte (DZD) *</label>
                  <input
                    type="number"
                    value={formData.pricePerPerson}
                    onChange={(e) => setFormData({ ...formData, pricePerPerson: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-[#D9C9B2] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#2E3A2F] mb-1">Tarif enfant (DZD)</label>
                  <input
                    type="number"
                    value={formData.priceChild}
                    onChange={(e) => setFormData({ ...formData, priceChild: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-white border border-[#D9C9B2] rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-[#2E3A2F] pb-2 border-b border-[#D9C9B2]/40">
                Photos et vidéo de présentation
              </h3>
              <FileDropzone
                label="Déposez les photos de l'expérience ici"
                hint="Formats acceptés: JPG, PNG, MP4 jusqu'à 20 Mo"
              />
            </div>
          )}

          {currentStep === 6 && (
            <div className="bg-white rounded-xl border border-[#D9C9B2]/60 p-5 shadow-sm space-y-4">
              <h3 className="text-sm font-semibold text-[#2E3A2F] pb-2 border-b border-[#D9C9B2]/40">
                Vérification avant soumission
              </h3>
              <div className="p-4 bg-[#FAF9F5] rounded-lg border border-[#D9C9B2]/50 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#2E3A2F]/60">Activité:</span>
                  <span className="font-semibold text-[#2E3A2F]">{formData.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#2E3A2F]/60">Catégorie:</span>
                  <span className="font-semibold text-[#2E3A2F]">{formData.category} ({formData.difficulty})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#2E3A2F]/60">Lieu:</span>
                  <span className="font-semibold text-[#2E3A2F]">{formData.city}, Wilaya {formData.wilayaCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#2E3A2F]/60">Prix par personne:</span>
                  <span className="font-bold text-[#6B7F5B]">{formData.pricePerPerson.toLocaleString("fr-FR")} DZD</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
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
              <span>{currentStep === 6 ? "Publier l'expérience" : "Suivant →"}</span>
              {currentStep < 6 && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Right Rail: Live Preview + Checklist + Tips (Mockups 03 & 10) */}
        <div className="space-y-6">
          <LivePreviewCard
            title={formData.title}
            propertyType={formData.category}
            location={`${formData.city}, Wilaya ${formData.wilayaCode}`}
            priceDzd={formData.pricePerPerson}
            imageSrc={formData.images[0]}
          />

          <ProgressChecklist
            currentStep={currentStep}
            totalSteps={6}
            items={[
              { stepNumber: 1, label: "Informations générales", completed: currentStep > 1 },
              { stepNumber: 2, label: "Localisation", completed: currentStep > 2 },
              { stepNumber: 3, label: "Détails & Programme", completed: currentStep > 3 },
              { stepNumber: 4, label: "Tarifs & Disponibilités", completed: currentStep > 4 },
              { stepNumber: 5, label: "Photos & Médias", completed: currentStep > 5 },
              { stepNumber: 6, label: "Règles & Validation", completed: currentStep > 6 },
            ]}
          />

          <TipsCard
            title="Conseils pour votre expérience"
            tips={[
              "Mettez en avant ce qui rend votre expérience unique en Algérie.",
              "Détaillez le matériel fourni et ce que les voyageurs doivent apporter.",
              "Les photos en action avec des participants obtiennent 2x plus de clics.",
            ]}
          />
        </div>
      </div>
    </div>
  );
}
