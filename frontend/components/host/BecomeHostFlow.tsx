"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "@/navigation";
import { createListing } from "@/lib/data/listings";
import { createOrganization } from "@/lib/data/organizations";
import { getCurrentUser, updateUserHostStatus } from "@/lib/data/auth";
import { useLoginModal } from "@/hook/useLoginModal";
import Counter from "@/components/inputs/Counter";
import { toast } from "react-toastify";
import dynamic from "next/dynamic";
import {
  HiOutlineHome,
  HiOutlineOfficeBuilding,
  HiOutlineUser,
  HiOutlineSparkles,
  HiOutlineLocationMarker,
  HiOutlinePhotograph,
  HiOutlineTag,
  HiOutlineCurrencyDollar,
  HiOutlineShieldCheck,
  HiOutlineCheck,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineX,
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineWifi,
  HiOutlineSun,
} from "react-icons/hi";
import {
  BiCar,
  BiCompass,
  BiBed,
  BiBath,
  BiUser,
  BiWater,
  BiCoffee,
  BiCheckCircle,
} from "react-icons/bi";

// Dynamically import Map to prevent SSR errors
const Map = dynamic(() => import("@/components/Map"), { ssr: false });

interface BecomeHostFlowProps {
  initialStep?: string;
  initialHostType?: "individual" | "agency" | null;
}

export default function BecomeHostFlow({
  initialStep = "0",
  initialHostType = null,
}: BecomeHostFlowProps) {
  const router = useRouter();
  const loginModal = useLoginModal();

  // Mode: "fork" (host type selection), "individual" (12 steps), "agency" (5 steps)
  const [currentStep, setCurrentStep] = useState<number>(() => {
    const parsed = parseInt(initialStep, 10);
    return isNaN(parsed) ? 0 : parsed;
  });

  const [hostType, setHostType] = useState<"individual" | "agency" | null>(
    initialHostType
  );
  const [isAgencyFlow, setIsAgencyFlow] = useState<boolean>(
    initialStep === "agency"
  );

  // Individual Listing Form State
  const [category, setCategory] = useState<string>("Villa");
  const [vertical, setVertical] = useState<"home" | "vehicle" | "experience">("home");
  const [placement, setPlacement] = useState<string>("entire");
  const [wilaya, setWilaya] = useState<string>("Algiers");
  const [city, setCity] = useState<string>("Hydra");
  const [address, setAddress] = useState<string>("Rue Djenane El Malik");
  const [latlng, setLatlng] = useState<[number, number]>([36.7538, 3.0588]);

  // Capacity
  const [guestCount, setGuestCount] = useState<number>(4);
  const [bedroomCount, setBedroomCount] = useState<number>(2);
  const [bedsCount, setBedsCount] = useState<number>(3);
  const [bathroomCount, setBathroomCount] = useState<number>(2);

  // Amenities
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    "wifi",
    "air_conditioning",
    "kitchen",
    "free_parking",
  ]);

  // Photos
  const [photos, setPhotos] = useState<string[]>([
    "/assets/hero.jpg",
    "/assets/tipaza.jpg",
    "/assets/oran.jpg",
    "/assets/constantine.jpg",
  ]);
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string>("");

  // Details
  const [title, setTitle] = useState<string>("Stunning Mediterranean Villa with Private Garden");
  const [description, setDescription] = useState<string>(
    "Experience authentic Algerian warmth in this tranquil private residence. Enjoy breathtaking sea breezes, a sun-drenched central patio, and modern comfort just minutes from the coast."
  );
  const [price, setPrice] = useState<number>(18500); // DZD
  const [instantBook, setInstantBook] = useState<boolean>(true);
  const [cancellationPolicy, setCancellationPolicy] = useState<"flexible" | "moderate" | "strict">("flexible");

  // Agency Registration Form State
  const [agencyStep, setAgencyStep] = useState<number>(1);
  const [businessName, setBusinessName] = useState<string>("Atlas Escapes Voyages SARL");
  const [businessType, setBusinessType] = useState<string>("Licensed Tourism Agency");
  const [regNumber, setRegNumber] = useState<string>("DZ-ALG-2024-B-08921");
  const [businessEmail, setBusinessEmail] = useState<string>("contact@atlasescapes.dz");
  const [businessPhone, setBusinessPhone] = useState<string>("+213 21 69 45 12");
  const [headquarters, setHeadquarters] = useState<string>("14 Rue Didouche Mourad, Algiers");
  const [teamSize, setTeamSize] = useState<"1" | "2-10" | "11-50" | "50+">("2-10");
  const [teamInvites, setTeamInvites] = useState<{ email: string; role: "admin" | "manager" }[]>([
    { email: "", role: "manager" },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load draft from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("darna_host_draft");
      if (saved) {
        try {
          const draft = JSON.parse(saved);
          if (draft.title) setTitle(draft.title);
          if (draft.description) setDescription(draft.description);
          if (draft.price) setPrice(draft.price);
          if (draft.wilaya) setWilaya(draft.wilaya);
          if (draft.city) setCity(draft.city);
          if (draft.address) setAddress(draft.address);
          if (draft.photos && draft.photos.length > 0) setPhotos(draft.photos);
          if (draft.category) setCategory(draft.category);
          if (draft.vertical) setVertical(draft.vertical);
          if (draft.placement) setPlacement(draft.placement);
          if (draft.guestCount) setGuestCount(draft.guestCount);
          if (draft.bedroomCount) setBedroomCount(draft.bedroomCount);
          if (draft.bedsCount) setBedsCount(draft.bedsCount);
          if (draft.bathroomCount) setBathroomCount(draft.bathroomCount);
          if (draft.selectedAmenities) setSelectedAmenities(draft.selectedAmenities);
          if (draft.latlng) setLatlng(draft.latlng);
          if (typeof draft.instantBook === "boolean") setInstantBook(draft.instantBook);
          if (draft.cancellationPolicy) setCancellationPolicy(draft.cancellationPolicy);
          // Agency fields
          if (draft.businessName) setBusinessName(draft.businessName);
          if (draft.businessType) setBusinessType(draft.businessType);
          if (draft.regNumber) setRegNumber(draft.regNumber);
          if (draft.businessEmail) setBusinessEmail(draft.businessEmail);
          if (draft.businessPhone) setBusinessPhone(draft.businessPhone);
          if (draft.headquarters) setHeadquarters(draft.headquarters);
          if (draft.teamSize) setTeamSize(draft.teamSize);
          if (draft.teamInvites) setTeamInvites(draft.teamInvites);

          // Restore flow state if not overridden by explicit URL step
          if (initialStep === "0" || !initialStep) {
            if (draft.hostType) setHostType(draft.hostType);
            if (typeof draft.isAgencyFlow === "boolean") setIsAgencyFlow(draft.isAgencyFlow);
            if (draft.agencyStep) setAgencyStep(draft.agencyStep);
            if (draft.currentStep && draft.currentStep > 0) setCurrentStep(draft.currentStep);
          }
        } catch {}
      }
    }
  }, [initialStep]);

  const handleSaveAndExit = () => {
    if (typeof window !== "undefined") {
      const draft = {
        hostType,
        isAgencyFlow,
        currentStep: isAgencyFlow ? 0 : currentStep,
        agencyStep,
        category,
        vertical,
        placement,
        wilaya,
        city,
        address,
        latlng,
        guestCount,
        bedroomCount,
        bedsCount,
        bathroomCount,
        selectedAmenities,
        photos,
        title,
        description,
        price,
        instantBook,
        cancellationPolicy,
        businessName,
        businessType,
        regNumber,
        businessEmail,
        businessPhone,
        headquarters,
        teamSize,
        teamInvites,
      };
      localStorage.setItem("darna_host_draft", JSON.stringify(draft));
      toast.info("Progress saved as draft in your browser.");
      router.push("/");
    }
  };

  const handleAddPhoto = () => {
    if (!customPhotoUrl.trim()) return;
    setPhotos((prev) => [...prev, customPhotoUrl.trim()]);
    setCustomPhotoUrl("");
    toast.success("Photo added to listing gallery!");
  };

  const handleRemovePhoto = (index: number) => {
    if (photos.length <= 1) {
      toast.error("Listing must have at least one photo.");
      return;
    }
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePublishListing = async () => {
    let finalPhotos = [...photos];
    if (finalPhotos.length < 4) {
      finalPhotos = [
        "/assets/hero.jpg",
        "/assets/tipaza.jpg",
        "/assets/oran.jpg",
        "/assets/constantine.jpg",
      ];
      setPhotos(finalPhotos);
    }
    setIsSubmitting(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.info("Please log in to publish your listing.");
        loginModal.onOpen();
        setIsSubmitting(false);
        return;
      }
      const hostId = user.id;

      const listingPayload = {
        title: title || "Stunning Mediterranean Villa with Private Garden",
        description: description || "Experience authentic Algerian warmth in this tranquil private residence.",
        price: price || 18500,
        category: vertical,
        type: category,
        city: `${city || "Hydra"}, ${wilaya || "Algiers"}`,
        locationValue: wilaya || "Algiers",
        country: "Algeria",
        imageSrc: finalPhotos,
        guestCount,
        bedroomCount,
        roomCount: bedroomCount + 1,
        bathroomCount,
        amenities: selectedAmenities,
        latlng,
        instantBook,
        cancellationPolicy,
        ownerType: "individual" as const,
        hostUserId: hostId,
      };

      // 1. Post to server route handler so server store and cookies are updated
      try {
        await fetch("/api/host/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hostType: "individual",
            userId: hostId,
            listing: listingPayload,
          }),
        });
      } catch (e) {
        console.error("API error", e);
      }

      // 2. Also keep client in-memory stores in sync
      await createListing(listingPayload);
      await updateUserHostStatus(hostId, { hostType: "individual" });

      if (typeof window !== "undefined") {
        localStorage.removeItem("darna_host_draft");
        localStorage.setItem("darna_mode", "host");
        document.cookie = `darna_user_id=${hostId}; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = "darna_host_type=individual; path=/; max-age=31536000; SameSite=Lax";
        document.cookie = "darna_mode=host; path=/; max-age=31536000; SameSite=Lax";
      }

      toast.success("Congratulations! Your listing is now live on DARNA.");
      const currentLocale = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : "en";
      const localePrefix = ["en", "fr", "ar"].includes(currentLocale) ? `/${currentLocale}` : "/en";
      window.location.href = `${localePrefix}/host`;
    } catch {
      toast.error("Failed to publish listing. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleRegisterAgency = async () => {
    setIsSubmitting(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.info("Please log in to register an agency.");
        loginModal.onOpen();
        setIsSubmitting(false);
        return;
      }
      const hostId = user.id;

      const validInvites = teamInvites.filter((inv) => inv.email.trim());
      const agencyPayload = {
        name: businessName.trim() || "Atlas Escapes Voyages SARL",
        businessRegistrationNumber: regNumber.trim() || "DZ-ALG-2024-B-08921",
        businessType: businessType || "Licensed Tourism Agency",
        businessEmail: businessEmail.trim() || "contact@atlasescapes.dz",
        businessPhone: businessPhone.trim() || "+213 21 69 45 12",
        address: headquarters.trim() || "14 Rue Didouche Mourad, Algiers",
        ownerUserId: hostId,
        teamSizeEstimate: teamSize,
        invitedMembers: validInvites,
      };

      // 1. Post to server route handler
      let orgId = `org_${Date.now()}`;
      try {
        const res = await fetch("/api/host/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hostType: "agency",
            userId: hostId,
            agency: agencyPayload,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.organization?.id) orgId = data.organization.id;
        }
      } catch (e) {
        console.error("API error", e);
      }

      // 2. Also keep client in-memory stores in sync
      const org = await createOrganization({ ...agencyPayload, verificationStatus: "verified" });
      const finalOrgId = orgId || org.id;
      await updateUserHostStatus(hostId, {
        hostType: "agency",
        organizationId: finalOrgId,
      });

      if (typeof window !== "undefined") {
        localStorage.removeItem("darna_host_draft");
        localStorage.setItem("darna_mode", "host");
        localStorage.setItem("darna_agency_id", finalOrgId);
        document.cookie = `darna_agency_id=${finalOrgId}; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `darna_user_id=${hostId}; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = "darna_host_type=agency; path=/; max-age=31536000; SameSite=Lax";
        document.cookie = "darna_mode=host; path=/; max-age=31536000; SameSite=Lax";
      }

      toast.success("Agency registered! Welcome to your host workspace.");
      const currentLocale = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : "en";
      const localePrefix = ["en", "fr", "ar"].includes(currentLocale) ? `/${currentLocale}` : "/en";
      window.location.href = `${localePrefix}/host`;
    } catch {
      toast.error("Failed to register agency.");
      setIsSubmitting(false);
    }
  };

  const wilayasAlgeria = [
    { name: "Algiers", latlng: [36.7538, 3.0588] as [number, number] },
    { name: "Oran", latlng: [35.6987, -0.6349] as [number, number] },
    { name: "Constantine", latlng: [36.365, 6.6147] as [number, number] },
    { name: "Tipaza", latlng: [36.5897, 2.4475] as [number, number] },
    { name: "Djanet (Sahara)", latlng: [24.5539, 9.4858] as [number, number] },
    { name: "Taghit (Bechar)", latlng: [30.9167, -2.0333] as [number, number] },
    { name: "Bejaia", latlng: [36.7559, 5.0843] as [number, number] },
    { name: "Ghardaia (M'zab)", latlng: [32.4909, 3.6736] as [number, number] },
    { name: "Tlemcen", latlng: [34.8783, -1.315] as [number, number] },
    { name: "Annaba", latlng: [36.9, 7.7667] as [number, number] },
  ];

  const categoriesConfig = [
    { label: "Villa", vertical: "home" as const, imgSrc: "/assets/house.png" },
    { label: "Casbah Heritage House", vertical: "home" as const, imgSrc: "/assets/house.png" },
    { label: "Seaside Apartment", vertical: "home" as const, icon: BiWater },
    { label: "Saharan Ksar", vertical: "home" as const, icon: HiOutlineSun },
    { label: "Desert Camp", vertical: "home" as const, icon: BiCompass },
    { label: "4x4 Land Cruiser SUV", vertical: "vehicle" as const, imgSrc: "/assets/car.png" },
    { label: "Sahara 4x4 Expedition", vertical: "experience" as const, icon: BiCompass },
    { label: "Casbah Architecture Tour", vertical: "experience" as const, icon: HiOutlineSparkles },
  ];

  const amenitiesList = [
    { id: "wifi", label: "Fast WiFi", icon: HiOutlineWifi },
    { id: "air_conditioning", label: "Air Conditioning (Climatisation)", icon: HiOutlineSun },
    { id: "kitchen", label: "Equipped Kitchen", icon: BiCoffee },
    { id: "free_parking", label: "Free Parking on Premises", icon: BiCar },
    { id: "sea_view", label: "Mediterranean Sea View", icon: BiWater },
    { id: "traditional_patio", label: "Traditional Central Patio", icon: HiOutlineSparkles },
    { id: "pool", label: "Private Swimming Pool", icon: BiWater },
    { id: "sahara_fireplace", label: "Sahara Campfire & Fireplace", icon: HiOutlineSun },
  ];

  // Calculate Progress Percentage
  const progressPercent = isAgencyFlow
    ? Math.round((agencyStep / 5) * 100)
    : currentStep === 0
    ? 0
    : Math.round((currentStep / 12) * 100);

  return (
    <div className="min-h-screen bg-bg-light/40 flex flex-col justify-between">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-tertiary/60 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center">
            <Image
              src="/assets/logo-horizontal.png"
              alt="DARNA"
              width={120}
              height={38}
              priority
              className="h-7 sm:h-8 w-auto object-contain"
            />
          </Link>
          <span className="hidden sm:inline-block px-2.5 py-0.5 bg-tertiary/30 text-primary text-xs font-bold rounded-full">
            {isAgencyFlow ? "Agency Registration" : "Become a Host"}
          </span>
        </div>

        <button
          type="button"
          onClick={handleSaveAndExit}
          className="px-4 py-1.5 rounded-full border border-tertiary text-xs sm:text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition"
        >
          Save & Exit
        </button>
      </header>

      {/* Progress Bar */}
      <div className="w-full bg-tertiary/30 h-1.5 sticky top-[57px] z-30">
        <div
          className="bg-accent h-1.5 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Form Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 pb-32 sm:pb-40 flex flex-col justify-center">
        {/* ======================================================== */}
        {/* STEP 0: HOST-TYPE FORK (Individual vs Agency)             */}
        {/* ======================================================== */}
        {currentStep === 0 && !isAgencyFlow && (
          <div className="space-y-8 animate-in fade-in">
            <div className="text-center max-w-lg mx-auto space-y-2">
              <span className="text-xs uppercase tracking-wider text-secondary font-bold">
                Step 1 of 2 · Account Type
              </span>
              <h1 className="text-2xl sm:text-4xl font-bold text-primary font-serif">
                How do you plan to host on DARNA?
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500">
                Choose the hosting model that best reflects your Algerian properties or fleet.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto pt-4">
              {/* Individual Card */}
              <div
                id="choose-individual-card"
                onClick={() => {
                  setHostType("individual");
                  setCurrentStep(1);
                }}
                className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-tertiary hover:border-primary hover:shadow-lg transition cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="w-14 h-14 bg-tertiary/30 text-primary rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition">
                    <HiOutlineUser size={28} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-primary">Individual Host</h3>
                    <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                      You are an individual hosting your private villa, Casbah apartment, Sahara tent, or personal 4x4.
                    </p>
                  </div>
                </div>
                <div className="pt-6 mt-4 border-t border-tertiary/40 flex items-center justify-between text-xs font-bold text-primary">
                  <span>Continue as Individual</span>
                  <HiOutlineChevronRight size={18} className="group-hover:translate-x-1 transition" />
                </div>
              </div>

              {/* Agency Card */}
              <div
                id="choose-agency-card"
                onClick={() => {
                  setHostType("agency");
                  setIsAgencyFlow(true);
                  setAgencyStep(1);
                }}
                className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-tertiary hover:border-primary hover:shadow-lg transition cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="w-14 h-14 bg-tertiary/30 text-primary rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition">
                    <HiOutlineOfficeBuilding size={28} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-primary">Tourism Agency / Fleet</h3>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">
                        Business
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                      You are a licensed Algerian travel agency, car rental fleet, or hotel manager with multiple properties and staff.
                    </p>
                  </div>
                </div>
                <div className="pt-6 mt-4 border-t border-tertiary/40 flex items-center justify-between text-xs font-bold text-primary">
                  <span>Register Agency Workspace</span>
                  <HiOutlineChevronRight size={18} className="group-hover:translate-x-1 transition" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* INDIVIDUAL FLOW: STEP 1 - INTRO                          */}
        {/* ======================================================== */}
        {currentStep === 1 && !isAgencyFlow && (
          <div className="space-y-8 max-w-xl mx-auto text-center animate-in fade-in">
            <div className="w-20 h-20 bg-tertiary/30 text-primary rounded-full flex items-center justify-center mx-auto mb-2">
              <HiOutlineSparkles size={36} className="text-accent" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-secondary font-bold">
                Overview
              </span>
              <h1 className="text-2xl sm:text-4xl font-bold text-primary font-serif mt-1">
                It&apos;s easy to get started on DARNA
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 mt-2">
                Join thousands of welcoming hosts sharing Algerian culture, coastlines, and desert expeditions.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-tertiary/70 text-start space-y-5 text-xs sm:text-sm shadow-xs">
              <div className="flex items-start gap-4">
                <span className="w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <div className="font-bold text-primary">Tell us about your place</div>
                  <div className="text-neutral-500 text-xs mt-0.5">
                    Share your location, property type, and guest capacity.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <span className="w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <div className="font-bold text-primary">Make it stand out</div>
                  <div className="text-neutral-500 text-xs mt-0.5">
                    Add at least 4 photos, amenities, and an authentic title.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <span className="w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <div className="font-bold text-primary">Set pricing & publish</div>
                  <div className="text-neutral-500 text-xs mt-0.5">
                    Choose your nightly price in DZD and welcome your first guests.
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              id="get-started-btn"
              onClick={() => setCurrentStep(2)}
              className="px-8 py-3 bg-primary text-white font-semibold rounded-xl text-sm hover:bg-primary/95 transition shadow-sm cursor-pointer"
            >
              Get Started
            </button>
          </div>
        )}

        {/* ======================================================== */}
        {/* INDIVIDUAL FLOW: STEP 2 - PROPERTY TYPE / CATEGORY       */}
        {/* ======================================================== */}
        {currentStep === 2 && !isAgencyFlow && (
          <div className="space-y-6 animate-in fade-in max-w-2xl mx-auto">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-primary font-serif">
                Which best describes your place?
              </h2>
              <p className="text-xs text-neutral-500">
                Choose the category for your Algerian stay, vehicle, or experience
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {categoriesConfig.map((item) => {
                const Icon = item.icon;
                const isSelected = category === item.label;

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setCategory(item.label);
                      setVertical(item.vertical);
                    }}
                    className={`p-4 rounded-2xl border-2 text-start flex flex-col justify-between gap-3 transition ${
                      isSelected
                        ? "border-primary bg-tertiary/20 shadow-xs"
                        : "border-tertiary/70 bg-white hover:border-neutral-400"
                    }`}
                  >
                    {item.imgSrc ? (
                      <div className="w-6 h-6 relative flex items-center justify-center">
                        <Image
                          src={item.imgSrc}
                          alt={item.label}
                          width={24}
                          height={24}
                          className="object-contain"
                        />
                      </div>
                    ) : Icon ? (
                      <Icon size={24} className={isSelected ? "text-primary" : "text-neutral-500"} />
                    ) : null}
                    <div>
                      <div className="text-xs font-bold text-primary">{item.label}</div>
                      <div className="text-[10px] text-neutral-400 uppercase tracking-wider mt-0.5">
                        {item.vertical}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* INDIVIDUAL FLOW: STEP 3 - PLACEMENT                      */}
        {/* ======================================================== */}
        {currentStep === 3 && !isAgencyFlow && (
          <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-primary font-serif">
                What type of space will guests have?
              </h2>
              <p className="text-xs text-neutral-500">
                Select the level of privacy guests will enjoy
              </p>
            </div>

            <div className="space-y-3 pt-2">
              {[
                {
                  id: "entire",
                  title: "An entire place",
                  desc: "Guests have the whole residence to themselves, including private entrance and amenities.",
                },
                {
                  id: "private",
                  title: "A private room",
                  desc: "Guests have their own private bedroom, while areas like kitchen or patio may be shared.",
                },
                {
                  id: "shared",
                  title: "A shared room",
                  desc: "Guests sleep in a common space or dorm room with others.",
                },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setPlacement(opt.id)}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition flex items-center justify-between ${
                    placement === opt.id
                      ? "border-primary bg-tertiary/20"
                      : "border-tertiary/70 bg-white hover:border-neutral-400"
                  }`}
                >
                  <div>
                    <h3 className="text-sm font-bold text-primary">{opt.title}</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">{opt.desc}</p>
                  </div>
                  <input
                    type="radio"
                    name="placement"
                    checked={placement === opt.id}
                    onChange={() => setPlacement(opt.id)}
                    className="w-4 h-4 text-primary"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* INDIVIDUAL FLOW: STEP 4 - LOCATION & MAP PIN             */}
        {/* ======================================================== */}
        {currentStep === 4 && !isAgencyFlow && (
          <div className="space-y-6 animate-in fade-in max-w-2xl mx-auto">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-primary font-serif">
                Where is your place located?
              </h2>
              <p className="text-xs text-neutral-500">
                Your exact address is only shared with confirmed guests
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Wilaya (Province)
                </label>
                <select
                  value={wilaya}
                  onChange={(e) => {
                    const sel = wilayasAlgeria.find((w) => w.name === e.target.value);
                    if (sel) {
                      setWilaya(sel.name);
                      setLatlng(sel.latlng);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-white border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary"
                >
                  {wilayasAlgeria.map((w) => (
                    <option key={w.name} value={w.name}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  City / Neighborhood
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Tipaza Ville, Didouche Mourad"
                  className="w-full px-3.5 py-2.5 bg-white border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Street Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 14 Route de la Corniche"
                className="w-full px-3.5 py-2.5 bg-white border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary"
              />
            </div>

            {/* Map Preview */}
            <div className="rounded-2xl overflow-hidden border border-tertiary shadow-xs h-56 relative">
              <Map center={latlng} />
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* INDIVIDUAL FLOW: STEP 5 - CAPACITY BASICS                */}
        {/* ======================================================== */}
        {currentStep === 5 && !isAgencyFlow && (
          <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-primary font-serif">
                Share some basics about your place
              </h2>
              <p className="text-xs text-neutral-500">
                You will add more details, like bed types, later
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-tertiary/70 divide-y divide-tertiary/40 shadow-xs">
              <div className="py-3">
                <Counter
                  title="Guests"
                  subtitle="How many guests can stay comfortably?"
                  value={guestCount}
                  onChange={setGuestCount}
                />
              </div>
              <div className="py-3">
                <Counter
                  title="Bedrooms"
                  subtitle="How many bedrooms are available?"
                  value={bedroomCount}
                  onChange={setBedroomCount}
                />
              </div>
              <div className="py-3">
                <Counter
                  title="Beds"
                  subtitle="How many beds do guests have access to?"
                  value={bedsCount}
                  onChange={setBedsCount}
                />
              </div>
              <div className="py-3">
                <Counter
                  title="Bathrooms"
                  subtitle="How many full or half bathrooms?"
                  value={bathroomCount}
                  onChange={setBathroomCount}
                />
              </div>
            </div>

            {/* Live Summary Line */}
            <div className="p-3 bg-tertiary/20 rounded-2xl border border-tertiary/50 text-center text-xs font-semibold text-primary">
              Summary: {guestCount} guests · {bedroomCount} bedrooms · {bedsCount} beds · {bathroomCount} bathrooms
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* INDIVIDUAL FLOW: STEP 6 - AMENITIES                      */}
        {/* ======================================================== */}
        {currentStep === 6 && !isAgencyFlow && (
          <div className="space-y-6 animate-in fade-in max-w-2xl mx-auto">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-primary font-serif">
                Tell guests what your place offers
              </h2>
              <p className="text-xs text-neutral-500">
                You can add more amenities after publishing
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {amenitiesList.map((amenity) => {
                const Icon = amenity.icon;
                const isChecked = selectedAmenities.includes(amenity.id);

                return (
                  <button
                    key={amenity.id}
                    type="button"
                    onClick={() => {
                      setSelectedAmenities((prev) =>
                        isChecked
                          ? prev.filter((id) => id !== amenity.id)
                          : [...prev, amenity.id]
                      );
                    }}
                    className={`p-4 rounded-2xl border-2 text-start flex flex-col justify-between gap-3 transition ${
                      isChecked
                        ? "border-primary bg-tertiary/25 shadow-xs"
                        : "border-tertiary/70 bg-white hover:border-neutral-400"
                    }`}
                  >
                    <Icon size={24} className={isChecked ? "text-primary" : "text-neutral-500"} />
                    <span className="text-xs font-bold text-primary">{amenity.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* INDIVIDUAL FLOW: STEP 7 - PHOTOS GALLERY                 */}
        {/* ======================================================== */}
        {currentStep === 7 && !isAgencyFlow && (
          <div className="space-y-6 animate-in fade-in max-w-2xl mx-auto">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-primary font-serif">
                Add photos of your Algerian stay
              </h2>
              <p className="text-xs text-neutral-500">
                You need at least 4 photos to publish. High quality photos boost reservations by 40%.
              </p>
            </div>

            {/* Photos Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {photos.map((src, index) => (
                <div
                  key={index}
                  className="relative aspect-video rounded-2xl overflow-hidden border border-tertiary group bg-neutral-100"
                >
                  <Image src={src} alt="Photo" fill className="object-cover" />
                  {index === 0 && (
                    <span className="absolute top-2 start-2 px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full">
                      Cover
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(index)}
                    className="absolute top-2 end-2 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-rose-600"
                    title="Remove photo"
                  >
                    <HiOutlineTrash size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add photo bar */}
            <div className="p-4 bg-white rounded-2xl border border-tertiary/70 space-y-3">
              <label className="block text-xs font-semibold text-neutral-700">
                Add Image URL or Presets
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customPhotoUrl}
                  onChange={(e) => setCustomPhotoUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="flex-1 px-3.5 py-2 bg-neutral-50 border border-tertiary/70 rounded-xl text-xs text-primary"
                />
                <button
                  type="button"
                  onClick={handleAddPhoto}
                  className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/95 transition"
                >
                  Add Photo
                </button>
              </div>

              {/* Algerian Quick Preset Photos */}
              <div className="pt-2 flex flex-wrap gap-1.5 text-[11px]">
                <span className="text-neutral-400 self-center me-1">Presets:</span>
                {[
                  { label: "+ Tipaza Ruins Villa", src: "/assets/tipaza.jpg" },
                  { label: "+ Oran Seaside", src: "/assets/oran.jpg" },
                  { label: "+ Constantine Bridges", src: "/assets/constantine.jpg" },
                  { label: "+ Casbah Terrace", src: "/assets/hero.jpg" },
                ].map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPhotos((prev) => [...prev, preset.src])}
                    className="px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg font-medium transition"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* INDIVIDUAL FLOW: STEP 8 - TITLE                          */}
        {/* ======================================================== */}
        {currentStep === 8 && !isAgencyFlow && (
          <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-primary font-serif">
                Now, let&apos;s give your place a title
              </h2>
              <p className="text-xs text-neutral-500">
                Short titles that highlight what makes your place special work best
              </p>
            </div>

            <div className="space-y-3">
              <textarea
                rows={3}
                value={title}
                maxLength={60}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-4 bg-white border border-tertiary/80 rounded-2xl text-base sm:text-lg font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex justify-between text-xs text-neutral-400">
                <span>{title.length}/60 characters</span>
                <span className="text-secondary font-medium">Keep it catchy & descriptive</span>
              </div>
            </div>

            {/* Quick Inspiration Pills */}
            <div className="p-4 bg-tertiary/20 rounded-2xl border border-tertiary/40 space-y-2 text-xs">
              <div className="font-semibold text-primary">Need ideas? Tap an example:</div>
              <div className="flex flex-col gap-1.5">
                {[
                  "Seaside Luxury Villa Chenoua with Private Pool",
                  "Authentic Restored Casbah Rooftop with Bay View",
                  "Tassili Desert Camp Under the Sahara Stars",
                ].map((sugg, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setTitle(sugg)}
                    className="text-start p-2 bg-white rounded-xl hover:bg-neutral-50 text-neutral-700 font-medium transition"
                  >
                    &ldquo;{sugg}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* INDIVIDUAL FLOW: STEP 9 - DESCRIPTION                    */}
        {/* ======================================================== */}
        {currentStep === 9 && !isAgencyFlow && (
          <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-primary font-serif">
                Create your description
              </h2>
              <p className="text-xs text-neutral-500">
                Share what makes your place special, proximity to Algerian landmarks, and hospitality
              </p>
            </div>

            <div className="space-y-3">
              <textarea
                rows={6}
                value={description}
                maxLength={500}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-4 bg-white border border-tertiary/80 rounded-2xl text-xs sm:text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed"
              />
              <div className="flex justify-between text-xs text-neutral-400">
                <span>{description.length}/500 characters</span>
                <span>Mention parking, terrace, views, or nearby markets</span>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* INDIVIDUAL FLOW: STEP 10 - PRICING & EARNINGS ESTIMATE   */}
        {/* ======================================================== */}
        {currentStep === 10 && !isAgencyFlow && (
          <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-primary font-serif">
                Now, set your nightly price
              </h2>
              <p className="text-xs text-neutral-500">
                You can change it anytime in your host dashboard
              </p>
            </div>

            {/* Price Box */}
            <div className="bg-white rounded-3xl p-8 border border-tertiary text-center space-y-4 shadow-xs">
              <div className="flex items-center justify-center gap-2">
                <input
                  type="number"
                  step="500"
                  min="2000"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="font-serif text-3xl sm:text-5xl font-black text-primary text-center bg-transparent border-b-2 border-primary focus:outline-none w-48"
                />
                <span className="font-serif text-2xl font-bold text-neutral-500">DZD</span>
              </div>
              <div className="text-xs text-neutral-400">
                Equivalent to ~€{Math.round(price / 153)} per night
              </div>

              {/* Earnings Calculator */}
              <div className="p-4 bg-neutral-50 rounded-2xl border border-tertiary/60 text-xs text-start space-y-2 mt-4">
                <div className="flex justify-between text-neutral-600">
                  <span>Base nightly price:</span>
                  <span className="font-semibold text-primary">{price.toLocaleString()} DZD</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>DARNA host service fee (3%):</span>
                  <span className="text-rose-600">-{Math.round(price * 0.03).toLocaleString()} DZD</span>
                </div>
                <hr className="border-tertiary/40" />
                <div className="flex justify-between text-sm font-bold text-primary">
                  <span>Your net payout:</span>
                  <span className="text-emerald-700">
                    {Math.round(price * 0.97).toLocaleString()} DZD{" "}
                    <span className="text-[11px] font-normal text-neutral-400">
                      (~€{Math.round((price * 0.97) / 153)})
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* INDIVIDUAL FLOW: STEP 11 - BOOKING SETTINGS              */}
        {/* ======================================================== */}
        {currentStep === 11 && !isAgencyFlow && (
          <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-primary font-serif">
                Choose your reservation settings
              </h2>
              <p className="text-xs text-neutral-500">
                Control how guests book and your cancellation rules
              </p>
            </div>

            <div className="space-y-4">
              {/* Instant Book */}
              <div className="p-5 bg-white rounded-2xl border border-tertiary flex items-center justify-between">
                <div>
                  <div className="font-bold text-primary text-sm">Instant Book</div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    Qualified guests book immediately without waiting for host confirmation
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={instantBook}
                  onChange={(e) => setInstantBook(e.target.checked)}
                  className="rounded text-primary w-4 h-4"
                />
              </div>

              {/* Cancellation Policy */}
              <div className="p-5 bg-white rounded-2xl border border-tertiary space-y-3">
                <div className="font-bold text-primary text-sm">Cancellation Policy</div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: "flexible", label: "Flexible", desc: "Full refund 1 day prior" },
                    { id: "moderate", label: "Moderate", desc: "Full refund 5 days prior" },
                    { id: "strict", label: "Strict", desc: "50% refund up to 7 days" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setCancellationPolicy(p.id as any)}
                      className={`p-3 rounded-xl border text-start transition ${
                        cancellationPolicy === p.id
                          ? "bg-primary text-white border-primary shadow-xs"
                          : "bg-neutral-50 text-neutral-700 border-tertiary/70 hover:bg-neutral-100"
                      }`}
                    >
                      <div className="font-bold">{p.label}</div>
                      <div className={`text-[10px] mt-0.5 ${cancellationPolicy === p.id ? "text-white/80" : "text-neutral-400"}`}>
                        {p.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* INDIVIDUAL FLOW: STEP 12 - REVIEW & PUBLISH              */}
        {/* ======================================================== */}
        {currentStep === 12 && !isAgencyFlow && (
          <div className="space-y-6 animate-in fade-in max-w-2xl mx-auto">
            <div className="text-center space-y-1">
              <span className="text-xs uppercase tracking-wider text-secondary font-bold">
                Final Step
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-primary font-serif">
                Review your listing before publishing
              </h2>
              <p className="text-xs text-neutral-500">
                Here is what guests will see when browsing DARNA
              </p>
            </div>

            {/* Listing Preview Card */}
            <div className="bg-white rounded-3xl border border-tertiary overflow-hidden shadow-md">
              <div className="relative aspect-video w-full bg-neutral-100">
                <Image
                  src={photos[0] || "/assets/placeholder.jpg"}
                  alt={title}
                  fill
                  className="object-cover"
                />
                <div className="absolute top-3 start-3">
                  <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-xs font-bold text-primary uppercase">
                    {category}
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-primary text-lg">{title}</h3>
                    <div className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                      <HiOutlineLocationMarker size={15} className="text-secondary" />
                      <span>{city}, {wilaya}, Algeria</span>
                    </div>
                  </div>
                  <div className="text-end shrink-0">
                    <div className="text-lg font-bold text-primary">{price.toLocaleString()} DZD</div>
                    <div className="text-[11px] text-neutral-400">/night (~€{Math.round(price / 153)})</div>
                  </div>
                </div>

                <div className="p-3 bg-neutral-50 rounded-2xl border border-tertiary/50 text-xs text-neutral-600 flex items-center justify-around">
                  <span>{guestCount} guests</span>
                  <span>·</span>
                  <span>{bedroomCount} bedrooms</span>
                  <span>·</span>
                  <span>{bedsCount} beds</span>
                  <span>·</span>
                  <span>{bathroomCount} baths</span>
                </div>

                <p className="text-xs text-neutral-600 leading-relaxed line-clamp-3">
                  {description}
                </p>

                {/* Section Edit Links */}
                <div className="pt-2 border-t border-tertiary/40 flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className="text-secondary hover:underline font-semibold"
                  >
                    Edit Location
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(7)}
                    className="text-secondary hover:underline font-semibold"
                  >
                    Edit Photos ({photos.length})
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(10)}
                    className="text-secondary hover:underline font-semibold"
                  >
                    Edit Price
                  </button>
                </div>
              </div>
            </div>

            {/* Final Publish Button */}
            <div className="text-center pt-4">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handlePublishListing}
                className="w-full sm:w-auto px-10 py-3.5 bg-primary text-white rounded-2xl font-bold text-base hover:bg-primary/95 transition shadow-md disabled:opacity-50"
              >
                {isSubmitting ? "Publishing listing..." : "Publish your listing to DARNA"}
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* AGENCY REGISTRATION FLOW (Steps A1 - A5)                 */}
        {/* ======================================================== */}
        {isAgencyFlow && (
          <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
            {/* Step A1: Business Basics */}
            {agencyStep === 1 && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <span className="text-xs uppercase tracking-wider text-secondary font-bold">
                    Agency Step 1 of 5
                  </span>
                  <h2 className="text-2xl font-bold text-primary font-serif">
                    Tell us about your tourism agency or fleet
                  </h2>
                </div>

                <div className="space-y-3 bg-white p-6 rounded-3xl border border-tertiary shadow-xs">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Registered Business Name
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Atlas Escapes Tourism SARL"
                      required
                      className="w-full px-3.5 py-2.5 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Business Category
                    </label>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary"
                    >
                      <option value="Licensed Tourism Agency">Licensed Tourism Agency (Agence de Voyage)</option>
                      <option value="Vehicle Rental Fleet">Vehicle Rental Fleet (Location de Voitures)</option>
                      <option value="Hotel & Residence Operator">Hotel & Residence Operator</option>
                      <option value="Sahara Expedition Outfitter">Sahara Expedition Outfitter</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step A2: Business Registration & Contact */}
            {agencyStep === 2 && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <span className="text-xs uppercase tracking-wider text-secondary font-bold">
                    Agency Step 2 of 5
                  </span>
                  <h2 className="text-2xl font-bold text-primary font-serif">
                    Business Registration & License
                  </h2>
                </div>

                <div className="space-y-3 bg-white p-6 rounded-3xl border border-tertiary shadow-xs">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Registre de Commerce (RC) / License Number
                    </label>
                    <input
                      type="text"
                      value={regNumber}
                      onChange={(e) => setRegNumber(e.target.value)}
                      placeholder="DZ-ALG-2024-B-XXXXX"
                      required
                      className="w-full px-3.5 py-2.5 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Official Business Email
                      </label>
                      <input
                        type="email"
                        value={businessEmail}
                        onChange={(e) => setBusinessEmail(e.target.value)}
                        placeholder="contact@agency.dz"
                        required
                        className="w-full px-3.5 py-2.5 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        value={businessPhone}
                        onChange={(e) => setBusinessPhone(e.target.value)}
                        placeholder="+213 21 XX XX XX"
                        required
                        className="w-full px-3.5 py-2.5 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      Headquarters Address
                    </label>
                    <input
                      type="text"
                      value={headquarters}
                      onChange={(e) => setHeadquarters(e.target.value)}
                      placeholder="Didouche Mourad, Algiers"
                      className="w-full px-3.5 py-2.5 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step A3: Team Size Estimate */}
            {agencyStep === 3 && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <span className="text-xs uppercase tracking-wider text-secondary font-bold">
                    Agency Step 3 of 5
                  </span>
                  <h2 className="text-2xl font-bold text-primary font-serif">
                    What is your agency team size?
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-white p-6 rounded-3xl border border-tertiary shadow-xs">
                  {(["1", "2-10", "11-50", "50+"] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setTeamSize(size)}
                      className={`p-4 rounded-2xl border-2 text-center font-bold text-sm transition ${
                        teamSize === size
                          ? "border-primary bg-primary text-white shadow-xs"
                          : "border-tertiary/70 bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
                      }`}
                    >
                      {size} members
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step A4: Invite Team Members (Skippable) */}
            {agencyStep === 4 && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <span className="text-xs uppercase tracking-wider text-secondary font-bold">
                    Agency Step 4 of 5
                  </span>
                  <h2 className="text-2xl font-bold text-primary font-serif">
                    Invite team managers & co-hosts
                  </h2>
                  <p className="text-xs text-neutral-500">
                    This step is optional. You can invite your booking team anytime.
                  </p>
                </div>

                <div className="space-y-3 bg-white p-6 rounded-3xl border border-tertiary shadow-xs">
                  {teamInvites.map((inv, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="email"
                        value={inv.email}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTeamInvites((prev) =>
                            prev.map((item, idx) => (idx === i ? { ...item, email: val } : item))
                          );
                        }}
                        placeholder="teammate@agency.dz"
                        className="flex-1 px-3 py-2 bg-neutral-50 border border-tertiary/70 rounded-xl text-xs text-primary"
                      />
                      <select
                        value={inv.role}
                        onChange={(e) => {
                          const role = e.target.value as "admin" | "manager";
                          setTeamInvites((prev) =>
                            prev.map((item, idx) => (idx === i ? { ...item, role } : item))
                          );
                        }}
                        className="px-2.5 py-2 bg-neutral-50 border border-tertiary/70 rounded-xl text-xs text-primary"
                      >
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      setTeamInvites((prev) => [...prev, { email: "", role: "manager" }])
                    }
                    className="text-xs font-semibold text-secondary flex items-center gap-1 hover:underline pt-1"
                  >
                    <HiOutlinePlus size={15} />
                    <span>Add another teammate</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step A5: Review & Confirm Agency */}
            {agencyStep === 5 && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <span className="text-xs uppercase tracking-wider text-secondary font-bold">
                    Agency Step 5 of 5
                  </span>
                  <h2 className="text-2xl font-bold text-primary font-serif">
                    Review and register agency
                  </h2>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-tertiary shadow-xs space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Agency Name:</span>
                    <span className="font-bold text-primary">{businessName || "Atlas Escapes"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">License Number:</span>
                    <span className="font-mono font-bold text-primary">{regNumber || "DZ-2024-B"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Business Email:</span>
                    <span className="text-primary">{businessEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Category:</span>
                    <span className="text-primary">{businessType}</span>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 mt-2">
                    <div className="font-bold flex items-center gap-1">
                      <HiOutlineShieldCheck size={16} />
                      <span>Verification Notice</span>
                    </div>
                    <div className="text-[11px] mt-0.5">
                      Your agency will receive a &ldquo;Pending Verification&rdquo; badge while our Algerian compliance team reviews your commercial register.
                    </div>
                  </div>

                  <div className="pt-3">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleRegisterAgency}
                      className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/95 transition shadow-sm disabled:opacity-50"
                    >
                      {isSubmitting ? "Registering agency..." : "Register Agency Workspace"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Sticky Navigation Bar */}
      <footer className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-tertiary/60 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        {/* Back Button */}
        <div>
          {isAgencyFlow ? (
            agencyStep > 1 ? (
              <button
                type="button"
                onClick={() => setAgencyStep((prev) => prev - 1)}
                className="inline-flex items-center gap-1 px-4 py-2 text-xs sm:text-sm font-semibold text-neutral-600 hover:text-primary transition"
              >
                <HiOutlineChevronLeft size={16} />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsAgencyFlow(false);
                  setCurrentStep(0);
                }}
                className="inline-flex items-center gap-1 px-4 py-2 text-xs sm:text-sm font-semibold text-neutral-600 hover:text-primary transition"
              >
                <HiOutlineChevronLeft size={16} />
                <span>Choose account type</span>
              </button>
            )
          ) : currentStep > 0 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="inline-flex items-center gap-1 px-4 py-2 text-xs sm:text-sm font-semibold text-neutral-600 hover:text-primary transition"
            >
              <HiOutlineChevronLeft size={16} />
              <span>Back</span>
            </button>
          ) : null}
        </div>

        {/* Step Indicator */}
        <div className="text-xs font-semibold text-neutral-400">
          {isAgencyFlow
            ? `Step ${agencyStep} of 5`
            : currentStep > 0
            ? `Step ${currentStep} of 12`
            : "Select host mode"}
        </div>

        {/* Next / Action Button */}
        <div>
          {isAgencyFlow ? (
            agencyStep < 5 ? (
              <button
                type="button"
                id="agency-next-btn"
                onClick={() => {
                  setAgencyStep((prev) => prev + 1);
                }}
                className="px-6 py-2 bg-primary text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-primary/95 transition shadow-xs cursor-pointer"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                id="agency-register-footer-btn"
                disabled={isSubmitting}
                onClick={handleRegisterAgency}
                className="px-6 py-2.5 bg-primary text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-primary/95 transition shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {isSubmitting ? "Registering agency..." : "Register Agency Workspace"}
              </button>
            )
          ) : currentStep > 0 && currentStep < 12 ? (
            <button
              type="button"
              id="individual-next-btn"
              onClick={() => {
                if (currentStep === 4 && (!city.trim() || !address.trim())) {
                  toast.error("Please provide city and street address.");
                  return;
                }
                if (currentStep === 8 && !title.trim()) {
                  toast.error("Please write a catchy listing title.");
                  return;
                }
                setCurrentStep((prev) => prev + 1);
              }}
              className="px-6 py-2 bg-primary text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-primary/95 transition shadow-xs cursor-pointer"
            >
              Next
            </button>
          ) : currentStep === 12 ? (
            <button
              type="button"
              id="individual-publish-footer-btn"
              disabled={isSubmitting}
              onClick={handlePublishListing}
              className="px-6 py-2.5 bg-primary text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-primary/95 transition shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? "Publishing listing..." : "Publish your listing to DARNA"}
            </button>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
