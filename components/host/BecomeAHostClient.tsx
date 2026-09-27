"use client";

import React, { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import { SafeUser } from "@/types";
import { categories } from "@/components/navbar/Categories";
import CountrySelect, { CountrySelectValue } from "@/components/inputs/CountrySelect";
import Counter from "@/components/inputs/Counter";
import Logo from "@/components/navbar/Logo";
import axios from "axios";
import { toast } from "react-toastify";
import {
  MdOutlineWifi,
  MdOutlineKitchen,
  MdOutlineLocalLaundryService,
  MdOutlineDirectionsCar,
  MdOutlineAcUnit,
  MdOutlineWorkOutline,
  MdOutlinePool,
  MdOutlineHotTub,
  MdOutlineTv,
  MdOutlineDeck,
  MdCheck,
  MdClose,
  MdStar,
  MdOutlineAddPhotoAlternate,
} from "react-icons/md";
import { FaCheckCircle } from "react-icons/fa";

const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
});

type Props = {
  currentUser?: SafeUser | null;
};

// Preset photo collections for quick sample selection
const PHOTO_PRESETS = [
  {
    id: "villa",
    key: "presetVilla",
    cover:
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80",
    extras: [
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    id: "loft",
    key: "presetApartment",
    cover:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
    extras: [
      "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    id: "cabin",
    key: "presetCabin",
    cover:
      "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80",
    extras: [
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    id: "beach",
    key: "presetBeach",
    cover:
      "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1200&q=80",
    extras: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80",
    ],
  },
];

const AMENITY_ITEMS = [
  { id: "Wifi", key: "wifi", icon: MdOutlineWifi },
  { id: "TV", key: "tv", icon: MdOutlineTv },
  { id: "Kitchen", key: "kitchen", icon: MdOutlineKitchen },
  { id: "Washer", key: "washer", icon: MdOutlineLocalLaundryService },
  { id: "Free parking", key: "freeParking", icon: MdOutlineDirectionsCar },
  { id: "Air conditioning", key: "airConditioning", icon: MdOutlineAcUnit },
  { id: "Dedicated workspace", key: "dedicatedWorkspace", icon: MdOutlineWorkOutline },
  { id: "Pool", key: "pool", icon: MdOutlinePool },
  { id: "Hot tub", key: "hotTub", icon: MdOutlineHotTub },
  { id: "Patio", key: "patio", icon: MdOutlineDeck },
];

const POPULAR_CITIES = [
  "Paris",
  "New York",
  "London",
  "Tokyo",
  "Marrakech",
  "Dubai",
  "Rome",
  "Bali",
];

export default function BecomeAHostClient({ currentUser: _currentUser }: Props) {
  const router = useRouter();
  const t = useTranslations("hostFlow");
  const tCommon = useTranslations("common");
  const tCat = useTranslations("categories");
  const tAmenities = useTranslations("amenities");

  // Step state (1 to 8)
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showExitModal, setShowExitModal] = useState<boolean>(false);
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);

  // Form states
  const [category, setCategory] = useState<string>("Modern");
  const [location, setLocation] = useState<CountrySelectValue | null>({
    value: "FR",
    label: "France",
    latlng: [46.2276, 2.2137],
    region: "Europe",
    flag: "FR",
  });
  const [city, setCity] = useState<string>("Paris");
  const [guestCount, setGuestCount] = useState<number>(4);
  const [roomCount, setRoomCount] = useState<number>(2);
  const [bedCount, setBedCount] = useState<number>(2);
  const [bathroomCount, setBathroomCount] = useState<number>(1);
  const [amenities, setAmenities] = useState<string[]>([
    "Wifi",
    "Kitchen",
    "Air conditioning",
    "Free parking",
  ]);
  const [coverPhoto, setCoverPhoto] = useState<string>(PHOTO_PRESETS[1].cover);
  const [additionalPhotos, setAdditionalPhotos] = useState<string[]>(PHOTO_PRESETS[1].extras);
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string>("");
  const [title, setTitle] = useState<string>("Cozy Parisian loft with terrace");
  const [description, setDescription] = useState<string>(
    "Experience Paris from this stunning, sun-drenched loft featuring panoramic rooftop views, designer finishes, and modern luxury amenities."
  );
  const [price, setPrice] = useState<number>(185);

  // Step Validation
  const canAdvance = useMemo(() => {
    switch (step) {
      case 1:
        return !!category;
      case 2:
        return !!location && !!city.trim();
      case 3:
        return guestCount >= 1 && roomCount >= 1 && bathroomCount >= 1;
      case 4:
        return amenities.length > 0;
      case 5:
        return !!coverPhoto;
      case 6:
        return title.trim().length >= 5 && description.trim().length >= 10;
      case 7:
        return price >= 10;
      case 8:
        return true;
      default:
        return false;
    }
  }, [
    step,
    category,
    location,
    city,
    guestCount,
    roomCount,
    bathroomCount,
    amenities,
    coverPhoto,
    title,
    description,
    price,
  ]);

  // Amenity Toggle
  const toggleAmenity = useCallback((amenityId: string) => {
    setAmenities((prev) =>
      prev.includes(amenityId) ? prev.filter((id) => id !== amenityId) : [...prev, amenityId]
    );
  }, []);

  // Preset Selection
  const applyPreset = useCallback((presetId: string) => {
    const p = PHOTO_PRESETS.find((preset) => preset.id === presetId);
    if (!p) return;
    setCoverPhoto(p.cover);
    setAdditionalPhotos(p.extras);
  }, []);

  // Add Custom Photo URL
  const handleAddPhotoUrl = useCallback(() => {
    if (!customPhotoUrl.trim()) return;
    if (additionalPhotos.length >= 4) {
      toast.warning("Maximum of 5 photos reached (1 cover + 4 additional).");
      return;
    }
    setAdditionalPhotos((prev) => [...prev, customPhotoUrl.trim()]);
    setCustomPhotoUrl("");
  }, [customPhotoUrl, additionalPhotos.length]);

  // Remove Additional Photo
  const handleRemovePhoto = useCallback((idx: number) => {
    setAdditionalPhotos((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // Navigation handlers
  const handleBack = useCallback(() => {
    if (step > 1 && step < 8) {
      setStep((prev) => prev - 1);
    }
  }, [step]);

  const handleNext = useCallback(async () => {
    if (step < 7) {
      setStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    // On Step 7 -> Publish listing
    if (step === 7) {
      setIsSubmitting(true);
      try {
        const payload = {
          title: title.trim(),
          description: description.trim(),
          imageSrc: coverPhoto,
          images: [coverPhoto, ...additionalPhotos],
          category,
          roomCount,
          bathroomCount,
          guestCount,
          location: {
            value: location?.value || "US",
            latlng: location?.latlng,
          },
          city: city.trim(),
          amenities,
          price,
          instantBook: true,
          freeCancellation: true,
        };

        const res = await axios.post("/api/listings", payload);
        const newListing = res.data;
        setCreatedListingId(newListing.id);
        toast.success(tCommon("success"));
        setStep(8);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (err: any) {
        toast.error(err?.response?.data?.error || tCommon("error"));
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [
    step,
    title,
    description,
    coverPhoto,
    additionalPhotos,
    category,
    roomCount,
    bathroomCount,
    guestCount,
    location,
    city,
    amenities,
    price,
    tCommon,
  ]);

  // Exit Modal actions
  const handleSaveDraft = useCallback(() => {
    setShowExitModal(false);
    toast.info(t("draftSaved"));
    router.push("/properties");
  }, [router, t]);

  const handleDiscard = useCallback(() => {
    setShowExitModal(false);
    router.push("/");
  }, [router]);

  // Progress percentage
  const progressPercent = useMemo(() => {
    return Math.min(100, Math.round(((step - 1) / 7) * 100));
  }, [step]);

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col justify-between select-none">
      {/* 1. Dedicated Header */}
      <header className="sticky top-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo />
            {step < 8 && (
              <span className="hidden sm:inline-block text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600">
                {t("step", { current: step, total: 7 })}
              </span>
            )}
          </div>
          {step < 8 ? (
            <button
              type="button"
              onClick={() => setShowExitModal(true)}
              className="px-4 py-2 text-sm font-semibold rounded-full border border-neutral-300 hover:border-neutral-800 text-neutral-700 hover:text-neutral-950 transition cursor-pointer"
            >
              {t("saveAndExit")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/properties")}
              className="px-4 py-2 text-sm font-semibold rounded-full bg-neutral-900 text-white hover:bg-black transition cursor-pointer"
            >
              {t("goToProperties")}
            </button>
          )}
        </div>
      </header>

      {/* 2. Main Step Content Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* STEP 1: CATEGORY */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                {t("step1Title")}
              </h1>
              <p className="text-sm sm:text-base text-neutral-500 mt-1.5">{t("step1Subtitle")}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 pt-2">
              {categories.map((item) => {
                const isSelected = category === item.label;
                const Icon = item.icon;
                let localizedLabel = item.label;
                try {
                  localizedLabel = tCat(item.label as any);
                } catch {
                  localizedLabel = item.label;
                }
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setCategory(item.label)}
                    className={`flex flex-col items-start p-4 sm:p-5 rounded-2xl border-2 text-start transition-all cursor-pointer ${
                      isSelected
                        ? "border-neutral-900 bg-neutral-50 shadow-sm"
                        : "border-neutral-200 hover:border-neutral-400 bg-white"
                    }`}
                  >
                    <Icon size={28} className={isSelected ? "text-neutral-950" : "text-neutral-600"} />
                    <span className="font-semibold text-sm sm:text-base mt-3 text-neutral-900">
                      {localizedLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: LOCATION */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                {t("step2Title")}
              </h1>
              <p className="text-sm sm:text-base text-neutral-500 mt-1.5">{t("step2Subtitle")}</p>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
                  {tCommon("anywhere")}
                </label>
                <CountrySelect value={location as any} onChange={(val) => setLocation(val)} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-800 mb-1.5">
                  {t("city")}
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t("cityPlaceholder")}
                  className="w-full px-4 py-3 rounded-xl border-2 border-neutral-300 focus:border-neutral-900 focus:outline-none text-base"
                />
              </div>

              {/* Popular City Suggestion Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-neutral-500 font-medium me-1">Suggestions:</span>
                {POPULAR_CITIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCity(c)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition cursor-pointer ${
                      city === c
                        ? "bg-neutral-900 text-white border-neutral-900"
                        : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Map Preview */}
              <div className="mt-4 rounded-2xl overflow-hidden border border-neutral-200 shadow-sm">
                <Map center={location?.latlng} locationValue={location?.value} />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: FLOOR PLAN BASICS */}
        {step === 3 && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                {t("step3Title")}
              </h1>
              <p className="text-sm sm:text-base text-neutral-500 mt-1.5">{t("step3Subtitle")}</p>
            </div>
            <div className="flex flex-col divide-y divide-neutral-200">
              <div className="py-4">
                <Counter
                  title={t("guests")}
                  subtitle="How many guests can stay comfortably?"
                  value={guestCount}
                  onChange={(val) => setGuestCount(val)}
                />
              </div>
              <div className="py-4">
                <Counter
                  title={t("bedrooms")}
                  subtitle="How many bedrooms are available for guests?"
                  value={roomCount}
                  onChange={(val) => setRoomCount(val)}
                />
              </div>
              <div className="py-4">
                <Counter
                  title={t("beds")}
                  subtitle="How many beds can guests sleep in?"
                  value={bedCount}
                  onChange={(val) => setBedCount(val)}
                />
              </div>
              <div className="py-4">
                <Counter
                  title={t("bathrooms")}
                  subtitle="How many full or half bathrooms are there?"
                  value={bathroomCount}
                  onChange={(val) => setBathroomCount(val)}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: AMENITIES */}
        {step === 4 && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                {t("step4Title")}
              </h1>
              <p className="text-sm sm:text-base text-neutral-500 mt-1.5">{t("step4Subtitle")}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 pt-2">
              {AMENITY_ITEMS.map((item) => {
                const isSelected = amenities.includes(item.id);
                const Icon = item.icon;
                let localizedLabel = item.id;
                try {
                  localizedLabel = tAmenities(item.key as any);
                } catch {
                  localizedLabel = item.id;
                }
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleAmenity(item.id)}
                    className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border-2 text-start transition-all cursor-pointer ${
                      isSelected
                        ? "border-neutral-900 bg-neutral-50 shadow-sm"
                        : "border-neutral-200 hover:border-neutral-400 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        size={24}
                        className={isSelected ? "text-neutral-950" : "text-neutral-600"}
                      />
                      <span className="font-semibold text-sm sm:text-base text-neutral-900">
                        {localizedLabel}
                      </span>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center">
                        <MdCheck size={14} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 5: PHOTOS */}
        {step === 5 && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                {t("step5Title")}
              </h1>
              <p className="text-sm sm:text-base text-neutral-500 mt-1.5">{t("step5Subtitle")}</p>
            </div>

            {/* Curated Sample Photo Sets */}
            <div className="flex flex-col gap-2 p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
              <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                {t("dragOrSelect")}
              </span>
              <div className="flex flex-wrap gap-2">
                {PHOTO_PRESETS.map((preset) => {
                  let presetLabel = preset.id;
                  try {
                    presetLabel = t(preset.key as any);
                  } catch {
                    presetLabel = preset.id;
                  }
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset.id)}
                      className="px-3.5 py-1.5 rounded-full border border-neutral-300 bg-white hover:border-neutral-800 text-xs font-medium text-neutral-800 transition cursor-pointer"
                    >
                      ★ {presetLabel}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Photo URL Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customPhotoUrl}
                onChange={(e) => setCustomPhotoUrl(e.target.value)}
                placeholder={t("addPhotoUrlPlaceholder")}
                className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-300 focus:border-neutral-900 focus:outline-none text-sm"
              />
              <button
                type="button"
                onClick={handleAddPhotoUrl}
                disabled={!customPhotoUrl.trim() || additionalPhotos.length >= 4}
                className="px-4 py-2.5 rounded-xl bg-neutral-900 text-white hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold transition cursor-pointer flex items-center gap-1.5"
              >
                <MdOutlineAddPhotoAlternate size={18} />
                <span>{t("addPhoto")}</span>
              </button>
            </div>

            {/* Cover Photo Preview */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-neutral-900">{t("coverPhoto")}</span>
                <span className="text-xs text-neutral-500">Main hero image</span>
              </div>
              <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden border-2 border-neutral-900 shadow-sm bg-neutral-100">
                <Image
                  src={coverPhoto}
                  alt="Cover photo"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 800px"
                  priority
                />
                <span className="absolute top-3 start-3 bg-neutral-900/80 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-md">
                  {t("coverPhoto")}
                </span>
              </div>
            </div>

            {/* Additional Photos Grid */}
            <div className="flex flex-col gap-2 pt-2">
              <span className="text-sm font-semibold text-neutral-900">
                {t("additionalPhotos")} ({additionalPhotos.length} / 4)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {additionalPhotos.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-xl overflow-hidden border border-neutral-200 group bg-neutral-100"
                  >
                    <Image
                      src={img}
                      alt={`Photo ${idx + 2}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, 200px"
                    />
                    <button
                      type="button"
                      aria-label={t("removePhoto")}
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1.5 end-1.5 p-1 rounded-full bg-neutral-900/80 hover:bg-red-600 text-white transition cursor-pointer"
                    >
                      <MdClose size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: TITLE & DESCRIPTION */}
        {step === 6 && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                {t("step6Title")}
              </h1>
              <p className="text-sm sm:text-base text-neutral-500 mt-1.5">{t("step6Subtitle")}</p>
            </div>
            <div className="flex flex-col gap-5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-neutral-800">Title</label>
                  <span
                    className={`text-xs ${
                      title.length > 50 ? "text-amber-600 font-semibold" : "text-neutral-400"
                    }`}
                  >
                    {title.length} / 50
                  </span>
                </div>
                <input
                  type="text"
                  value={title}
                  maxLength={70}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("titlePlaceholder")}
                  className="w-full px-4 py-3 rounded-xl border-2 border-neutral-300 focus:border-neutral-900 focus:outline-none text-base"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-neutral-800">Description</label>
                  <span className="text-xs text-neutral-400">{description.length} chars</span>
                </div>
                <textarea
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("descPlaceholder")}
                  className="w-full px-4 py-3 rounded-xl border-2 border-neutral-300 focus:border-neutral-900 focus:outline-none text-base resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 7: PRICE & REVIEW */}
        {step === 7 && (
          <div className="flex flex-col gap-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                {t("step7Title")}
              </h1>
              <p className="text-sm sm:text-base text-neutral-500 mt-1.5">{t("step7Subtitle")}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              {/* Left Column: Price Input & Breakdown */}
              <div className="flex flex-col gap-5 p-6 rounded-2xl border border-neutral-200 bg-neutral-50/50">
                <div>
                  <label className="block text-sm font-semibold text-neutral-900 mb-2">
                    {t("pricePerNight")}
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute start-4 text-2xl font-bold text-neutral-400">$</span>
                    <input
                      type="number"
                      min={10}
                      max={10000}
                      value={price}
                      onChange={(e) => setPrice(Math.max(1, parseInt(e.target.value, 10) || 0))}
                      className="w-full ps-10 pe-4 py-3.5 rounded-xl border-2 border-neutral-300 focus:border-neutral-900 focus:outline-none text-2xl font-bold text-neutral-900 bg-white"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-3 border-t border-neutral-200 text-sm">
                  <div className="flex justify-between text-neutral-600">
                    <span>Base guest price</span>
                    <span className="font-semibold text-neutral-900">${price}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Estimated guest fee (~14%)</span>
                    <span>${Math.round(price * 0.14)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Total guest sees</span>
                    <span className="font-semibold text-neutral-900">
                      ${price + Math.round(price * 0.14)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-neutral-200 font-semibold text-neutral-900">
                    <span>You earn (~97%)</span>
                    <span className="text-emerald-700">${Math.round(price * 0.97)}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Guest Preview Card */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  {t("reviewTitle")}
                </span>
                <div className="rounded-2xl border border-neutral-200 overflow-hidden shadow-airbnb p-3 bg-white flex flex-col gap-3">
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-neutral-100">
                    <Image
                      src={coverPhoto}
                      alt={title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 400px"
                    />
                    <div className="absolute top-2.5 end-2.5 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-full text-xs font-semibold text-neutral-800 flex items-center gap-1 shadow-sm">
                      <MdStar className="text-amber-500" size={14} />
                      <span>5.0</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 px-1 pb-1">
                    <div className="flex items-center justify-between font-semibold text-neutral-900">
                      <span className="truncate">{title}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                        {category}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500">
                      {city}, {location?.label}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {guestCount} {tCommon("guests")} · {roomCount} {t("bedrooms")} · {bathroomCount}{" "}
                      {t("bathrooms")}
                    </p>
                    <div className="mt-2 pt-2 border-t border-neutral-100 flex items-baseline gap-1">
                      <span className="text-base font-bold text-neutral-950">${price}</span>
                      <span className="text-xs text-neutral-500">/ {tCommon("night")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 8: CELEBRATION SCREEN */}
        {step === 8 && (
          <div className="flex flex-col items-center text-center py-6 sm:py-10 max-w-lg mx-auto">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6 shadow-sm animate-bounce">
              <FaCheckCircle size={44} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-950">
              {t("step8Title")}
            </h1>
            <p className="text-sm sm:text-base text-neutral-600 mt-2 leading-relaxed">
              {t("step8Subtitle")}
            </p>

            {/* Listing Summary Preview Card */}
            <div className="mt-8 w-full p-4 rounded-2xl border border-neutral-200 bg-neutral-50/60 flex items-center gap-4 text-start">
              <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-neutral-200">
                <Image src={coverPhoto} alt={title} fill className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-sm text-neutral-900 truncate">{title}</h2>
                <p className="text-xs text-neutral-500">
                  {city}, {location?.label}
                </p>
                <p className="text-xs font-bold text-neutral-900 mt-1">
                  ${price} <span className="font-normal text-neutral-500">/ {tCommon("night")}</span>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full">
              {createdListingId && (
                <button
                  type="button"
                  onClick={() => router.push(`/listings/${createdListingId}`)}
                  className="w-full sm:flex-1 py-3 px-6 rounded-xl bg-neutral-900 text-white font-semibold text-sm hover:bg-black transition cursor-pointer shadow-sm"
                >
                  {t("viewNewListing")}
                </button>
              )}
              <button
                type="button"
                onClick={() => router.push("/properties")}
                className="w-full sm:flex-1 py-3 px-6 rounded-xl border-2 border-neutral-300 text-neutral-800 font-semibold text-sm hover:border-neutral-900 transition cursor-pointer"
              >
                {t("goToProperties")}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 3. Sticky Bottom Navigation Bar (Steps 1 to 7) */}
      {step < 8 && (
        <footer className="sticky bottom-0 inset-x-0 bg-white border-t border-neutral-200 z-20">
          {/* Animated Progress Bar */}
          <div className="w-full h-1 bg-neutral-100">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="text-sm font-semibold underline text-primary hover:text-primary-800 py-2 px-3 rounded-lg hover:bg-neutral-100 transition cursor-pointer"
              >
                {tCommon("back")}
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              disabled={!canAdvance || isSubmitting}
              onClick={handleNext}
              className="px-7 py-3 rounded-xl bg-accent hover:bg-accent-600 active:bg-accent-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition cursor-pointer shadow-sm flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{tCommon("loading")}</span>
                </>
              ) : step === 7 ? (
                t("publishListing")
              ) : (
                tCommon("next")
              )}
            </button>
          </div>
        </footer>
      )}

      {/* 4. Exit Confirmation Modal */}
      {showExitModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 border border-tertiary animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-primary">{t("exitModalTitle")}</h3>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setShowExitModal(false)}
                className="p-1 rounded-full hover:bg-neutral-100 text-neutral-500 transition cursor-pointer"
              >
                <MdClose size={20} />
              </button>
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed">{t("exitModalDesc")}</p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="w-full py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-800 transition cursor-pointer"
              >
                {t("saveDraft")}
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                className="w-full py-2.5 rounded-xl border border-tertiary text-status-error hover:border-status-error/30 hover:bg-status-error/10 font-semibold text-sm transition cursor-pointer"
              >
                {t("discard")}
              </button>
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="w-full py-2.5 rounded-xl text-neutral-600 hover:text-primary font-semibold text-sm transition cursor-pointer"
              >
                {t("keepEditing")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
