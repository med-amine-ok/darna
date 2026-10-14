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
import ConfirmDialog from "@/components/models/ConfirmDialog";
import { getOnboardingSteps } from "@/lib/data/onboarding-config";
import { OnboardingStepConfig } from "@/types";
import DynamicStepFields from "./DynamicStepFields";
import {
  InstantBookingIcon,
  RequestReviewIcon,
  BrandStarIcon,
  BrandUserIcon,
  BrandChevronRightIcon,
  BrandChevronLeftIcon,
  BrandCompassIcon,
  BrandBuildingIcon,
  BrandBedIcon,
  CategoryHouseIcon,
  CategoryRiadIcon,
  BrandWaterIcon,
  BrandSunIcon,
  CategoryVehicleIcon,
  BrandSparklesIcon,
  BrandWifiIcon,
  BrandSnowIcon,
  BrandKitchenIcon,
  BrandFlameIcon,
  BrandTrashIcon,
  BrandPinIcon,
  BrandPlusIcon,
  BrandShieldIcon,
  BrandCheckIcon,
} from "@/components/icons";

// Dynamically import Map to prevent SSR errors
const Map = dynamic(() => import("@/components/Map"), { ssr: false });

interface BecomeHostFlowProps {
  initialStep?: string;
  initialHostType?: "individual" | "agency" | "hotel" | "hostel" | null;
}

export default function BecomeHostFlow({
  initialStep = "0",
  initialHostType = null,
}: BecomeHostFlowProps) {
  const router = useRouter();
  const loginModal = useLoginModal();

  // Mode: "none" (host type selection), "individual" (12 steps), "agency" (5 steps), "hotel" (7 steps), "hostel" (7 steps)
  const [currentStep, setCurrentStep] = useState<number>(() => {
    const parsed = parseInt(initialStep, 10);
    return isNaN(parsed) ? 0 : parsed;
  });

  const [hostType, setHostType] = useState<"individual" | "agency" | "hotel" | "hostel" | null>(
    initialHostType
  );
  const [activeFlow, setActiveFlow] = useState<"none" | "individual" | "agency" | "hotel" | "hostel">(() => {
    if (initialStep === "agency") return "agency";
    if (initialStep === "hotel") return "hotel";
    if (initialStep === "hostel") return "hostel";
    const parsed = parseInt(initialStep, 10);
    if (!isNaN(parsed) && parsed > 0) return "individual";
    return "none";
  });

  const isAgencyFlow = activeFlow === "agency";
  const isHotelFlow = activeFlow === "hotel";
  const isHostelFlow = activeFlow === "hostel";

  // Dynamic Onboarding Config State (Section 7)
  const [configuredSteps, setConfiguredSteps] = useState<OnboardingStepConfig[]>([]);
  const [customFieldsData, setCustomFieldsData] = useState<Record<string, any>>({});

  useEffect(() => {
    const currentHostType =
      hostType ||
      (isHotelFlow
        ? "hotel"
        : isHostelFlow
        ? "hostel"
        : isAgencyFlow
        ? "agency"
        : "individual");
    setConfiguredSteps(getOnboardingSteps(currentHostType));
  }, [hostType, activeFlow, isAgencyFlow, isHotelFlow, isHostelFlow]);

  const renderDynamicFieldsForStep = (stepId: string) => {
    const stepCfg = configuredSteps.find((s) => s.id === stepId);
    if (!stepCfg) return null;
    const extraFields = stepCfg.fields.filter((f) => !f.isCore);
    if (extraFields.length === 0) return null;
    return (
      <DynamicStepFields
        fields={extraFields}
        values={customFieldsData}
        onChange={(fieldId, val) =>
          setCustomFieldsData((prev) => ({ ...prev, [fieldId]: val }))
        }
      />
    );
  };

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

  // Hotel Registration Form State (Section 2)
  const [hotelStep, setHotelStep] = useState<number>(1);
  const [hotelName, setHotelName] = useState<string>("El Djazair Grand Palace Hotel");
  const [hotelStarRating, setHotelStarRating] = useState<number>(5);
  const [hotelTotalRooms, setHotelTotalRooms] = useState<number>(48);
  const [checkInTime, setCheckInTime] = useState<string>("15:00");
  const [checkOutTime, setCheckOutTime] = useState<string>("12:00");
  const [hotelAmenities, setHotelAmenities] = useState<string[]>([
    "breakfast",
    "pool",
    "spa",
    "wifi",
    "valet",
    "conference",
    "reception_24_7",
    "shuttle",
  ]);
  const [hotelRegNumber, setHotelRegNumber] = useState<string>("DZ-ALG-2023-B-04192");
  const [hotelTaxId, setHotelTaxId] = useState<string>("002316098765432");
  const [hotelAddress, setHotelAddress] = useState<string>("24 Avenue Souidani Boujemaa, Algiers");
  const [hotelCity, setHotelCity] = useState<string>("Algiers");
  const [hotelWilaya, setHotelWilaya] = useState<string>("Algiers");
  const [hotelLatlng, setHotelLatlng] = useState<[number, number]>([36.7538, 3.0588]);
  const [hotelPhotos, setHotelPhotos] = useState<string[]>([
    "/assets/hero.jpg",
    "/assets/oran.jpg",
    "/assets/constantine.jpg",
    "/assets/tipaza.jpg",
  ]);
  const [hotelCustomPhotoUrl, setHotelCustomPhotoUrl] = useState<string>("");
  const [hotelPhone, setHotelPhone] = useState<string>("+213 21 69 21 21");
  const [hotelEmail, setHotelEmail] = useState<string>("reservations@hoteldjazair.dz");
  const [hotelBookingMode, setHotelBookingMode] = useState<"instant" | "request">("instant");
  const [hotelTeamInvites, setHotelTeamInvites] = useState<{ email: string; role: "admin" | "manager" }[]>([
    { email: "", role: "manager" },
  ]);

  // Hostel Registration Form State (Section 2)
  const [hostelStep, setHostelStep] = useState<number>(1);
  const [hostelName, setHostelName] = useState<string>("Casbah Heritage Backpacker Hostel");
  const [hostelCity, setHostelCity] = useState<string>("Algiers");
  const [hostelWilaya, setHostelWilaya] = useState<string>("Algiers");
  const [hostelAddress, setHostelAddress] = useState<string>("12 Rue Sidi Ramdane, Casbah, Algiers");
  const [hostelLatlng, setHostelLatlng] = useState<[number, number]>([36.7865, 3.0592]);
  const [hostelPhotos, setHostelPhotos] = useState<string[]>([
    "/assets/hero.jpg",
    "/assets/tipaza.jpg",
    "/assets/oran.jpg",
    "/assets/constantine.jpg",
  ]);
  const [hostelCustomPhotoUrl, setHostelCustomPhotoUrl] = useState<string>("");
  const [hostelDormBeds, setHostelDormBeds] = useState<number>(24);
  const [hostelPrivateRooms, setHostelPrivateRooms] = useState<number>(4);
  const [hostelTotalBeds, setHostelTotalBeds] = useState<number>(28);
  const [hostelFacilities, setHostelFacilities] = useState<string[]>([
    "lockers",
    "shared_kitchen",
    "rooftop",
    "coworking",
    "wifi",
    "luggage_storage",
    "breakfast",
  ]);
  const [curfewPolicy, setCurfewPolicy] = useState<string>("No curfew · 24h keycard access");
  const [agePolicy, setAgePolicy] = useState<string>("All ages welcome (min 18 in dorms)");
  const [hostelRegNumber, setHostelRegNumber] = useState<string>("DZ-ALG-2024-B-07114");
  const [hostelTaxId, setHostelTaxId] = useState<string>("002416098877112");
  const [hostelEmail, setHostelEmail] = useState<string>("hello@casbahhostel.dz");
  const [hostelPhone, setHostelPhone] = useState<string>("+213 21 73 88 19");
  const [hostelBookingMode, setHostelBookingMode] = useState<"instant" | "request">("instant");
  const [hostelTeamInvites, setHostelTeamInvites] = useState<{ email: string; role: "admin" | "manager" }[]>([
    { email: "", role: "manager" },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);

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
            if (draft.activeFlow) {
              setActiveFlow(draft.activeFlow);
            } else if (draft.isAgencyFlow) {
              setActiveFlow("agency");
            }
            if (draft.agencyStep) setAgencyStep(draft.agencyStep);
            if (draft.hotelStep) setHotelStep(draft.hotelStep);
            if (draft.hostelStep) setHostelStep(draft.hostelStep);
            if (draft.currentStep && draft.currentStep > 0) setCurrentStep(draft.currentStep);
            if (draft.customFieldsData) setCustomFieldsData(draft.customFieldsData);
          }
        } catch {}
      }
    }
  }, [initialStep]);

  const handleHeaderExitClick = () => {
    if (currentStep > 0 || isAgencyFlow || isHotelFlow || isHostelFlow) {
      setIsExitDialogOpen(true);
    } else {
      router.push("/");
    }
  };

  const handleExecuteSaveAndExit = () => {
    if (typeof window !== "undefined") {
      const draft = {
        hostType,
        activeFlow,
        isAgencyFlow,
        isHotelFlow,
        isHostelFlow,
        currentStep: activeFlow !== "individual" ? 0 : currentStep,
        agencyStep,
        hotelStep,
        hostelStep,
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
        hotelName,
        hotelStarRating,
        hotelTotalRooms,
        checkInTime,
        checkOutTime,
        hotelAmenities,
        hotelRegNumber,
        hotelTaxId,
        hotelAddress,
        hotelCity,
        hotelPhone,
        hotelEmail,
        hotelBookingMode,
        hotelTeamInvites,
        hostelName,
        hostelCity,
        hostelAddress,
        hostelDormBeds,
        hostelPrivateRooms,
        hostelTotalBeds,
        hostelFacilities,
        curfewPolicy,
        agePolicy,
        hostelRegNumber,
        hostelTaxId,
        hostelEmail,
        hostelPhone,
        hostelBookingMode,
        hostelTeamInvites,
        customFieldsData,
      };
      localStorage.setItem("darna_host_draft", JSON.stringify(draft));
      toast.info("Progress saved as draft in your browser.");
      setIsExitDialogOpen(false);
      router.push("/");
    }
  };

  const handleExecuteDiscard = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("darna_host_draft");
      toast.info("Unsaved changes discarded.");
      setIsExitDialogOpen(false);
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

  const handleAddHotelPhoto = () => {
    if (!hotelCustomPhotoUrl.trim()) return;
    setHotelPhotos((prev) => [...prev, hotelCustomPhotoUrl.trim()]);
    setHotelCustomPhotoUrl("");
    toast.success("Photo added to hotel gallery!");
  };

  const handleRemoveHotelPhoto = (index: number) => {
    if (hotelPhotos.length <= 1) {
      toast.error("Hotel gallery must have at least one photo.");
      return;
    }
    setHotelPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddHostelPhoto = () => {
    if (!hostelCustomPhotoUrl.trim()) return;
    setHostelPhotos((prev) => [...prev, hostelCustomPhotoUrl.trim()]);
    setHostelCustomPhotoUrl("");
    toast.success("Photo added to hostel gallery!");
  };

  const handleRemoveHostelPhoto = (index: number) => {
    if (hostelPhotos.length <= 1) {
      toast.error("Hostel gallery must have at least one photo.");
      return;
    }
    setHostelPhotos((prev) => prev.filter((_, i) => i !== index));
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
        bookingApprovalMode: (instantBook ? "instant" : "request") as "instant" | "request",
        cancellationPolicy,
        ownerType: "individual" as const,
        hostUserId: hostId,
        customFields: customFieldsData,
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
      await updateUserHostStatus(hostId, {
        hostType: "individual",
        bookingApprovalMode: instantBook ? "instant" : "request",
      });

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
        customFields: customFieldsData,
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

  const handleRegisterHotel = async () => {
    setIsSubmitting(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.info("Please log in to register a hotel.");
        loginModal.onOpen();
        setIsSubmitting(false);
        return;
      }
      const hostId = user.id;
      const validInvites = hotelTeamInvites.filter((inv) => inv.email.trim());
      const hotelPayload = {
        name: hotelName.trim() || "El Djazair Grand Palace Hotel",
        businessRegistrationNumber: hotelRegNumber.trim() || "DZ-ALG-2023-B-04192",
        businessType: "Hotel & Resort",
        businessEmail: hotelEmail.trim() || "reservations@hoteldjazair.dz",
        businessPhone: hotelPhone.trim() || "+213 21 69 21 21",
        address: hotelAddress.trim() || "24 Avenue Souidani Boujemaa, Algiers",
        ownerUserId: hostId,
        teamSizeEstimate: "11-50" as const,
        invitedMembers: validInvites,
        hotelStarRating,
        totalRoomCount: hotelTotalRooms,
        checkInTime,
        checkOutTime,
        hotelAmenities,
        bookingApprovalMode: hotelBookingMode,
        customFields: customFieldsData,
      };

      let orgId = `org_${Date.now()}`;
      try {
        const res = await fetch("/api/host/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hostType: "hotel",
            userId: hostId,
            agency: hotelPayload,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.organization?.id) orgId = data.organization.id;
        }
      } catch (e) {
        console.error("API error", e);
      }

      const org = await createOrganization({
        ...hotelPayload,
        businessCategory: "hotel",
        verificationStatus: "verified",
      });
      const finalOrgId = orgId || org.id;

      // Register the hotel property listing in public search & map
      const finalHotelPhotos = hotelPhotos.length >= 4 ? hotelPhotos : [
        "/assets/hero.jpg",
        "/assets/oran.jpg",
        "/assets/constantine.jpg",
        "/assets/tipaza.jpg",
      ];
      await createListing({
        title: hotelName.trim() || "El Djazair Grand Palace Hotel",
        description: `${hotelName.trim() || "El Djazair Grand Palace Hotel"} offers exceptional hospitality in ${hotelCity || "Algiers"}, ${hotelWilaya || "Algiers"}. Featuring luxury room options, 24/7 reception, gourmet dining and curated Algerian experiences.`,
        price: 24000,
        category: "home",
        type: "Hotel",
        city: `${hotelCity || "Algiers"}, ${hotelWilaya || "Algiers"}`,
        locationValue: hotelWilaya || "Algiers",
        country: "Algeria",
        imageSrc: finalHotelPhotos,
        guestCount: 2,
        bedroomCount: hotelTotalRooms,
        roomCount: hotelTotalRooms,
        bathroomCount: hotelTotalRooms,
        amenities: hotelAmenities,
        latlng: hotelLatlng,
        instantBook: hotelBookingMode === "instant",
        bookingApprovalMode: hotelBookingMode,
        cancellationPolicy: "flexible",
        ownerType: "organization",
        hostUserId: hostId,
        organizationId: finalOrgId,
        businessCategory: "hotel",
        hotelStarRating: hotelStarRating,
        roomTypes: [
          {
            id: `rt_${Date.now()}_1`,
            propertyListingId: finalOrgId,
            name: "Standard Deluxe Room",
            capacity: 2,
            price: 24000,
            basePrice: 24000,
            description: "Comfortable double room with city view, king bed and marble bath.",
            amenities: ["wifi", "air_conditioning", "breakfast"],
            bookingUnit: "room",
            imageSrc: finalHotelPhotos.slice(0, 2),
            inventoryCount: 20,
            totalInventory: 20,
          },
          {
            id: `rt_${Date.now()}_2`,
            propertyListingId: finalOrgId,
            name: "Executive Sea View Suite",
            capacity: 3,
            price: 42000,
            basePrice: 42000,
            description: "Spacious luxury suite with separate sitting lounge and panoramic views.",
            amenities: ["wifi", "air_conditioning", "breakfast", "pool", "spa"],
            bookingUnit: "room",
            imageSrc: finalHotelPhotos.slice(1, 3),
            inventoryCount: 8,
            totalInventory: 8,
          },
        ],
      });

      await updateUserHostStatus(hostId, {
        hostType: "hotel",
        organizationId: finalOrgId,
      });

      if (typeof window !== "undefined") {
        localStorage.removeItem("darna_host_draft");
        localStorage.setItem("darna_mode", "host");
        localStorage.setItem("darna_agency_id", finalOrgId);
        document.cookie = `darna_agency_id=${finalOrgId}; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `darna_user_id=${hostId}; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = "darna_host_type=hotel; path=/; max-age=31536000; SameSite=Lax";
        document.cookie = "darna_mode=host; path=/; max-age=31536000; SameSite=Lax";
      }

      toast.success("Hotel workspace registered! Welcome to DARNA.");
      const currentLocale = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : "en";
      const localePrefix = ["en", "fr", "ar"].includes(currentLocale) ? `/${currentLocale}` : "/en";
      window.location.href = `${localePrefix}/host`;
    } catch {
      toast.error("Failed to register hotel workspace.");
      setIsSubmitting(false);
    }
  };

  const handleRegisterHostel = async () => {
    setIsSubmitting(true);
    try {
      const user = await getCurrentUser();
      if (!user) {
        toast.info("Please log in to register a hostel.");
        loginModal.onOpen();
        setIsSubmitting(false);
        return;
      }
      const hostId = user.id;
      const validInvites = hostelTeamInvites.filter((inv) => inv.email.trim());
      const hostelPayload = {
        name: hostelName.trim() || "Casbah Heritage Backpacker Hostel",
        businessRegistrationNumber: hostelRegNumber.trim() || "DZ-ALG-2024-B-07114",
        businessType: "Hostel & Backpacker Accommodation",
        businessEmail: hostelEmail.trim() || "hello@casbahhostel.dz",
        businessPhone: hostelPhone.trim() || "+213 21 73 88 19",
        address: hostelAddress.trim() || "12 Rue Sidi Ramdane, Casbah, Algiers",
        ownerUserId: hostId,
        teamSizeEstimate: "2-10" as const,
        invitedMembers: validInvites,
        totalRoomCount: hostelTotalBeds,
        hostelFacilities,
        curfewPolicy,
        agePolicy,
        bookingApprovalMode: hostelBookingMode,
        customFields: customFieldsData,
      };

      let orgId = `org_${Date.now()}`;
      try {
        const res = await fetch("/api/host/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            hostType: "hostel",
            userId: hostId,
            agency: hostelPayload,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.organization?.id) orgId = data.organization.id;
        }
      } catch (e) {
        console.error("API error", e);
      }

      const org = await createOrganization({
        ...hostelPayload,
        businessCategory: "hostel",
        verificationStatus: "verified",
      });
      const finalOrgId = orgId || org.id;

      // Register the hostel property listing in public search & map
      const finalHostelPhotos = hostelPhotos.length >= 4 ? hostelPhotos : [
        "/assets/hero.jpg",
        "/assets/tipaza.jpg",
        "/assets/oran.jpg",
        "/assets/constantine.jpg",
      ];
      await createListing({
        title: hostelName.trim() || "Casbah Heritage Backpacker Hostel",
        description: `${hostelName.trim() || "Casbah Heritage Backpacker Hostel"} is a vibrant traveler community located in the historic heart of ${hostelCity || "Algiers"}. Enjoy panoramic rooftop views, shared kitchen, and cultural social evenings.`,
        price: 3200,
        category: "home",
        type: "Hostel",
        city: `${hostelCity || "Algiers"}, ${hostelWilaya || "Algiers"}`,
        locationValue: hostelWilaya || "Algiers",
        country: "Algeria",
        imageSrc: finalHostelPhotos,
        guestCount: hostelTotalBeds,
        bedroomCount: hostelPrivateRooms + 4,
        roomCount: hostelTotalBeds,
        bathroomCount: 6,
        amenities: hostelFacilities,
        latlng: hostelLatlng,
        instantBook: hostelBookingMode === "instant",
        bookingApprovalMode: hostelBookingMode,
        cancellationPolicy: "flexible",
        ownerType: "organization",
        hostUserId: hostId,
        organizationId: finalOrgId,
        businessCategory: "hostel",
        roomTypes: [
          {
            id: `rt_dorm_${Date.now()}`,
            propertyListingId: finalOrgId,
            name: "6-Bed Mixed Dormitory Bed",
            capacity: 1,
            price: 3200,
            basePrice: 3200,
            description: "Individual bunk bed in a spacious, climate-controlled 6-bed dormitory with privacy curtain and personal secure locker.",
            amenities: ["wifi", "air_conditioning", "shared_kitchen", "lockers"],
            bookingUnit: "bed",
            imageSrc: finalHostelPhotos.slice(0, 2),
            inventoryCount: 18,
            totalInventory: 18,
          },
          {
            id: `rt_priv_${Date.now()}`,
            propertyListingId: finalOrgId,
            name: "Private Double Room (Ensuite)",
            capacity: 2,
            price: 7800,
            basePrice: 7800,
            description: "Cozy private room with queen bed, ensuite shower, desk, and peaceful courtyard view.",
            amenities: ["wifi", "air_conditioning", "breakfast"],
            bookingUnit: "room",
            imageSrc: finalHostelPhotos.slice(1, 3),
            inventoryCount: 4,
            totalInventory: 4,
          },
        ],
      });

      await updateUserHostStatus(hostId, {
        hostType: "hostel",
        organizationId: finalOrgId,
      });

      if (typeof window !== "undefined") {
        localStorage.removeItem("darna_host_draft");
        localStorage.setItem("darna_mode", "host");
        localStorage.setItem("darna_agency_id", finalOrgId);
        document.cookie = `darna_agency_id=${finalOrgId}; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = `darna_user_id=${hostId}; path=/; max-age=31536000; SameSite=Lax`;
        document.cookie = "darna_host_type=hostel; path=/; max-age=31536000; SameSite=Lax";
        document.cookie = "darna_mode=host; path=/; max-age=31536000; SameSite=Lax";
      }

      toast.success("Hostel workspace registered! Welcome to DARNA.");
      const currentLocale = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : "en";
      const localePrefix = ["en", "fr", "ar"].includes(currentLocale) ? `/${currentLocale}` : "/en";
      window.location.href = `${localePrefix}/host`;
    } catch {
      toast.error("Failed to register hostel workspace.");
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
    { label: "Villa", vertical: "home" as const, icon: CategoryHouseIcon },
    { label: "Casbah Heritage House", vertical: "home" as const, icon: CategoryRiadIcon },
    { label: "Seaside Apartment", vertical: "home" as const, icon: BrandWaterIcon },
    { label: "Saharan Ksar", vertical: "home" as const, icon: BrandSunIcon },
    { label: "Desert Camp", vertical: "home" as const, icon: BrandCompassIcon },
    { label: "4x4 Land Cruiser SUV", vertical: "vehicle" as const, icon: CategoryVehicleIcon },
    { label: "Sahara 4x4 Expedition", vertical: "experience" as const, icon: BrandCompassIcon },
    { label: "Casbah Architecture Tour", vertical: "experience" as const, icon: BrandSparklesIcon },
  ];

  const amenitiesList = [
    { id: "wifi", label: "Fast WiFi", icon: BrandWifiIcon },
    { id: "air_conditioning", label: "Air Conditioning (Climatisation)", icon: BrandSnowIcon },
    { id: "kitchen", label: "Equipped Kitchen", icon: BrandKitchenIcon },
    { id: "free_parking", label: "Free Parking on Premises", icon: CategoryVehicleIcon },
    { id: "sea_view", label: "Mediterranean Sea View", icon: BrandWaterIcon },
    { id: "traditional_patio", label: "Traditional Central Patio", icon: BrandSparklesIcon },
    { id: "pool", label: "Private Swimming Pool", icon: BrandWaterIcon },
    { id: "sahara_fireplace", label: "Sahara Campfire & Fireplace", icon: BrandFlameIcon },
  ];

  // Calculate Progress Percentage dynamically from configured active steps
  const activeStepsCount = Math.max(
    configuredSteps.filter((s) => s.isActive).length,
    1
  );

  const currentStepNumber = isHotelFlow
    ? hotelStep
    : isHostelFlow
    ? hostelStep
    : isAgencyFlow
    ? agencyStep
    : currentStep;

  const progressPercent =
    currentStep === 0 && !isAgencyFlow && !isHotelFlow && !isHostelFlow
      ? 0
      : Math.min(100, Math.round((currentStepNumber / activeStepsCount) * 100));

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
            {isHotelFlow
              ? "Hotel Registration"
              : isHostelFlow
              ? "Hostel Registration"
              : isAgencyFlow
              ? "Agency Registration"
              : "Become a Host"}
          </span>
        </div>

        <button
          type="button"
          onClick={handleHeaderExitClick}
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
        {/* STEP 0: 4-WAY HOST-TYPE SELECTION (Section 2)            */}
        {/* ======================================================== */}
        {currentStep === 0 && !isAgencyFlow && !isHotelFlow && !isHostelFlow && (
          <div className="space-y-8 animate-in fade-in">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <span className="text-xs uppercase tracking-wider text-secondary font-bold">
                Step 1 of 2 · Partner Account Type
              </span>
              <h1 className="text-2xl sm:text-4xl font-bold text-primary font-serif">
                How do you plan to host on DARNA?
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500">
                Choose the hosting model that best reflects your Algerian properties, fleet, or hospitality establishment.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-4xl mx-auto pt-2">
              {/* 1. Individual Card */}
              <div
                id="choose-individual-card"
                onClick={() => {
                  setHostType("individual");
                  setActiveFlow("individual");
                  setCurrentStep(1);
                }}
                className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-tertiary hover:border-primary hover:shadow-lg transition cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-13 h-13 bg-tertiary/30 text-primary rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition">
                      <BrandUserIcon size={26} />
                    </div>
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                      Solo Host
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-primary">Individual Host</h3>
                    <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                      You are an individual hosting your private villa, Casbah apartment, Sahara tent, or personal 4x4. Dedicated lightweight workspace.
                    </p>
                  </div>
                </div>
                <div className="pt-5 mt-4 border-t border-tertiary/40 flex items-center justify-between text-xs font-bold text-primary">
                  <span>Continue as Individual</span>
                  <BrandChevronRightIcon size={18} className="group-hover:translate-x-1 transition rtl:rotate-180" />
                </div>
              </div>

              {/* 2. Agency Card */}
              <div
                id="choose-agency-card"
                onClick={() => {
                  setHostType("agency");
                  setActiveFlow("agency");
                  setAgencyStep(1);
                }}
                className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-tertiary hover:border-primary hover:shadow-lg transition cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-13 h-13 bg-tertiary/30 text-primary rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition">
                      <BrandCompassIcon size={26} />
                    </div>
                    <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">
                      Agency Fleet
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-primary">Tourism Agency / Fleet</h3>
                    <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                      Licensed Algerian travel agency, excursions operator, or car rental fleet with staff, multi-day tours, and fleet management.
                    </p>
                  </div>
                </div>
                <div className="pt-5 mt-4 border-t border-tertiary/40 flex items-center justify-between text-xs font-bold text-primary">
                  <span>Register Agency Workspace</span>
                  <BrandChevronRightIcon size={18} className="group-hover:translate-x-1 transition rtl:rotate-180" />
                </div>
              </div>

              {/* 3. Hotel Card */}
              <div
                id="choose-hotel-card"
                onClick={() => {
                  setHostType("hotel");
                  setActiveFlow("hotel");
                  setHotelStep(1);
                }}
                className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-tertiary hover:border-primary hover:shadow-lg transition cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-13 h-13 bg-tertiary/30 text-primary rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition">
                      <BrandBuildingIcon size={26} />
                    </div>
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-bold">
                      Hotel & Resort
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-primary">Hotel & Resort</h3>
                    <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                      Multi-room boutique hotel, heritage palace, or luxury resort. Manage multiple room types, front desk check-in, and high-volume calendar.
                    </p>
                  </div>
                </div>
                <div className="pt-5 mt-4 border-t border-tertiary/40 flex items-center justify-between text-xs font-bold text-primary">
                  <span>Register Hotel Property</span>
                  <BrandChevronRightIcon size={18} className="group-hover:translate-x-1 transition rtl:rotate-180" />
                </div>
              </div>

              {/* 4. Hostel Card */}
              <div
                id="choose-hostel-card"
                onClick={() => {
                  setHostType("hostel");
                  setActiveFlow("hostel");
                  setHostelStep(1);
                }}
                className="bg-white rounded-3xl p-6 sm:p-7 border-2 border-tertiary hover:border-primary hover:shadow-lg transition cursor-pointer flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-13 h-13 bg-tertiary/30 text-primary rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:text-white transition">
                      <BrandBedIcon size={26} />
                    </div>
                    <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full text-[10px] font-bold">
                      Hostel & Beds
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-primary">Hostel & Community</h3>
                    <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                      Shared dorm rooms, per-bed booking, private rooms, communal kitchen, lockers, and social backpacker atmosphere.
                    </p>
                  </div>
                </div>
                <div className="pt-5 mt-4 border-t border-tertiary/40 flex items-center justify-between text-xs font-bold text-primary">
                  <span>Register Hostel Property</span>
                  <BrandChevronRightIcon size={18} className="group-hover:translate-x-1 transition rtl:rotate-180" />
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
                    {Icon ? (
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
            {renderDynamicFieldsForStep("category_vertical")}
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
            {renderDynamicFieldsForStep("placement")}
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
            {renderDynamicFieldsForStep("location")}
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
            {renderDynamicFieldsForStep("capacity")}
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
            {renderDynamicFieldsForStep("amenities")}
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
                    <BrandTrashIcon size={14} />
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
            {renderDynamicFieldsForStep("photos")}
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
            {renderDynamicFieldsForStep("title_description")}
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
            {renderDynamicFieldsForStep("pricing")}
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
              {renderDynamicFieldsForStep("approval_mode")}
              {renderDynamicFieldsForStep("policies")}
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
                      <BrandPinIcon size={15} className="text-secondary" />
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
                    <BrandPlusIcon size={15} />
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
                      <BrandShieldIcon size={16} />
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
                      className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/95 transition shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? "Registering agency..." : "Register Agency Workspace"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* HOTEL REGISTRATION FLOW (Steps H1 - H7)                   */}
        {/* ======================================================== */}
        {isHotelFlow && (
          <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
            {/* Step H1: Hotel Name & Star Rating */}
            {hotelStep === 1 && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <span className="text-xs uppercase tracking-wider text-secondary font-bold">
                    Hotel Step 1 of 7 · Property Identity
                  </span>
                  <h2 className="text-2xl font-bold text-primary font-serif">
                    Tell us about your Hotel or Resort
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Enter the official property name and verified Algerian hotel classification.
                  </p>
                </div>

                <div className="space-y-4 bg-white p-6 rounded-3xl border border-tertiary shadow-xs">
                  <div>
                    <label className="block text-xs font-bold text-primary mb-1">
                      Hotel / Resort Name
                    </label>
                    <input
                      type="text"
                      value={hotelName}
                      onChange={(e) => setHotelName(e.target.value)}
                      placeholder="e.g. El Djazair Grand Palace Hotel"
                      className="w-full px-3.5 py-2.5 bg-neutral-50 border border-tertiary/70 rounded-xl text-xs sm:text-sm text-primary focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-primary mb-1">
                      Star Rating Classification
                    </label>
                    <div className="grid grid-cols-5 gap-2 pt-1">
                      {[1, 2, 3, 4, 5].map((stars) => (
                        <button
                          key={stars}
                          type="button"
                          onClick={() => setHotelStarRating(stars)}
                          className={`py-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition ${
                            hotelStarRating === stars
                              ? "border-primary bg-primary text-white shadow-xs"
                              : "border-tertiary/70 bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
                          }`}
                        >
                          <div className="flex items-center text-accent">
                            {Array.from({ length: stars }).map((_, i) => (
                              <BrandStarIcon key={i} size={13} className="fill-accent text-accent" />
                            ))}
                          </div>
                          <span className="text-[11px] font-bold">
                            {stars} Star{stars > 1 ? "s" : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step H2: Business Details, Scale & Facilities */}
            {hotelStep === 2 && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <span className="text-xs uppercase tracking-wider text-secondary font-bold">
                    Hotel Step 2 of 7 · Details & Facilities
                  </span>
                  <h2 className="text-2xl font-bold text-primary font-serif">
                    Registration, Timings & Amenities
                  </h2>
                </div>

                <div className="space-y-4 bg-white p-6 rounded-3xl border border-tertiary shadow-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-primary mb-1">
                        Commercial Register (DZ-RC)
                      </label>
                      <input
                        type="text"
                        value={hotelRegNumber}
                        onChange={(e) => setHotelRegNumber(e.target.value)}
                        placeholder="DZ-ALG-2023-B-04192"
                        className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/70 rounded-xl text-xs text-primary font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-primary mb-1">
                        Fiscal ID (NIF)
                      </label>
                      <input
                        type="text"
                        value={hotelTaxId}
                        onChange={(e) => setHotelTaxId(e.target.value)}
                        placeholder="002316098765432"
                        className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/70 rounded-xl text-xs text-primary font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-primary mb-1">
                        Check-in Time
                      </label>
                      <input
                        type="text"
                        value={checkInTime}
                        onChange={(e) => setCheckInTime(e.target.value)}
                        placeholder="15:00"
                        className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/70 rounded-xl text-xs text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-primary mb-1">
                        Check-out Time
                      </label>
                      <input
                        type="text"
                        value={checkOutTime}
                        onChange={(e) => setCheckOutTime(e.target.value)}
                        placeholder="12:00"
                        className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/70 rounded-xl text-xs text-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-primary mb-1">
                        Reservations Email
                      </label>
                      <input
                        type="email"
                        value={hotelEmail}
                        onChange={(e) => setHotelEmail(e.target.value)}
                        placeholder="reservations@hoteldjazair.dz"
                        className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/70 rounded-xl text-xs text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-primary mb-1">
                        Reception Phone
                      </label>
                      <input
                        type="tel"
                        value={hotelPhone}
                        onChange={(e) => setHotelPhone(e.target.value)}
                        placeholder="+213 21 69 21 21"
                        className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/70 rounded-xl text-xs text-primary font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-primary mb-2">
                      Property Amenities
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: "breakfast", label: "Breakfast Buffet" },
                        { id: "pool", label: "Swimming Pool" },
                        { id: "spa", label: "Spa & Hammam" },
                        { id: "wifi", label: "High-Speed WiFi" },
                        { id: "valet", label: "Valet Parking" },
                        { id: "conference", label: "Conference Room" },
                        { id: "reception_24_7", label: "24/7 Front Desk" },
                        { id: "shuttle", label: "Airport Shuttle" },
                      ].map((amenity) => {
                        const isSelected = hotelAmenities.includes(amenity.id);
                        return (
                          <button
                            key={amenity.id}
                            type="button"
                            onClick={() => {
                              setHotelAmenities((prev) =>
                                isSelected ? prev.filter((a) => a !== amenity.id) : [...prev, amenity.id]
                              );
                            }}
                            className={`p-2.5 rounded-xl border text-start flex items-center justify-between text-xs font-medium transition ${
                              isSelected
                                ? "border-primary bg-primary/5 text-primary font-bold"
                                : "border-tertiary/70 bg-neutral-50 text-neutral-600 hover:border-neutral-400"
                            }`}
                          >
                            <span className="truncate">{amenity.label}</span>
                            {isSelected && <BrandCheckIcon size={14} className="text-primary shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step H3: Location & Map Pin Picker */}
            {hotelStep === 3 && (
              <div className="space-y-5 animate-in fade-in">
                <div className="text-center space-y-1">
                  <span className="text-xs uppercase tracking-wider text-secondary font-bold">
                    Hotel Step 3 of 7 · Property Location
                  </span>
                  <h2 className="text-2xl font-bold text-primary font-serif">
                    Where is your Hotel located?
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Set your coordinates so guests can find your hotel on the interactive map.
                  </p>
                </div>

                <div className="space-y-4 bg-white p-6 rounded-3xl border border-tertiary shadow-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-primary mb-1">
                        Wilaya (Province)
                      </label>
                      <select
                        value={hotelWilaya}
                        onChange={(e) => {
                          const sel = wilayasAlgeria.find((w) => w.name === e.target.value);
                          if (sel) {
                            setHotelWilaya(sel.name);
                            setHotelLatlng(sel.latlng);
                          }
                        }}
                        className="w-full px-3.5 py-2.5 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary"
                      >
                        {wilayasAlgeria.map((w) => (
                          <option key={w.name} value={w.name}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-primary mb-1">
                        City / Neighborhood
                      </label>
                      <input
                        type="text"
                        value={hotelCity}
                        onChange={(e) => setHotelCity(e.target.value)}
                        placeholder="e.g. Hydra, Didouche Mourad"
                        className="w-full px-3.5 py-2.5 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-primary mb-1">
                      Exact Street Address
                    </label>
                    <input
                      type="text"
                      value={hotelAddress}
                      onChange={(e) => setHotelAddress(e.target.value)}
                      placeholder="e.g. 24 Avenue Souidani Boujemaa"
                      className="w-full px-3.5 py-2.5 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary"
                    />
                  </div>

                  {/* Interactive Map */}
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-xs font-bold text-primary">
                      Map Pin Position
                    </label>
                    <div className="rounded-2xl overflow-hidden border border-tertiary shadow-xs h-60 relative">
                      <Map center={hotelLatlng} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step H4: Property Photos Gallery */}
            {hotelStep === 4 && (
              <div className="space-y-5 animate-in fade-in">
                <div className="text-center space-y-1">
                  <span className="text-xs uppercase tracking-wider text-secondary font-bold">
                    Hotel Step 4 of 7 · Property Gallery
                  </span>
                  <h2 className="text-2xl font-bold text-primary font-serif">
                    Upload Property Photos
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Add photos of your hotel exterior, lobby, facilities and grounds (min 4 required).
                  </p>
                </div>

                <div className="space-y-4 bg-white p-6 rounded-3xl border border-tertiary shadow-xs">
                  {/* Photos Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {hotelPhotos.map((src, index) => (
                      <div
                        key={index}
                        className="relative aspect-video rounded-2xl overflow-hidden border border-tertiary group bg-neutral-100"
                      >
                        <Image src={src} alt="Hotel Photo" fill className="object-cover" />
                        {index === 0 && (
                          <span className="absolute top-2 start-2 px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full">
                            Cover
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveHotelPhoto(index)}
                          className="absolute top-2 end-2 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-rose-600"
                          title="Remove photo"
                        >
                          <BrandTrashIcon size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Photo Input */}
                  <div className="p-4 bg-neutral-50 rounded-2xl border border-tertiary/70 space-y-3">
                    <label className="block text-xs font-semibold text-neutral-700">
                      Add Photo by URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={hotelCustomPhotoUrl}
                        onChange={(e) => setHotelCustomPhotoUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/photo-..."
                        className="flex-1 px-3.5 py-2 bg-white border border-tertiary/70 rounded-xl text-xs text-primary"
                      />
                      <button
                        type="button"
                        onClick={handleAddHotelPhoto}
                        className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/95 transition"
                      >
                        Add
                      </button>
                    </div>

                    {/* Presets */}
                    <div className="pt-1 flex flex-wrap gap-1.5 text-[11px]">
                      <span className="text-neutral-400 self-center me-1">Presets:</span>
                      {[
                        { label: "+ Grand Lobby", src: "/assets/hero.jpg" },
                        { label: "+ Seaside Suite", src: "/assets/oran.jpg" },
                        { label: "+ Historic Courtyard", src: "/assets/constantine.jpg" },
                        { label: "+ Pool & Patio", src: "/assets/tipaza.jpg" },
                      ].map((preset, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setHotelPhotos((prev) => [...prev, preset.src])}
                          className="px-2.5 py-1 bg-white hover:bg-neutral-200 border border-tertiary/60 text-neutral-700 rounded-lg font-medium transition"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step H5: Booking Approval Mode */}
            {hotelStep === 5 && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <span className="text-xs uppercase tracking-wider text-secondary font-bold">
                    Hotel Step 5 of 7 · Reservation Policy
                  </span>
                  <h2 className="text-2xl font-bold text-primary font-serif">
                    How do you want to accept bookings?
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => setHotelBookingMode("instant")}
                    className={`p-6 rounded-3xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      hotelBookingMode === "instant"
                        ? "border-primary bg-white shadow-md ring-2 ring-primary/20"
                        : "border-tertiary/70 bg-white hover:border-neutral-400"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <InstantBookingIcon size={26} className="text-primary" />
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                          Recommended
                        </span>
                      </div>
                      <h4 className="font-bold text-primary text-sm">Instant Booking</h4>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        Guests can reserve available rooms immediately without waiting for host confirmation. Recommended for hotels.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setHotelBookingMode("request")}
                    className={`p-6 rounded-3xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      hotelBookingMode === "request"
                        ? "border-primary bg-white shadow-md ring-2 ring-primary/20"
                        : "border-tertiary/70 bg-white hover:border-neutral-400"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <RequestReviewIcon size={26} className="text-primary" />
                        <span className="px-2 py-0.5 bg-neutral-100 text-neutral-700 text-[10px] font-bold rounded-full">
                          Manual Review
                        </span>
                      </div>
                      <h4 className="font-bold text-primary text-sm">Request to Book</h4>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        Every reservation request requires manual confirmation by front desk within 24 hours before confirmation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step H6: Team Invites */}
            {hotelStep === 6 && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <span className="text-xs uppercase tracking-wider text-secondary font-bold">
                    Hotel Step 6 of 7 · Front Desk Staff
                  </span>
                  <h2 className="text-2xl font-bold text-primary font-serif">
                    Invite Reception & Reservation Staff
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Optional. You can add front desk operators and managers at any time.
                  </p>
                </div>

                <div className="space-y-3 bg-white p-6 rounded-3xl border border-tertiary shadow-xs">
                  {hotelTeamInvites.map((inv, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="email"
                        value={inv.email}
                        onChange={(e) => {
                          const val = e.target.value;
                          setHotelTeamInvites((prev) =>
                            prev.map((item, idx) => (idx === i ? { ...item, email: val } : item))
                          );
                        }}
                        placeholder="reception@hoteldjazair.dz"
                        className="flex-1 px-3 py-2 bg-neutral-50 border border-tertiary/70 rounded-xl text-xs text-primary"
                      />
                      <select
                        value={inv.role}
                        onChange={(e) => {
                          const role = e.target.value as "admin" | "manager";
                          setHotelTeamInvites((prev) =>
                            prev.map((item, idx) => (idx === i ? { ...item, role } : item))
                          );
                        }}
                        className="px-2.5 py-2 bg-neutral-50 border border-tertiary/70 rounded-xl text-xs text-primary"
                      >
                        <option value="manager">Receptionist / Manager</option>
                        <option value="admin">Hotel General Manager</option>
                      </select>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      setHotelTeamInvites((prev) => [...prev, { email: "", role: "manager" }])
                    }
                    className="text-xs font-semibold text-secondary flex items-center gap-1 hover:underline pt-1"
                  >
                    <BrandPlusIcon size={15} />
                    <span>Add another team member</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step H7: Review & Confirm Hotel */}
            {hotelStep === 7 && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <span className="text-xs uppercase tracking-wider text-secondary font-bold">
                    Hotel Step 7 of 7 · Final Confirmation
                  </span>
                  <h2 className="text-2xl font-bold text-primary font-serif">
                    Review and register Hotel Property
                  </h2>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-tertiary shadow-xs space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Property Name:</span>
                    <span className="font-bold text-primary">{hotelName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-neutral-500">Classification:</span>
                    <span className="text-accent font-bold inline-flex items-center gap-1">
                      {Array.from({ length: hotelStarRating }).map((_, i) => (
                        <BrandStarIcon key={i} size={14} className="text-accent" />
                      ))}
                      <span>({hotelStarRating} Stars)</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Total Rooms:</span>
                    <span className="font-mono font-bold text-primary">{hotelTotalRooms} Rooms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Commercial Register:</span>
                    <span className="font-mono font-bold text-primary">{hotelRegNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Booking Mode:</span>
                    <span className="capitalize font-bold text-emerald-700">{hotelBookingMode} booking</span>
                  </div>

                  <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200 text-blue-900 mt-2">
                    <div className="font-bold flex items-center gap-1">
                      <BrandShieldIcon size={16} />
                      <span>Hotel Onboarding Completed</span>
                    </div>
                    <div className="text-[11px] mt-0.5">
                      Your Hotel workspace will be activated immediately. You can define room types and nightly tariffs from your host extranet.
                    </div>
                  </div>

                  <div className="pt-3">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleRegisterHotel}
                      className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/95 transition shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? "Registering hotel..." : "Register Hotel Property Workspace"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* HOSTEL REGISTRATION FLOW (Steps B1 - B7)                  */}
        {/* ======================================================== */}
        {isHostelFlow && (
          <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
            {/* Step B1: Hostel Name & Address */}
            {hostelStep === 1 && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <span className="text-xs uppercase tracking-wider text-secondary font-bold">
                    Hostel Step 1 of 7 · Property Identity
                  </span>
                  <h2 className="text-2xl font-bold text-primary font-serif">
                    Tell us about your Hostel
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Enter your backpacker hostel name and location in Algeria.
                  </p>
                </div>

                <div className="space-y-4 bg-white p-6 rounded-3xl border border-tertiary shadow-xs">
                  <div>
                    <label className="block text-xs font-bold text-primary mb-1">
                      Hostel Name
                    </label>
                    <input
                      type="text"
                      value={hostelName}
                      onChange={(e) => setHostelName(e.target.value)}
                      placeholder="e.g. Casbah Heritage Backpacker Hostel"
                      className="w-full px-3.5 py-2.5 bg-neutral-50 border border-tertiary/70 rounded-xl text-xs sm:text-sm text-primary focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-primary mb-1">
                      Street Address & City
                    </label>
                    <input
                      type="text"
                      value={hostelAddress}
                      onChange={(e) => setHostelAddress(e.target.value)}
                      placeholder="12 Rue Sidi Ramdane, Casbah, Algiers"
                      className="w-full px-3.5 py-2.5 bg-neutral-50 border border-tertiary/70 rounded-xl text-xs sm:text-sm text-primary focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step B2: Commercial Registration & House Policies */}
            {hostelStep === 2 && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <span className="text-xs uppercase tracking-wider text-secondary font-bold">
                    Hostel Step 2 of 7 · Details & Policies
                  </span>
                  <h2 className="text-2xl font-bold text-primary font-serif">
                    Legal Registration & Hostel Policies
                  </h2>
                </div>

                <div className="space-y-4 bg-white p-6 rounded-3xl border border-tertiary shadow-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-primary mb-1">
                        Commercial Register (DZ-RC)
                      </label>
                      <input
                        type="text"
                        value={hostelRegNumber}
                        onChange={(e) => setHostelRegNumber(e.target.value)}
                        placeholder="DZ-ALG-2024-B-07114"
                        className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/70 rounded-xl text-xs text-primary font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-primary mb-1">
                        Tax ID (NIF)
                      </label>
                      <input
                        type="text"
                        value={hostelTaxId}
                        onChange={(e) => setHostelTaxId(e.target.value)}
                        placeholder="002416098877112"
                        className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/70 rounded-xl text-xs text-primary font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-primary mb-1">
                        Hostel Email
                      </label>
                      <input
                        type="email"
                        value={hostelEmail}
                        onChange={(e) => setHostelEmail(e.target.value)}
                        placeholder="hello@casbahhostel.dz"
                        className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/70 rounded-xl text-xs text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-primary mb-1">
                        Reception Phone / WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={hostelPhone}
                        onChange={(e) => setHostelPhone(e.target.value)}
                        placeholder="+213 21 73 88 19"
                        className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/70 rounded-xl text-xs text-primary font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-primary mb-1">
                        Curfew Policy
                      </label>
                      <input
                        type="text"
                        value={curfewPolicy}
                        onChange={(e) => setCurfewPolicy(e.target.value)}
                        placeholder="No curfew · 24h keycard access"
                        className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/70 rounded-xl text-xs text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-primary mb-1">
                        Age Policy
                      </label>
                      <input
                        type="text"
                        value={agePolicy}
                        onChange={(e) => setAgePolicy(e.target.value)}
                        placeholder="All ages welcome (min 18 in dorms)"
                        className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/70 rounded-xl text-xs text-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-primary mb-2">
                      Hostel Facilities
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { id: "lockers", label: "Personal Lockers" },
                        { id: "shared_kitchen", label: "Communal Kitchen" },
                        { id: "rooftop", label: "Rooftop Social Patio" },
                        { id: "coworking", label: "Co-working Zone" },
                        { id: "luggage_storage", label: "Free Luggage Hold" },
                        { id: "breakfast", label: "Hostel Breakfast" },
                      ].map((facility) => {
                        const isSelected = hostelFacilities.includes(facility.id);
                        return (
                          <button
                            key={facility.id}
                            type="button"
                            onClick={() => {
                              setHostelFacilities((prev) =>
                                isSelected ? prev.filter((f) => f !== facility.id) : [...prev, facility.id]
                              );
                            }}
                            className={`p-2.5 rounded-xl border text-start flex items-center justify-between text-xs font-medium transition ${
                              isSelected
                                ? "border-primary bg-primary/5 text-primary font-bold"
                                : "border-tertiary/70 bg-neutral-50 text-neutral-600 hover:border-neutral-400"
                            }`}
                          >
                            <span className="truncate">{facility.label}</span>
                            {isSelected && <BrandCheckIcon size={14} className="text-primary shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step B3: Location & Map Pin Picker */}
            {hostelStep === 3 && (
              <div className="space-y-5 animate-in fade-in">
                <div className="text-center space-y-1">
                  <span className="text-xs uppercase tracking-wider text-secondary font-bold">
                    Hostel Step 3 of 7 · Property Location
                  </span>
                  <h2 className="text-2xl font-bold text-primary font-serif">
                    Where is your Hostel located?
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Set your coordinates so backpackers can easily find your hostel on the map.
                  </p>
                </div>

                <div className="space-y-4 bg-white p-6 rounded-3xl border border-tertiary shadow-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-primary mb-1">
                        Wilaya (Province)
                      </label>
                      <select
                        value={hostelWilaya}
                        onChange={(e) => {
                          const sel = wilayasAlgeria.find((w) => w.name === e.target.value);
                          if (sel) {
                            setHostelWilaya(sel.name);
                            setHostelLatlng(sel.latlng);
                          }
                        }}
                        className="w-full px-3.5 py-2.5 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary"
                      >
                        {wilayasAlgeria.map((w) => (
                          <option key={w.name} value={w.name}>
                            {w.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-primary mb-1">
                        City / Neighborhood
                      </label>
                      <input
                        type="text"
                        value={hostelCity}
                        onChange={(e) => setHostelCity(e.target.value)}
                        placeholder="e.g. Casbah, Bab El Oued"
                        className="w-full px-3.5 py-2.5 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-primary mb-1">
                      Exact Street Address
                    </label>
                    <input
                      type="text"
                      value={hostelAddress}
                      onChange={(e) => setHostelAddress(e.target.value)}
                      placeholder="e.g. 12 Rue Sidi Ramdane, Casbah"
                      className="w-full px-3.5 py-2.5 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary"
                    />
                  </div>

                  {/* Interactive Map */}
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-xs font-bold text-primary">
                      Map Pin Position
                    </label>
                    <div className="rounded-2xl overflow-hidden border border-tertiary shadow-xs h-60 relative">
                      <Map center={hostelLatlng} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step B4: Property Photos Gallery */}
            {hostelStep === 4 && (
              <div className="space-y-5 animate-in fade-in">
                <div className="text-center space-y-1">
                  <span className="text-xs uppercase tracking-wider text-secondary font-bold">
                    Hostel Step 4 of 7 · Property Gallery
                  </span>
                  <h2 className="text-2xl font-bold text-primary font-serif">
                    Upload Property Photos
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Add photos of your hostel facade, common areas, rooftop and vibe (min 4 required).
                  </p>
                </div>

                <div className="space-y-4 bg-white p-6 rounded-3xl border border-tertiary shadow-xs">
                  {/* Photos Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {hostelPhotos.map((src, index) => (
                      <div
                        key={index}
                        className="relative aspect-video rounded-2xl overflow-hidden border border-tertiary group bg-neutral-100"
                      >
                        <Image src={src} alt="Hostel Photo" fill className="object-cover" />
                        {index === 0 && (
                          <span className="absolute top-2 start-2 px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full">
                            Cover
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveHostelPhoto(index)}
                          className="absolute top-2 end-2 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-rose-600"
                          title="Remove photo"
                        >
                          <BrandTrashIcon size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Photo Input */}
                  <div className="p-4 bg-neutral-50 rounded-2xl border border-tertiary/70 space-y-3">
                    <label className="block text-xs font-semibold text-neutral-700">
                      Add Photo by URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={hostelCustomPhotoUrl}
                        onChange={(e) => setHostelCustomPhotoUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/photo-..."
                        className="flex-1 px-3.5 py-2 bg-white border border-tertiary/70 rounded-xl text-xs text-primary"
                      />
                      <button
                        type="button"
                        onClick={handleAddHostelPhoto}
                        className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/95 transition"
                      >
                        Add
                      </button>
                    </div>

                    {/* Presets */}
                    <div className="pt-1 flex flex-wrap gap-1.5 text-[11px]">
                      <span className="text-neutral-400 self-center me-1">Presets:</span>
                      {[
                        { label: "+ Rooftop Lounge", src: "/assets/hero.jpg" },
                        { label: "+ Saharan Oasis", src: "/assets/tipaza.jpg" },
                        { label: "+ Historic Courtyard", src: "/assets/constantine.jpg" },
                        { label: "+ Social Area", src: "/assets/oran.jpg" },
                      ].map((preset, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setHostelPhotos((prev) => [...prev, preset.src])}
                          className="px-2.5 py-1 bg-white hover:bg-neutral-200 border border-tertiary/60 text-neutral-700 rounded-lg font-medium transition"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step B5: Booking Approval Mode */}
            {hostelStep === 5 && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <span className="text-xs uppercase tracking-wider text-secondary font-bold">
                    Hostel Step 5 of 7 · Reservation Policy
                  </span>
                  <h2 className="text-2xl font-bold text-primary font-serif">
                    How do you want to accept bookings?
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => setHostelBookingMode("instant")}
                    className={`p-6 rounded-3xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      hostelBookingMode === "instant"
                        ? "border-primary bg-white shadow-md ring-2 ring-primary/20"
                        : "border-tertiary/70 bg-white hover:border-neutral-400"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <InstantBookingIcon size={26} className="text-primary" />
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                          Recommended
                        </span>
                      </div>
                      <h4 className="font-bold text-primary text-sm">Instant Bed Booking</h4>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        Backpackers can book immediately and receive hostel access instantly. Keeps hostel occupancy high.
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setHostelBookingMode("request")}
                    className={`p-6 rounded-3xl border-2 cursor-pointer transition flex flex-col justify-between ${
                      hostelBookingMode === "request"
                        ? "border-primary bg-white shadow-md ring-2 ring-primary/20"
                        : "border-tertiary/70 bg-white hover:border-neutral-400"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <RequestReviewIcon size={26} className="text-primary" />
                        <span className="px-2 py-0.5 bg-neutral-100 text-neutral-700 text-[10px] font-bold rounded-full">
                          Manual Review
                        </span>
                      </div>
                      <h4 className="font-bold text-primary text-sm">Request to Book</h4>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        Hostel desk reviews each traveler request before accepting reservation within 24 hours.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step B6: Team Invites */}
            {hostelStep === 6 && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <span className="text-xs uppercase tracking-wider text-secondary font-bold">
                    Hostel Step 6 of 7 · Community Team
                  </span>
                  <h2 className="text-2xl font-bold text-primary font-serif">
                    Invite Hostel Crew & Volunteers
                  </h2>
                </div>

                <div className="space-y-3 bg-white p-6 rounded-3xl border border-tertiary shadow-xs">
                  {hostelTeamInvites.map((inv, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="email"
                        value={inv.email}
                        onChange={(e) => {
                          const val = e.target.value;
                          setHostelTeamInvites((prev) =>
                            prev.map((item, idx) => (idx === i ? { ...item, email: val } : item))
                          );
                        }}
                        placeholder="crew@casbahhostel.dz"
                        className="flex-1 px-3 py-2 bg-neutral-50 border border-tertiary/70 rounded-xl text-xs text-primary"
                      />
                      <select
                        value={inv.role}
                        onChange={(e) => {
                          const role = e.target.value as "admin" | "manager";
                          setHostelTeamInvites((prev) =>
                            prev.map((item, idx) => (idx === i ? { ...item, role } : item))
                          );
                        }}
                        className="px-2.5 py-2 bg-neutral-50 border border-tertiary/70 rounded-xl text-xs text-primary"
                      >
                        <option value="manager">Desk Crew / Volunteer</option>
                        <option value="admin">Hostel Manager</option>
                      </select>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() =>
                      setHostelTeamInvites((prev) => [...prev, { email: "", role: "manager" }])
                    }
                    className="text-xs font-semibold text-secondary flex items-center gap-1 hover:underline pt-1"
                  >
                    <BrandPlusIcon size={15} />
                    <span>Add another crew member</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step B7: Review & Confirm Hostel */}
            {hostelStep === 7 && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <span className="text-xs uppercase tracking-wider text-secondary font-bold">
                    Hostel Step 7 of 7 · Final Confirmation
                  </span>
                  <h2 className="text-2xl font-bold text-primary font-serif">
                    Review and register Hostel Property
                  </h2>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-tertiary shadow-xs space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Hostel Name:</span>
                    <span className="font-bold text-primary">{hostelName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Total Beds:</span>
                    <span className="font-mono font-bold text-primary">{hostelTotalBeds} Beds ({hostelDormBeds} dorm, {hostelPrivateRooms} private)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Location:</span>
                    <span className="text-primary">{hostelAddress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Commercial Register:</span>
                    <span className="font-mono font-bold text-primary">{hostelRegNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Booking Mode:</span>
                    <span className="capitalize font-bold text-emerald-700">{hostelBookingMode} booking</span>
                  </div>

                  <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 text-purple-900 mt-2">
                    <div className="font-bold flex items-center gap-1">
                      <BrandShieldIcon size={16} />
                      <span>Hostel Community Profile Ready</span>
                    </div>
                    <div className="text-[11px] mt-0.5">
                      Your hostel workspace will be active immediately. You can manage per-bed tariffs, dorm room allocations, and guest arrivals.
                    </div>
                  </div>

                  <div className="pt-3">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleRegisterHostel}
                      className="w-full py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/95 transition shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? "Registering hostel..." : "Register Hostel Workspace"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dynamic Custom Step Renderer (for admin-created custom steps) */}
        {configuredSteps.map((customStep, customIdx) => {
          if (!customStep.id.startsWith("custom_step_") || !customStep.isActive) return null;
          const isCustomActive = currentStepNumber === customIdx + 1;
          if (!isCustomActive) return null;

          return (
            <div key={customStep.id} className="space-y-6 max-w-xl mx-auto animate-in fade-in">
              <div className="text-center space-y-1">
                <span className="text-xs uppercase tracking-wider text-secondary font-bold">
                  Step {customIdx + 1} of {activeStepsCount}
                </span>
                <h2 className="text-2xl font-bold text-primary font-serif">
                  {customStep.title.en}
                </h2>
                {customStep.description && (
                  <p className="text-xs text-neutral-500">{customStep.description.en}</p>
                )}
              </div>

              <div className="bg-white p-6 rounded-3xl border border-tertiary shadow-xs">
                <DynamicStepFields
                  fields={customStep.fields}
                  values={customFieldsData}
                  onChange={(fieldId, val) =>
                    setCustomFieldsData((prev) => ({ ...prev, [fieldId]: val }))
                  }
                />
              </div>
            </div>
          );
        })}
      </main>

      {/* Bottom Sticky Navigation Bar */}
      <footer className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-tertiary/60 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        {/* Back Button */}
        <div>
          {isHotelFlow ? (
            hotelStep > 1 ? (
              <button
                type="button"
                onClick={() => setHotelStep((prev) => prev - 1)}
                className="inline-flex items-center gap-1 px-4 py-2 text-xs sm:text-sm font-semibold text-neutral-600 hover:text-primary transition"
              >
                <BrandChevronLeftIcon size={16} className="rtl:rotate-180" />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setActiveFlow("none");
                  setCurrentStep(0);
                }}
                className="inline-flex items-center gap-1 px-4 py-2 text-xs sm:text-sm font-semibold text-neutral-600 hover:text-primary transition"
              >
                <BrandChevronLeftIcon size={16} className="rtl:rotate-180" />
                <span>Choose account type</span>
              </button>
            )
          ) : isHostelFlow ? (
            hostelStep > 1 ? (
              <button
                type="button"
                onClick={() => setHostelStep((prev) => prev - 1)}
                className="inline-flex items-center gap-1 px-4 py-2 text-xs sm:text-sm font-semibold text-neutral-600 hover:text-primary transition"
              >
                <BrandChevronLeftIcon size={16} className="rtl:rotate-180" />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setActiveFlow("none");
                  setCurrentStep(0);
                }}
                className="inline-flex items-center gap-1 px-4 py-2 text-xs sm:text-sm font-semibold text-neutral-600 hover:text-primary transition"
              >
                <BrandChevronLeftIcon size={16} className="rtl:rotate-180" />
                <span>Choose account type</span>
              </button>
            )
          ) : isAgencyFlow ? (
            agencyStep > 1 ? (
              <button
                type="button"
                onClick={() => setAgencyStep((prev) => prev - 1)}
                className="inline-flex items-center gap-1 px-4 py-2 text-xs sm:text-sm font-semibold text-neutral-600 hover:text-primary transition"
              >
                <BrandChevronLeftIcon size={16} className="rtl:rotate-180" />
                <span>Back</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setActiveFlow("none");
                  setCurrentStep(0);
                }}
                className="inline-flex items-center gap-1 px-4 py-2 text-xs sm:text-sm font-semibold text-neutral-600 hover:text-primary transition"
              >
                <BrandChevronLeftIcon size={16} className="rtl:rotate-180" />
                <span>Choose account type</span>
              </button>
            )
          ) : currentStep > 0 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="inline-flex items-center gap-1 px-4 py-2 text-xs sm:text-sm font-semibold text-neutral-600 hover:text-primary transition"
            >
              <BrandChevronLeftIcon size={16} className="rtl:rotate-180" />
              <span>Back</span>
            </button>
          ) : null}
        </div>

        {/* Step Indicator */}
        <div className="text-xs font-semibold text-neutral-400">
          {currentStep === 0 && !isAgencyFlow && !isHotelFlow && !isHostelFlow
            ? "Select host mode"
            : `Step ${currentStepNumber} of ${activeStepsCount}`}
        </div>

        {/* Next / Action Button */}
        <div>
          {isHotelFlow ? (
            hotelStep < 7 ? (
              <button
                type="button"
                id="hotel-next-btn"
                onClick={() => {
                  if (hotelStep === 1 && !hotelName.trim()) {
                    toast.error("Please enter your hotel name.");
                    return;
                  }
                  if (hotelStep === 4 && hotelPhotos.length < 4) {
                    toast.warning("Please ensure at least 4 property photos are uploaded.");
                    return;
                  }
                  setHotelStep((prev) => prev + 1);
                }}
                className="px-6 py-2 bg-primary text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-primary/95 transition shadow-xs cursor-pointer"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                id="hotel-register-footer-btn"
                disabled={isSubmitting}
                onClick={handleRegisterHotel}
                className="px-6 py-2.5 bg-primary text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-primary/95 transition shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {isSubmitting ? "Registering hotel..." : "Register Hotel Property"}
              </button>
            )
          ) : isHostelFlow ? (
            hostelStep < 7 ? (
              <button
                type="button"
                id="hostel-next-btn"
                onClick={() => {
                  if (hostelStep === 1 && !hostelName.trim()) {
                    toast.error("Please enter your hostel name.");
                    return;
                  }
                  if (hostelStep === 4 && hostelPhotos.length < 4) {
                    toast.warning("Please ensure at least 4 property photos are uploaded.");
                    return;
                  }
                  setHostelStep((prev) => prev + 1);
                }}
                className="px-6 py-2 bg-primary text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-primary/95 transition shadow-xs cursor-pointer"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                id="hostel-register-footer-btn"
                disabled={isSubmitting}
                onClick={handleRegisterHostel}
                className="px-6 py-2.5 bg-primary text-white text-xs sm:text-sm font-bold rounded-xl hover:bg-primary/95 transition shadow-md disabled:opacity-50 cursor-pointer flex items-center gap-2"
              >
                {isSubmitting ? "Registering hostel..." : "Register Hostel Workspace"}
              </button>
            )
          ) : isAgencyFlow ? (
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

      {/* Discard / Save & Exit 3-Button Confirm Dialog */}
      <ConfirmDialog
        isOpen={isExitDialogOpen}
        variant="discard"
        title="Leave Listing Setup?"
        message="You have unsaved changes in your listing registration. You can save your progress as a draft to resume later, or discard your current inputs."
        cancelLabel="Keep editing"
        discardLabel="Discard changes"
        saveAndExitLabel="Save & exit"
        onCancel={() => setIsExitDialogOpen(false)}
        onDiscard={handleExecuteDiscard}
        onSaveAndExit={handleExecuteSaveAndExit}
        onConfirm={handleExecuteSaveAndExit}
      />
    </div>
  );
}
