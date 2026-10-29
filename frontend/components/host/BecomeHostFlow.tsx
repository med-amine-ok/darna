"use client";

import { convertDzdToEur, formatDzd, formatEur } from "@/lib/currency";
import { DEFAULT_COMMISSION_RATES, isValidPriceDzd, PRICE_MAX_DZD, PRICE_MIN_DZD } from "@/lib/booking/config";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/navigation";
import { completeHostOnboardingAction, HostOnboardingInput } from "@/app/actions/host";
import { clearHostDraft, readHostDraft, writeHostDraft } from "@/lib/client/user-storage";
import { useLoginModal } from "@/hook/useLoginModal";
import Counter from "@/components/inputs/Counter";
import { toast } from "react-toastify";
import ConfirmDialog from "@/components/models/ConfirmDialog";
import { getOnboardingSteps } from "@/lib/onboarding-config";
import { OnboardingStepConfig } from "@/types";
import DynamicStepFields from "./DynamicStepFields";
import {
  BrandStarIcon,
  BrandChevronLeftIcon,
  BrandPinIcon,
  BrandShieldIcon,
} from "@/components/icons";
import HostTypeStep, { type HostKind } from "./onboarding/HostTypeStep";
import {
  AMENITIES,
  BUSINESS_TYPES,
  CATEGORIES,
  FOCUS_RING,
  HOSTEL_FACILITY_IDS,
  HOSTEL_PHOTO_PRESETS,
  HOTEL_AMENITY_IDS,
  HOTEL_PHOTO_PRESETS,
  LISTING_PHOTO_PRESETS,
  STEP_ERROR_ID,
  TEAM_SIZES,
  WILAYAS,
  type TeamInvite,
  type TeamSize,
} from "./onboarding/data";
import {
  BookingModeChooser,
  LocationFields,
  Notice,
  PhotoGalleryEditor,
  ReviewRow,
  StepHeader,
  TeamInvitesEditor,
  TextField,
  ToggleChip,
  fieldClass,
  labelClass,
} from "./onboarding/ui";
import { useActionError } from "@/hook/useActionError";

interface BecomeHostFlowProps {
  initialStep?: string;
  initialHostType?: "individual" | "agency" | "hotel" | "hostel" | null;
  /** Session user id (from the server page) — used only to key the local draft. */
  currentUserId: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Step-level validation result: a translated message plus the invalid field keys. */
type StepError = { message: string; fields: string[] };

const HOTEL_STEPS = 7;
const HOSTEL_STEPS = 7;
const AGENCY_STEPS = 5;

const cardClass = "bg-white p-6 rounded-3xl border border-tertiary shadow-xs";
const primaryButton = `bg-primary text-white rounded-xl hover:bg-primary/95 transition disabled:opacity-50 ${FOCUS_RING}`;

export default function BecomeHostFlow({
  initialStep = "0",
  initialHostType = null,
  currentUserId,
}: BecomeHostFlowProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("hostFlow");
  const tAgency = useTranslations("agencyRegistration");
  const tCommon = useTranslations("common");
  const errorText = useActionError();
  const openLoginModal = useLoginModal((s) => s.onOpen);

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
  const isOrgFlow = isAgencyFlow || isHotelFlow || isHostelFlow;

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

  // Details (sample content is shown in the user's language)
  const [title, setTitle] = useState<string>(() => t("titleStep.default"));
  const [description, setDescription] = useState<string>(() => t("descriptionStep.default"));
  const [price, setPrice] = useState<number>(18500); // DZD
  const [instantBook, setInstantBook] = useState<boolean>(true);
  const [cancellationPolicy, setCancellationPolicy] = useState<"flexible" | "moderate" | "strict">("flexible");

  // Agency Registration Form State
  const [agencyStep, setAgencyStep] = useState<number>(1);
  const [businessName, setBusinessName] = useState<string>("");
  const [businessType, setBusinessType] = useState<string>("Licensed Tourism Agency");
  const [regNumber, setRegNumber] = useState<string>("");
  const [businessEmail, setBusinessEmail] = useState<string>("");
  const [businessPhone, setBusinessPhone] = useState<string>("");
  const [headquarters, setHeadquarters] = useState<string>("");
  const [teamSize, setTeamSize] = useState<TeamSize>("2-10");
  const [teamInvites, setTeamInvites] = useState<TeamInvite[]>([{ email: "", role: "manager" }]);

  // Hotel Registration Form State (Section 2)
  const [hotelStep, setHotelStep] = useState<number>(1);
  const [hotelName, setHotelName] = useState<string>("");
  const [hotelStarRating, setHotelStarRating] = useState<number>(5);
  const [hotelTotalRooms] = useState<number>(48);
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
  const [hotelRegNumber, setHotelRegNumber] = useState<string>("");
  const [hotelTaxId, setHotelTaxId] = useState<string>("");
  const [hotelAddress, setHotelAddress] = useState<string>("");
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
  const [hotelPhone, setHotelPhone] = useState<string>("");
  const [hotelEmail, setHotelEmail] = useState<string>("");
  const [hotelBookingMode, setHotelBookingMode] = useState<"instant" | "request">("instant");
  const [hotelTeamInvites, setHotelTeamInvites] = useState<TeamInvite[]>([{ email: "", role: "manager" }]);

  // Hostel Registration Form State (Section 2)
  const [hostelStep, setHostelStep] = useState<number>(1);
  const [hostelName, setHostelName] = useState<string>("");
  const [hostelCity, setHostelCity] = useState<string>("Algiers");
  const [hostelWilaya, setHostelWilaya] = useState<string>("Algiers");
  const [hostelAddress, setHostelAddress] = useState<string>("");
  const [hostelLatlng, setHostelLatlng] = useState<[number, number]>([36.7865, 3.0592]);
  const [hostelPhotos, setHostelPhotos] = useState<string[]>([
    "/assets/hero.jpg",
    "/assets/tipaza.jpg",
    "/assets/oran.jpg",
    "/assets/constantine.jpg",
  ]);
  const [hostelCustomPhotoUrl, setHostelCustomPhotoUrl] = useState<string>("");
  const [hostelDormBeds] = useState<number>(24);
  const [hostelPrivateRooms] = useState<number>(4);
  const [hostelTotalBeds] = useState<number>(28);
  const [hostelFacilities, setHostelFacilities] = useState<string[]>([
    "lockers",
    "shared_kitchen",
    "rooftop",
    "coworking",
    "wifi",
    "luggage_storage",
    "breakfast",
  ]);
  const [curfewPolicy, setCurfewPolicy] = useState<string>(() => t("hostel.curfewDefault"));
  const [agePolicy, setAgePolicy] = useState<string>(() => t("hostel.ageDefault"));
  const [hostelRegNumber, setHostelRegNumber] = useState<string>("");
  const [hostelTaxId, setHostelTaxId] = useState<string>("");
  const [hostelEmail, setHostelEmail] = useState<string>("");
  const [hostelPhone, setHostelPhone] = useState<string>("");
  const [hostelBookingMode, setHostelBookingMode] = useState<"instant" | "request">("instant");
  const [hostelTeamInvites, setHostelTeamInvites] = useState<TeamInvite[]>([{ email: "", role: "manager" }]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
  const [stepError, setStepError] = useState<StepError | null>(null);
  const invalid = (field: string) => Boolean(stepError?.fields.includes(field));

  // On every step change: clear the previous step's errors and move focus to the new heading.
  const mainRef = useRef<HTMLElement>(null);
  const isFirstStepRender = useRef(true);
  useEffect(() => {
    setStepError(null);
    if (isFirstStepRender.current) {
      isFirstStepRender.current = false;
      return;
    }
    mainRef.current?.querySelector<HTMLElement>("[data-step-heading]")?.focus();
  }, [activeFlow, currentStep, agencyStep, hotelStep, hostelStep]);

  // Load draft from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const draft = readHostDraft(currentUserId) as Record<string, any> | null;
      if (draft) {
        try {
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
  }, [initialStep, currentUserId]);

  const handleHeaderExitClick = () => {
    if (currentStep > 0 || isOrgFlow) {
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
      writeHostDraft(currentUserId, draft);
      toast.info(t("draftSaved"));
      setIsExitDialogOpen(false);
      router.push("/");
    }
  };

  const handleExecuteDiscard = () => {
    if (typeof window !== "undefined") {
      clearHostDraft(currentUserId);
      toast.info(t("discarded"));
      setIsExitDialogOpen(false);
      router.push("/");
    }
  };

  /** Adds a photo URL to a gallery, clearing the URL input. */
  const addPhotoFromUrl = (
    url: string,
    setGallery: React.Dispatch<React.SetStateAction<string[]>>,
    clearUrl: () => void
  ) => {
    if (!url.trim()) return;
    setGallery((prev) => [...prev, url.trim()]);
    clearUrl();
    toast.success(t("photos.added"));
  };

  /** Removes a photo unless it is the last one. */
  const removePhoto = (
    gallery: string[],
    index: number,
    setGallery: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (gallery.length <= 1) {
      toast.error(t("photos.minOne"));
      return;
    }
    setGallery((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * Sends onboarding to the server. The server decides ids, ownership and
   * verification status and re-issues the signed session; we only redirect.
   */
  const submitOnboarding = async (input: HostOnboardingInput, successMessage: string) => {
    setIsSubmitting(true);
    try {
      const result = await completeHostOnboardingAction(input);
      if (!result.ok) {
        if (result.code === "UNAUTHENTICATED") openLoginModal();
        toast.error(errorText(result));
        setIsSubmitting(false);
        return;
      }

      clearHostDraft(currentUserId);
      try {
        localStorage.setItem("darna_mode", "host");
      } catch {}

      toast.success(successMessage);
      window.location.href = `/${locale}/host`;
    } catch {
      toast.error(t("errors.generic"));
      setIsSubmitting(false);
    }
  };

  /** Returns the first missing/invalid org field as a step error, else null. */
  const validateOrgFields = (fields: {
    name: string;
    reg: string;
    email: string;
    phone: string;
    address: string;
  }): StepError | null => {
    if (!fields.name.trim()) return { message: t("errors.orgName"), fields: ["name"] };
    if (!fields.reg.trim()) return { message: t("errors.orgReg"), fields: ["reg"] };
    if (!EMAIL_RE.test(fields.email.trim())) return { message: t("errors.orgEmail"), fields: ["email"] };
    if (!fields.phone.trim()) return { message: t("errors.orgPhone"), fields: ["phone"] };
    if (!fields.address.trim()) return { message: t("errors.orgAddress"), fields: ["address"] };
    return null;
  };

  /** Registration number + email + phone check used by the hotel/hostel step 2. */
  const contactDetailsError = (reg: string, email: string, phone: string): StepError | null => {
    const fields = [
      !reg.trim() && "reg",
      !EMAIL_RE.test(email.trim()) && "email",
      !phone.trim() && "phone",
    ].filter(Boolean) as string[];
    return fields.length ? { message: t("errors.contactDetails"), fields } : null;
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
    if (!title.trim() || !isValidPriceDzd(price)) {
      setStepError({
        message: t("errors.titlePrice", {
          min: formatDzd(PRICE_MIN_DZD, locale),
          max: formatDzd(PRICE_MAX_DZD, locale),
        }),
        fields: ["title", "price"],
      });
      return;
    }

    await submitOnboarding(
      {
        hostType: "individual",
        // Content fields only — ownership/ids/ratings are set on the server.
        listing: {
          title: title.trim(),
          description: description.trim(),
          price,
          category: vertical,
          type: category,
          city: `${city || "Hydra"}, ${wilaya || "Algiers"}`,
          locationValue: wilaya || "Algiers",
          imageSrc: finalPhotos,
          guestCount,
          bedroomCount,
          roomCount: bedroomCount + 1,
          bathroomCount,
          amenities: selectedAmenities,
          latlng,
          instantBook,
          bookingApprovalMode: instantBook ? "instant" : "request",
          cancellationPolicy,
        },
      },
      t("review.published")
    );
  };

  const handleRegisterAgency = async () => {
    const error = validateOrgFields({
      name: businessName,
      reg: regNumber,
      email: businessEmail,
      phone: businessPhone,
      address: headquarters,
    });
    if (error) {
      setStepError(error);
      return;
    }

    await submitOnboarding(
      {
        hostType: "agency",
        organization: {
          name: businessName.trim(),
          businessRegistrationNumber: regNumber.trim(),
          businessType: businessType || "Licensed Tourism Agency",
          businessEmail: businessEmail.trim(),
          businessPhone: businessPhone.trim(),
          address: headquarters.trim(),
          teamSizeEstimate: teamSize,
          invitedMembers: teamInvites.filter((inv) => inv.email.trim()),
        },
      },
      tAgency("success")
    );
  };

  const handleRegisterHotel = async () => {
    const error = validateOrgFields({
      name: hotelName,
      reg: hotelRegNumber,
      email: hotelEmail,
      phone: hotelPhone,
      address: hotelAddress,
    });
    if (error) {
      setStepError(error);
      return;
    }

    const finalHotelPhotos = hotelPhotos.length >= 4 ? hotelPhotos : [
      "/assets/hero.jpg",
      "/assets/oran.jpg",
      "/assets/constantine.jpg",
      "/assets/tipaza.jpg",
    ];
    const name = hotelName.trim();

    // Note: the generated property/room descriptions below are stored listing
    // content (server data), not UI copy, so they are intentionally not localized here.
    await submitOnboarding(
      {
        hostType: "hotel",
        organization: {
          name,
          businessRegistrationNumber: hotelRegNumber.trim(),
          businessType: "Hotel & Resort",
          businessEmail: hotelEmail.trim(),
          businessPhone: hotelPhone.trim(),
          address: hotelAddress.trim(),
          teamSizeEstimate: "11-50",
          invitedMembers: hotelTeamInvites.filter((inv) => inv.email.trim()),
          hotelStarRating,
          totalRoomCount: hotelTotalRooms,
          checkInTime,
          checkOutTime,
          hotelAmenities,
          bookingApprovalMode: hotelBookingMode,
        },
        // Public property listing (room type ids are minted on the server).
        property: {
          title: name,
          description: `${name} offers exceptional hospitality in ${hotelCity || "Algiers"}, ${hotelWilaya || "Algiers"}. Featuring luxury room options, 24/7 reception, gourmet dining and curated Algerian experiences.`,
          price: 24000,
          category: "home",
          type: "Hotel",
          city: `${hotelCity || "Algiers"}, ${hotelWilaya || "Algiers"}`,
          locationValue: hotelWilaya || "Algiers",
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
          hotelStarRating,
          roomTypes: [
            {
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
        },
      },
      t("hotel.success")
    );
  };

  const handleRegisterHostel = async () => {
    const error = validateOrgFields({
      name: hostelName,
      reg: hostelRegNumber,
      email: hostelEmail,
      phone: hostelPhone,
      address: hostelAddress,
    });
    if (error) {
      setStepError(error);
      return;
    }

    const finalHostelPhotos = hostelPhotos.length >= 4 ? hostelPhotos : [
      "/assets/hero.jpg",
      "/assets/tipaza.jpg",
      "/assets/oran.jpg",
      "/assets/constantine.jpg",
    ];
    const name = hostelName.trim();

    await submitOnboarding(
      {
        hostType: "hostel",
        organization: {
          name,
          businessRegistrationNumber: hostelRegNumber.trim(),
          businessType: "Hostel & Backpacker Accommodation",
          businessEmail: hostelEmail.trim(),
          businessPhone: hostelPhone.trim(),
          address: hostelAddress.trim(),
          teamSizeEstimate: "2-10",
          invitedMembers: hostelTeamInvites.filter((inv) => inv.email.trim()),
          totalRoomCount: hostelTotalBeds,
          hostelFacilities,
          curfewPolicy,
          agePolicy,
          bookingApprovalMode: hostelBookingMode,
        },
        property: {
          title: name,
          description: `${name} is a vibrant traveler community located in the historic heart of ${hostelCity || "Algiers"}. Enjoy panoramic rooftop views, shared kitchen, and cultural social evenings.`,
          price: 3200,
          category: "home",
          type: "Hostel",
          city: `${hostelCity || "Algiers"}, ${hostelWilaya || "Algiers"}`,
          locationValue: hostelWilaya || "Algiers",
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
          roomTypes: [
            {
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
        },
      },
      t("hostel.success")
    );
  };

  /** Footer "Next": validates the current step, then advances. */
  const handleNext = () => {
    if (isHotelFlow) {
      if (hotelStep === 1 && !hotelName.trim()) {
        return setStepError({ message: t("errors.hotelName"), fields: ["name"] });
      }
      if (hotelStep === 2) {
        const error = contactDetailsError(hotelRegNumber, hotelEmail, hotelPhone);
        if (error) return setStepError(error);
      }
      if (hotelStep === 3 && !hotelAddress.trim()) {
        return setStepError({ message: t("errors.hotelAddress"), fields: ["address"] });
      }
      if (hotelStep === 4 && hotelPhotos.length < 4) {
        return setStepError({ message: t("errors.minPhotos"), fields: ["photos"] });
      }
      setHotelStep((prev) => prev + 1);
      return;
    }
    if (isHostelFlow) {
      if (hostelStep === 1 && !hostelName.trim()) {
        return setStepError({ message: t("errors.hostelName"), fields: ["name"] });
      }
      if (hostelStep === 2) {
        const error = contactDetailsError(hostelRegNumber, hostelEmail, hostelPhone);
        if (error) return setStepError(error);
      }
      if (hostelStep === 3 && !hostelAddress.trim()) {
        return setStepError({ message: t("errors.hostelAddress"), fields: ["address"] });
      }
      if (hostelStep === 4 && hostelPhotos.length < 4) {
        return setStepError({ message: t("errors.minPhotos"), fields: ["photos"] });
      }
      setHostelStep((prev) => prev + 1);
      return;
    }
    if (isAgencyFlow) {
      if (agencyStep === 1 && !businessName.trim()) {
        return setStepError({ message: t("errors.orgName"), fields: ["name"] });
      }
      if (agencyStep === 2) {
        const error = validateOrgFields({
          name: businessName,
          reg: regNumber,
          email: businessEmail,
          phone: businessPhone,
          address: headquarters,
        });
        if (error) return setStepError(error);
      }
      setAgencyStep((prev) => prev + 1);
      return;
    }
    if (currentStep === 4 && (!city.trim() || !address.trim())) {
      return setStepError({
        message: t("errors.cityAddress"),
        fields: [!city.trim() && "city", !address.trim() && "street"].filter(Boolean) as string[],
      });
    }
    if (currentStep === 8 && !title.trim()) {
      return setStepError({ message: t("errors.title"), fields: ["title"] });
    }
    setCurrentStep((prev) => prev + 1);
  };

  /** Footer "Back": previous step, or back to the host-type chooser from an org flow's first step. */
  const orgStep = isHotelFlow ? hotelStep : isHostelFlow ? hostelStep : isAgencyFlow ? agencyStep : 0;
  const backToChooser = isOrgFlow && orgStep <= 1;
  const handleBack = () => {
    if (backToChooser) {
      setActiveFlow("none");
      setCurrentStep(0);
    } else if (isHotelFlow) setHotelStep((prev) => prev - 1);
    else if (isHostelFlow) setHostelStep((prev) => prev - 1);
    else if (isAgencyFlow) setAgencyStep((prev) => prev - 1);
    else setCurrentStep((prev) => prev - 1);
  };

  const handleSelectHostType = (kind: HostKind) => {
    setHostType(kind);
    setActiveFlow(kind);
    if (kind === "individual") setCurrentStep(1);
    if (kind === "agency") setAgencyStep(1);
    if (kind === "hotel") setHotelStep(1);
    if (kind === "hostel") setHostelStep(1);
  };

  // Calculate Progress Percentage dynamically from configured active steps
  const activeStepsCount = Math.max(
    configuredSteps.filter((s) => s.isActive).length,
    1
  );

  const currentStepNumber = isOrgFlow ? orgStep : currentStep;
  const isChoosingHostType = currentStep === 0 && !isOrgFlow;
  const isIndividualStep = (n: number) => currentStep === n && !isOrgFlow;

  const progressPercent = isChoosingHostType
    ? 0
    : Math.min(100, Math.round((currentStepNumber / activeStepsCount) * 100));

  /* Display helpers -------------------------------------------------- */
  const wilayaLabel = (value: string) => {
    const w = WILAYAS.find((item) => item.value === value);
    return w ? t(`wilayas.${w.id}`) : value;
  };
  const categoryLabel = (value: string) => {
    const c = CATEGORIES.find((item) => item.value === value);
    return c ? t(`categories.${c.id}`) : value;
  };
  const businessTypeLabel = (value: string) => {
    const b = BUSINESS_TYPES.find((item) => item.value === value);
    return b ? tAgency(`businessTypes.${b.id}`) : value;
  };
  const commission = Math.round((price * DEFAULT_COMMISSION_RATES.individual) / 100);
  const payout = Math.round((price * (100 - DEFAULT_COMMISSION_RATES.individual)) / 100);
  const lang = (["en", "fr", "ar"].includes(locale) ? locale : "en") as "en" | "fr" | "ar";

  const flowBadge = isHotelFlow
    ? t("header.hotel")
    : isHostelFlow
    ? t("header.hostel")
    : isAgencyFlow
    ? t("header.agency")
    : t("header.becomeHost");

  return (
    <div className="min-h-screen bg-bg-light/40 flex flex-col justify-between">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-tertiary/60 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className={`flex items-center rounded ${FOCUS_RING}`}>
            <Image
              src="/assets/logo-horizontal.png"
              alt={t("header.logoAlt")}
              width={120}
              height={38}
              priority
              className="h-7 sm:h-8 w-auto object-contain"
            />
          </Link>
          <span className="hidden sm:inline-block px-2.5 py-0.5 bg-tertiary/30 text-primary text-xs font-bold rounded-full">
            {flowBadge}
          </span>
        </div>

        <button
          type="button"
          onClick={handleHeaderExitClick}
          className={`px-4 py-1.5 rounded-full border border-tertiary text-xs sm:text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition ${FOCUS_RING}`}
        >
          {t("saveAndExit")}
        </button>
      </header>

      {/* Progress Bar */}
      <div
        className="w-full bg-tertiary/30 h-1.5 sticky top-[57px] z-30"
        role="progressbar"
        aria-label={t("header.progress")}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercent}
      >
        <div
          className="bg-accent h-1.5 transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Form Content Area */}
      <main
        ref={mainRef}
        className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 pb-32 sm:pb-40 flex flex-col justify-center"
      >
        {/* STEP 0: 4-WAY HOST-TYPE SELECTION (Section 2) */}
        {isChoosingHostType && <HostTypeStep onSelect={handleSelectHostType} />}

        {/* INDIVIDUAL FLOW: STEP 1 - INTRO */}
        {isIndividualStep(1) && (
          <div className="space-y-8 max-w-xl mx-auto text-center animate-in fade-in">
            <StepHeader
              level={1}
              size="lg"
              eyebrow={t("intro.eyebrow")}
              title={t("intro.title")}
              subtitle={t("intro.subtitle")}
            />

            <ol className="bg-white rounded-3xl p-6 sm:p-8 border border-tertiary/70 text-start space-y-5 text-xs sm:text-sm shadow-xs">
              {([1, 2, 3] as const).map((n) => (
                <li key={n} className="flex items-start gap-4">
                  <span
                    aria-hidden="true"
                    className="w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5"
                  >
                    {n}
                  </span>
                  <div>
                    <div className="font-bold text-primary">{t(`intro.step${n}Title`)}</div>
                    <div className="text-neutral-600 text-xs mt-0.5">{t(`intro.step${n}Desc`)}</div>
                  </div>
                </li>
              ))}
            </ol>

            <button
              type="button"
              id="get-started-btn"
              onClick={() => setCurrentStep(2)}
              className={`px-8 py-3 font-semibold text-sm shadow-sm ${primaryButton}`}
            >
              {t("intro.getStarted")}
            </button>
          </div>
        )}

        {/* INDIVIDUAL FLOW: STEP 2 - PROPERTY TYPE / CATEGORY */}
        {isIndividualStep(2) && (
          <div className="space-y-6 animate-in fade-in max-w-2xl mx-auto">
            <StepHeader title={t("step1Title")} subtitle={t("step1Subtitle")} />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {CATEGORIES.map((item) => {
                const Icon = item.icon;
                const isSelected = category === item.value;

                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      setCategory(item.value);
                      setVertical(item.vertical);
                    }}
                    className={`p-4 rounded-2xl border-2 text-start flex flex-col justify-between gap-3 transition ${FOCUS_RING} ${
                      isSelected
                        ? "border-primary bg-tertiary/20 shadow-xs"
                        : "border-tertiary/70 bg-white hover:border-neutral-500"
                    }`}
                  >
                    <Icon size={24} className={isSelected ? "text-primary" : "text-neutral-500"} />
                    <span className="block">
                      <span className="block text-xs font-bold text-primary">{t(`categories.${item.id}`)}</span>
                      <span className="block text-[10px] text-neutral-600 uppercase tracking-wider mt-0.5">
                        {t(`verticals.${item.vertical}`)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            {renderDynamicFieldsForStep("category_vertical")}
          </div>
        )}

        {/* INDIVIDUAL FLOW: STEP 3 - PLACEMENT */}
        {isIndividualStep(3) && (
          <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
            <StepHeader title={t("placement.title")} subtitle={t("placement.subtitle")} />

            <fieldset className="space-y-3 pt-2">
              <legend className="sr-only">{t("placement.title")}</legend>
              {(["entire", "private", "shared"] as const).map((id) => (
                <label
                  key={id}
                  htmlFor={`placement-${id}`}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition flex items-center justify-between gap-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-600 ${
                    placement === id
                      ? "border-primary bg-tertiary/20"
                      : "border-tertiary/70 bg-white hover:border-neutral-500"
                  }`}
                >
                  <span>
                    <span className="block text-sm font-bold text-primary">{t(`placement.${id}.title`)}</span>
                    <span className="block text-xs text-neutral-600 mt-0.5">{t(`placement.${id}.desc`)}</span>
                  </span>
                  <input
                    id={`placement-${id}`}
                    type="radio"
                    name="placement"
                    value={id}
                    checked={placement === id}
                    onChange={() => setPlacement(id)}
                    className="w-4 h-4 text-primary shrink-0"
                  />
                </label>
              ))}
            </fieldset>
            {renderDynamicFieldsForStep("placement")}
          </div>
        )}

        {/* INDIVIDUAL FLOW: STEP 4 - LOCATION & MAP PIN */}
        {isIndividualStep(4) && (
          <div className="space-y-6 animate-in fade-in max-w-2xl mx-auto">
            <StepHeader title={t("step2Title")} subtitle={t("step2Subtitle")} />

            <LocationFields
              idPrefix="listing"
              tone="white"
              wilaya={wilaya}
              onWilayaChange={(value, coords) => {
                setWilaya(value);
                setLatlng(coords);
              }}
              city={city}
              onCityChange={setCity}
              cityPlaceholder={t("cityPlaceholder")}
              street={address}
              onStreetChange={setAddress}
              streetLabel={t("location.street")}
              streetPlaceholder={t("location.streetPlaceholder")}
              latlng={latlng}
              invalidCity={invalid("city")}
              invalidStreet={invalid("street")}
              showMapLabel={false}
            />
            {renderDynamicFieldsForStep("location")}
          </div>
        )}

        {/* INDIVIDUAL FLOW: STEP 5 - CAPACITY BASICS */}
        {isIndividualStep(5) && (
          <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
            <StepHeader title={t("step3Title")} subtitle={t("step3Subtitle")} />

            <div className="bg-white rounded-3xl p-6 border border-tertiary/70 divide-y divide-tertiary/40 shadow-xs">
              <div className="py-3">
                <Counter title={t("guests")} subtitle={t("capacity.guestsHint")} value={guestCount} onChange={setGuestCount} />
              </div>
              <div className="py-3">
                <Counter title={t("bedrooms")} subtitle={t("capacity.bedroomsHint")} value={bedroomCount} onChange={setBedroomCount} />
              </div>
              <div className="py-3">
                <Counter title={t("beds")} subtitle={t("capacity.bedsHint")} value={bedsCount} onChange={setBedsCount} />
              </div>
              <div className="py-3">
                <Counter title={t("bathrooms")} subtitle={t("capacity.bathroomsHint")} value={bathroomCount} onChange={setBathroomCount} />
              </div>
            </div>

            {/* Live Summary Line */}
            <p
              aria-live="polite"
              className="p-3 bg-tertiary/20 rounded-2xl border border-tertiary/50 text-center text-xs font-semibold text-primary"
            >
              {t("capacity.summary", {
                guests: t("counts.guests", { count: guestCount }),
                bedrooms: t("counts.bedrooms", { count: bedroomCount }),
                beds: t("counts.beds", { count: bedsCount }),
                bathrooms: t("counts.bathrooms", { count: bathroomCount }),
              })}
            </p>
            {renderDynamicFieldsForStep("capacity")}
          </div>
        )}

        {/* INDIVIDUAL FLOW: STEP 6 - AMENITIES */}
        {isIndividualStep(6) && (
          <div className="space-y-6 animate-in fade-in max-w-2xl mx-auto">
            <StepHeader title={t("step4Title")} subtitle={t("step4Subtitle")} />

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {AMENITIES.map((amenity) => {
                const Icon = amenity.icon;
                const isChecked = selectedAmenities.includes(amenity.id);

                return (
                  <button
                    key={amenity.id}
                    type="button"
                    aria-pressed={isChecked}
                    onClick={() => {
                      setSelectedAmenities((prev) =>
                        isChecked
                          ? prev.filter((id) => id !== amenity.id)
                          : [...prev, amenity.id]
                      );
                    }}
                    className={`p-4 rounded-2xl border-2 text-start flex flex-col justify-between gap-3 transition ${FOCUS_RING} ${
                      isChecked
                        ? "border-primary bg-tertiary/25 shadow-xs"
                        : "border-tertiary/70 bg-white hover:border-neutral-500"
                    }`}
                  >
                    <Icon size={24} className={isChecked ? "text-primary" : "text-neutral-500"} />
                    <span className="text-xs font-bold text-primary">{t(`amenities.${amenity.id}`)}</span>
                  </button>
                );
              })}
            </div>
            {renderDynamicFieldsForStep("amenities")}
          </div>
        )}

        {/* INDIVIDUAL FLOW: STEP 7 - PHOTOS GALLERY */}
        {isIndividualStep(7) && (
          <div className="space-y-6 animate-in fade-in max-w-2xl mx-auto">
            <StepHeader title={t("photos.title")} subtitle={t("photos.subtitle")} />
            <PhotoGalleryEditor
              idPrefix="listing"
              photos={photos}
              onRemove={(index) => removePhoto(photos, index, setPhotos)}
              urlValue={customPhotoUrl}
              onUrlChange={setCustomPhotoUrl}
              onAddUrl={() => addPhotoFromUrl(customPhotoUrl, setPhotos, () => setCustomPhotoUrl(""))}
              presets={LISTING_PHOTO_PRESETS}
              onAddPreset={(src) => setPhotos((prev) => [...prev, src])}
            />
            {renderDynamicFieldsForStep("photos")}
          </div>
        )}

        {/* INDIVIDUAL FLOW: STEP 8 - TITLE */}
        {isIndividualStep(8) && (
          <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
            <StepHeader title={t("titleStep.title")} subtitle={t("titleStep.subtitle")} />

            <div className="space-y-3">
              <label htmlFor="listing-title" className="sr-only">
                {t("titleStep.label")}
              </label>
              <textarea
                id="listing-title"
                rows={3}
                value={title}
                maxLength={60}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("titlePlaceholder")}
                aria-invalid={invalid("title") || undefined}
                aria-describedby={`listing-title-hint${invalid("title") ? ` ${STEP_ERROR_ID}` : ""}`}
                className="w-full p-4 bg-white border border-tertiary/80 rounded-2xl text-base sm:text-lg font-bold text-primary placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus-visible:ring-accent-600 aria-[invalid=true]:border-status-error"
              />
              <div id="listing-title-hint" className="flex justify-between gap-3 text-xs text-neutral-600">
                <span>{t("charCount", { count: title.length, max: 60 })}</span>
                <span className="text-secondary-700 font-medium">{t("titleStep.tip")}</span>
              </div>
            </div>

            {/* Quick Inspiration Pills */}
            <div className="p-4 bg-tertiary/20 rounded-2xl border border-tertiary/40 space-y-2 text-xs" role="group" aria-labelledby="title-ideas">
              <p id="title-ideas" className="font-semibold text-primary">{t("titleStep.ideas")}</p>
              <div className="flex flex-col gap-1.5">
                {(["chenoua", "casbah", "tassili"] as const).map((key) => {
                  const suggestion = t(`titleStep.suggestions.${key}`);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTitle(suggestion)}
                      className={`text-start p-2 bg-white rounded-xl hover:bg-neutral-50 text-neutral-700 font-medium transition ${FOCUS_RING}`}
                    >
                      &ldquo;{suggestion}&rdquo;
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* INDIVIDUAL FLOW: STEP 9 - DESCRIPTION */}
        {isIndividualStep(9) && (
          <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
            <StepHeader title={t("descriptionStep.title")} subtitle={t("descriptionStep.subtitle")} />

            <div className="space-y-3">
              <label htmlFor="listing-description" className="sr-only">
                {t("descriptionStep.label")}
              </label>
              <textarea
                id="listing-description"
                rows={6}
                value={description}
                maxLength={500}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descPlaceholder")}
                aria-describedby="listing-description-hint"
                className="w-full p-4 bg-white border border-tertiary/80 rounded-2xl text-xs sm:text-sm text-primary placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus-visible:ring-accent-600 leading-relaxed"
              />
              <div id="listing-description-hint" className="flex justify-between gap-3 text-xs text-neutral-600">
                <span>{t("charCount", { count: description.length, max: 500 })}</span>
                <span>{t("descriptionStep.tip")}</span>
              </div>
            </div>
            {renderDynamicFieldsForStep("title_description")}
          </div>
        )}

        {/* INDIVIDUAL FLOW: STEP 10 - PRICING & EARNINGS ESTIMATE */}
        {isIndividualStep(10) && (
          <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
            <StepHeader title={t("step7Title")} subtitle={t("step7Subtitle")} />

            {/* Price Box */}
            <div className="bg-white rounded-3xl p-8 border border-tertiary text-center space-y-4 shadow-xs">
              <label htmlFor="listing-price" className="block text-xs font-semibold text-neutral-700">
                {t("pricePerNight")}
              </label>
              <input
                id="listing-price"
                type="number"
                inputMode="numeric"
                step="500"
                min={PRICE_MIN_DZD}
                max={PRICE_MAX_DZD}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                aria-invalid={invalid("price") || undefined}
                aria-describedby={`listing-price-preview${invalid("price") ? ` ${STEP_ERROR_ID}` : ""}`}
                className="font-serif text-3xl sm:text-5xl font-black text-primary text-center bg-transparent border-b-2 border-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 rounded-sm w-48 mx-auto block"
              />
              <div id="listing-price-preview" className="text-xs text-neutral-600 space-y-0.5">
                <p className="font-semibold text-primary">{t("pricing.preview", { amount: formatDzd(price, locale) })}</p>
                <p>{t("pricing.eurEquivalent", { amount: formatEur(convertDzdToEur(price), locale) })}</p>
              </div>

              {/* Earnings Calculator */}
              <dl
                aria-label={t("pricing.breakdown")}
                className="p-4 bg-neutral-50 rounded-2xl border border-tertiary/60 text-xs text-start space-y-2 mt-4"
              >
                <ReviewRow label={t("pricing.base")} valueClassName="font-semibold text-primary">
                  {formatDzd(price, locale)}
                </ReviewRow>
                <ReviewRow
                  label={t("pricing.commission", { rate: DEFAULT_COMMISSION_RATES.individual })}
                  valueClassName="text-rose-700"
                >
                  {formatDzd(-commission, locale)}
                </ReviewRow>
                <hr className="border-tertiary/40" />
                <div className="flex justify-between gap-3 text-sm font-bold text-primary">
                  <dt>{t("pricing.payout")}</dt>
                  <dd className="text-emerald-700 text-end">
                    {formatDzd(payout, locale)}{" "}
                    <span className="text-[11px] font-normal text-neutral-600">
                      {formatEur(convertDzdToEur(payout), locale)}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>
            {renderDynamicFieldsForStep("pricing")}
          </div>
        )}

        {/* INDIVIDUAL FLOW: STEP 11 - BOOKING SETTINGS */}
        {isIndividualStep(11) && (
          <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
            <StepHeader title={t("booking.title")} subtitle={t("booking.subtitle")} />

            <div className="space-y-4">
              {/* Instant Book */}
              <div className="p-5 bg-white rounded-2xl border border-tertiary flex items-center justify-between gap-4">
                <div>
                  <label htmlFor="instant-book" className="font-bold text-primary text-sm cursor-pointer">
                    {t("booking.instantBook")}
                  </label>
                  <p id="instant-book-desc" className="text-xs text-neutral-600 mt-0.5">
                    {t("booking.instantBookDesc")}
                  </p>
                </div>
                <input
                  id="instant-book"
                  type="checkbox"
                  checked={instantBook}
                  onChange={(e) => setInstantBook(e.target.checked)}
                  aria-describedby="instant-book-desc"
                  className={`rounded text-primary w-4 h-4 shrink-0 ${FOCUS_RING}`}
                />
              </div>

              {/* Cancellation Policy */}
              <div className="p-5 bg-white rounded-2xl border border-tertiary space-y-3">
                <p id="cancellation-label" className="font-bold text-primary text-sm">
                  {t("booking.cancellation")}
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs" role="group" aria-labelledby="cancellation-label">
                  {(["flexible", "moderate", "strict"] as const).map((id) => {
                    const selected = cancellationPolicy === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setCancellationPolicy(id)}
                        className={`p-3 rounded-xl border text-start transition ${FOCUS_RING} ${
                          selected
                            ? "bg-primary text-white border-primary shadow-xs"
                            : "bg-neutral-50 text-neutral-700 border-tertiary/70 hover:bg-neutral-100"
                        }`}
                      >
                        <span className="block font-bold">{t(`booking.${id}.label`)}</span>
                        <span className={`block text-[10px] mt-0.5 ${selected ? "text-white/90" : "text-neutral-600"}`}>
                          {t(`booking.${id}.desc`)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              {renderDynamicFieldsForStep("approval_mode")}
              {renderDynamicFieldsForStep("policies")}
            </div>
          </div>
        )}

        {/* INDIVIDUAL FLOW: STEP 12 - REVIEW & PUBLISH */}
        {isIndividualStep(12) && (
          <div className="space-y-6 animate-in fade-in max-w-2xl mx-auto">
            <StepHeader eyebrow={t("review.eyebrow")} title={t("reviewTitle")} subtitle={t("reviewSubtitle")} />

            {/* Listing Preview Card */}
            <article className="bg-white rounded-3xl border border-tertiary overflow-hidden shadow-md">
              <div className="relative aspect-video w-full bg-neutral-100">
                <Image
                  src={photos[0] || "/assets/placeholder.jpg"}
                  alt={title}
                  fill
                  sizes="(min-width: 672px) 672px, 100vw"
                  className="object-cover"
                />
                <div className="absolute top-3 start-3">
                  <span className="px-3 py-1 bg-white/90 backdrop-blur-md rounded-full text-xs font-bold text-primary uppercase">
                    {categoryLabel(category)}
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-primary text-lg">{title}</h3>
                    <div className="text-xs text-neutral-600 mt-1 flex items-center gap-1">
                      <BrandPinIcon size={15} className="text-secondary" />
                      <span>{t("review.location", { city, wilaya: wilayaLabel(wilaya) })}</span>
                    </div>
                  </div>
                  <div className="text-end shrink-0">
                    <div className="text-lg font-bold text-primary">{formatDzd(price, locale)}</div>
                    <div className="text-[11px] text-neutral-600">
                      {t("review.perNight", { eur: formatEur(convertDzdToEur(price), locale) })}
                    </div>
                  </div>
                </div>

                <ul className="p-3 bg-neutral-50 rounded-2xl border border-tertiary/50 text-xs text-neutral-700 flex flex-wrap items-center justify-around gap-2">
                  <li>{t("counts.guests", { count: guestCount })}</li>
                  <li aria-hidden="true">·</li>
                  <li>{t("counts.bedrooms", { count: bedroomCount })}</li>
                  <li aria-hidden="true">·</li>
                  <li>{t("counts.beds", { count: bedsCount })}</li>
                  <li aria-hidden="true">·</li>
                  <li>{t("counts.bathrooms", { count: bathroomCount })}</li>
                </ul>

                <p className="text-xs text-neutral-700 leading-relaxed line-clamp-3">{description}</p>

                {/* Section Edit Links */}
                <div className="pt-2 border-t border-tertiary/40 flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(4)}
                    className={`text-secondary-700 hover:underline font-semibold rounded ${FOCUS_RING}`}
                  >
                    {t("review.editLocation")}
                  </button>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(7)}
                    className={`text-secondary-700 hover:underline font-semibold rounded ${FOCUS_RING}`}
                  >
                    {t("review.editPhotos", { count: photos.length })}
                  </button>
                  <span aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(10)}
                    className={`text-secondary-700 hover:underline font-semibold rounded ${FOCUS_RING}`}
                  >
                    {t("review.editPrice")}
                  </button>
                </div>
              </div>
            </article>

            {/* Final Publish Button */}
            <div className="text-center pt-4">
              <button
                type="button"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                onClick={handlePublishListing}
                className={`w-full sm:w-auto px-10 py-3.5 rounded-2xl font-bold text-base shadow-md ${primaryButton}`}
              >
                {isSubmitting ? t("review.publishing") : t("publishListing")}
              </button>
            </div>
          </div>
        )}

        {/* AGENCY REGISTRATION FLOW (Steps A1 - A5) */}
        {isAgencyFlow && (
          <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
            {agencyStep === 1 && (
              <div className="space-y-4">
                <StepHeader
                  eyebrow={tAgency("eyebrow", { current: 1, total: AGENCY_STEPS })}
                  title={tAgency("step1Title")}
                />
                <div className={`space-y-3 ${cardClass}`}>
                  <TextField
                    id="agency-name"
                    label={tAgency("businessName")}
                    value={businessName}
                    onValueChange={setBusinessName}
                    placeholder={tAgency("businessNamePlaceholder")}
                    required
                    autoComplete="organization"
                    invalid={invalid("name")}
                  />
                  <div>
                    <label htmlFor="agency-type" className={labelClass}>
                      {tAgency("businessType")}
                    </label>
                    <select
                      id="agency-type"
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className={fieldClass()}
                    >
                      {!BUSINESS_TYPES.some((b) => b.value === businessType) && businessType && (
                        <option value={businessType}>{businessType}</option>
                      )}
                      {BUSINESS_TYPES.map((b) => (
                        <option key={b.id} value={b.value}>
                          {tAgency(`businessTypes.${b.id}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {agencyStep === 2 && (
              <div className="space-y-4">
                <StepHeader
                  eyebrow={tAgency("eyebrow", { current: 2, total: AGENCY_STEPS })}
                  title={tAgency("step2Title")}
                />
                <div className={`space-y-3 ${cardClass}`}>
                  <TextField
                    id="agency-reg"
                    label={tAgency("regNumber")}
                    value={regNumber}
                    onValueChange={setRegNumber}
                    placeholder={tAgency("regNumberPlaceholder")}
                    required
                    mono
                    invalid={invalid("reg")}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <TextField
                      id="agency-email"
                      type="email"
                      label={tAgency("contactEmail")}
                      value={businessEmail}
                      onValueChange={setBusinessEmail}
                      placeholder={tAgency("emailPlaceholder")}
                      required
                      autoComplete="email"
                      invalid={invalid("email")}
                    />
                    <TextField
                      id="agency-phone"
                      type="tel"
                      label={tAgency("contactPhone")}
                      value={businessPhone}
                      onValueChange={setBusinessPhone}
                      placeholder={tAgency("phonePlaceholder")}
                      required
                      autoComplete="tel"
                      dir="ltr"
                      invalid={invalid("phone")}
                    />
                  </div>
                  <TextField
                    id="agency-address"
                    label={tAgency("address")}
                    value={headquarters}
                    onValueChange={setHeadquarters}
                    placeholder={tAgency("addressPlaceholder")}
                    required
                    autoComplete="street-address"
                    invalid={invalid("address")}
                  />
                </div>
              </div>
            )}

            {agencyStep === 3 && (
              <div className="space-y-4">
                <StepHeader
                  eyebrow={tAgency("eyebrow", { current: 3, total: AGENCY_STEPS })}
                  title={tAgency("step3Title")}
                  subtitle={tAgency("step3Subtitle")}
                />
                <div className={`grid grid-cols-2 gap-3 ${cardClass}`} role="group" aria-label={tAgency("step3Title")}>
                  {TEAM_SIZES.map((size) => (
                    <button
                      key={size}
                      type="button"
                      aria-pressed={teamSize === size}
                      onClick={() => setTeamSize(size)}
                      className={`p-4 rounded-2xl border-2 text-center font-bold text-sm transition ${FOCUS_RING} ${
                        teamSize === size
                          ? "border-primary bg-primary text-white shadow-xs"
                          : "border-tertiary/70 bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
                      }`}
                    >
                      {tAgency(`teamSizes.${size}`)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {agencyStep === 4 && (
              <div className="space-y-4">
                <StepHeader
                  eyebrow={tAgency("eyebrow", { current: 4, total: AGENCY_STEPS })}
                  title={tAgency("step4Title")}
                  subtitle={tAgency("step4Subtitle")}
                />
                <TeamInvitesEditor
                  idPrefix="agency"
                  invites={teamInvites}
                  setInvites={setTeamInvites}
                  placeholder={tAgency("invitePlaceholder")}
                  managerLabel={t("team.roles.agencyManager")}
                  adminLabel={t("team.roles.agencyAdmin")}
                  addLabel={t("team.addTeammate")}
                />
              </div>
            )}

            {agencyStep === 5 && (
              <div className="space-y-4">
                <StepHeader
                  eyebrow={tAgency("eyebrow", { current: 5, total: AGENCY_STEPS })}
                  title={tAgency("step5Title")}
                  subtitle={tAgency("step5Subtitle")}
                />
                <div className={`space-y-3 text-xs ${cardClass}`}>
                  <dl className="space-y-3">
                    <ReviewRow label={tAgency("review.name")} valueClassName="font-bold text-primary">
                      {businessName || t("review.empty")}
                    </ReviewRow>
                    <ReviewRow label={tAgency("review.license")} valueClassName="font-mono font-bold text-primary">
                      {regNumber || t("review.empty")}
                    </ReviewRow>
                    <ReviewRow label={tAgency("review.email")}>{businessEmail || t("review.empty")}</ReviewRow>
                    <ReviewRow label={tAgency("review.category")}>{businessTypeLabel(businessType)}</ReviewRow>
                  </dl>

                  <Notice
                    icon={<BrandShieldIcon size={16} />}
                    title={tAgency("verificationTitle")}
                    className="bg-amber-50 border-amber-200 text-amber-900"
                  >
                    {tAgency("verificationNotice")}
                  </Notice>

                  <div className="pt-3">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      aria-busy={isSubmitting}
                      onClick={handleRegisterAgency}
                      className={`w-full py-3 font-bold text-sm shadow-sm ${primaryButton}`}
                    >
                      {isSubmitting ? tAgency("creatingAgency") : tAgency("createAgency")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* HOTEL REGISTRATION FLOW (Steps H1 - H7) */}
        {isHotelFlow && (
          <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
            {hotelStep === 1 && (
              <div className="space-y-5">
                <StepHeader
                  eyebrow={t("hotel.s1.eyebrow", { current: 1, total: HOTEL_STEPS })}
                  title={t("hotel.s1.title")}
                  subtitle={t("hotel.s1.subtitle")}
                />
                <div className={`space-y-4 ${cardClass}`}>
                  <TextField
                    id="hotel-name"
                    label={t("hotel.name")}
                    value={hotelName}
                    onValueChange={setHotelName}
                    placeholder={t("hotel.namePlaceholder")}
                    autoComplete="organization"
                    invalid={invalid("name")}
                  />
                  <div>
                    <p id="hotel-stars-label" className={labelClass}>
                      {t("hotel.stars")}
                    </p>
                    <div className="grid grid-cols-5 gap-2 pt-1" role="group" aria-labelledby="hotel-stars-label">
                      {[1, 2, 3, 4, 5].map((stars) => (
                        <button
                          key={stars}
                          type="button"
                          aria-pressed={hotelStarRating === stars}
                          onClick={() => setHotelStarRating(stars)}
                          className={`py-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition ${FOCUS_RING} ${
                            hotelStarRating === stars
                              ? "border-primary bg-primary text-white shadow-xs"
                              : "border-tertiary/70 bg-neutral-50 text-neutral-700 hover:bg-neutral-100"
                          }`}
                        >
                          <span className="flex items-center text-accent">
                            {Array.from({ length: stars }).map((_, i) => (
                              <BrandStarIcon key={i} size={13} className="fill-accent text-accent" />
                            ))}
                          </span>
                          <span className="text-[11px] font-bold">{t("hotel.starCount", { count: stars })}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {hotelStep === 2 && (
              <div className="space-y-5">
                <StepHeader
                  eyebrow={t("hotel.s2.eyebrow", { current: 2, total: HOTEL_STEPS })}
                  title={t("hotel.s2.title")}
                />
                <div className={`space-y-4 ${cardClass}`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <TextField
                      id="hotel-reg"
                      label={t("org.commercialRegister")}
                      value={hotelRegNumber}
                      onValueChange={setHotelRegNumber}
                      placeholder={t("org.regPlaceholder")}
                      mono
                      invalid={invalid("reg")}
                    />
                    <TextField
                      id="hotel-tax"
                      label={t("org.taxId")}
                      value={hotelTaxId}
                      onValueChange={setHotelTaxId}
                      placeholder={t("org.taxIdPlaceholder")}
                      mono
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <TextField
                      id="hotel-checkin"
                      label={t("hotel.checkIn")}
                      value={checkInTime}
                      onValueChange={setCheckInTime}
                      placeholder="15:00"
                      dir="ltr"
                    />
                    <TextField
                      id="hotel-checkout"
                      label={t("hotel.checkOut")}
                      value={checkOutTime}
                      onValueChange={setCheckOutTime}
                      placeholder="12:00"
                      dir="ltr"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <TextField
                      id="hotel-email"
                      type="email"
                      label={t("hotel.email")}
                      value={hotelEmail}
                      onValueChange={setHotelEmail}
                      placeholder={t("hotel.emailPlaceholder")}
                      autoComplete="email"
                      invalid={invalid("email")}
                    />
                    <TextField
                      id="hotel-phone"
                      type="tel"
                      label={t("hotel.phone")}
                      value={hotelPhone}
                      onValueChange={setHotelPhone}
                      placeholder={t("org.phonePlaceholder")}
                      autoComplete="tel"
                      dir="ltr"
                      mono
                      invalid={invalid("phone")}
                    />
                  </div>
                  <div>
                    <p id="hotel-amenities-label" className={`${labelClass} mb-2`}>
                      {t("hotel.amenitiesLabel")}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="group" aria-labelledby="hotel-amenities-label">
                      {HOTEL_AMENITY_IDS.map((id) => {
                        const isSelected = hotelAmenities.includes(id);
                        return (
                          <ToggleChip
                            key={id}
                            pressed={isSelected}
                            onToggle={() =>
                              setHotelAmenities((prev) =>
                                isSelected ? prev.filter((a) => a !== id) : [...prev, id]
                              )
                            }
                          >
                            {t(`hotel.amenities.${id}`)}
                          </ToggleChip>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {hotelStep === 3 && (
              <div className="space-y-5 animate-in fade-in">
                <StepHeader
                  eyebrow={t("hotel.s3.eyebrow", { current: 3, total: HOTEL_STEPS })}
                  title={t("hotel.s3.title")}
                  subtitle={t("hotel.s3.subtitle")}
                />
                <div className={`space-y-4 ${cardClass}`}>
                  <LocationFields
                    idPrefix="hotel"
                    tone="muted"
                    wilaya={hotelWilaya}
                    onWilayaChange={(value, coords) => {
                      setHotelWilaya(value);
                      setHotelLatlng(coords);
                    }}
                    city={hotelCity}
                    onCityChange={setHotelCity}
                    cityPlaceholder={t("hotel.cityPlaceholder")}
                    street={hotelAddress}
                    onStreetChange={setHotelAddress}
                    streetLabel={t("location.exactStreet")}
                    streetPlaceholder={t("hotel.streetPlaceholder")}
                    latlng={hotelLatlng}
                    invalidStreet={invalid("address")}
                  />
                </div>
              </div>
            )}

            {hotelStep === 4 && (
              <div className="space-y-5 animate-in fade-in">
                <StepHeader
                  eyebrow={t("hotel.s4.eyebrow", { current: 4, total: HOTEL_STEPS })}
                  title={t("photos.orgTitle")}
                  subtitle={t("photos.hotelSubtitle")}
                />
                <div className={cardClass}>
                  <PhotoGalleryEditor
                    idPrefix="hotel"
                    photos={hotelPhotos}
                    onRemove={(index) => removePhoto(hotelPhotos, index, setHotelPhotos)}
                    urlValue={hotelCustomPhotoUrl}
                    onUrlChange={setHotelCustomPhotoUrl}
                    onAddUrl={() =>
                      addPhotoFromUrl(hotelCustomPhotoUrl, setHotelPhotos, () => setHotelCustomPhotoUrl(""))
                    }
                    presets={HOTEL_PHOTO_PRESETS}
                    onAddPreset={(src) => setHotelPhotos((prev) => [...prev, src])}
                    invalid={invalid("photos")}
                  />
                </div>
              </div>
            )}

            {hotelStep === 5 && (
              <div className="space-y-5">
                <StepHeader
                  eyebrow={t("hotel.s5.eyebrow", { current: 5, total: HOTEL_STEPS })}
                  title={t("bookingMode.title")}
                />
                <BookingModeChooser
                  value={hotelBookingMode}
                  onChange={setHotelBookingMode}
                  instantTitle={t("bookingMode.instant")}
                  instantDesc={t("bookingMode.hotelInstantDesc")}
                  requestDesc={t("bookingMode.hotelRequestDesc")}
                />
              </div>
            )}

            {hotelStep === 6 && (
              <div className="space-y-5">
                <StepHeader
                  eyebrow={t("hotel.s6.eyebrow", { current: 6, total: HOTEL_STEPS })}
                  title={t("hotel.s6.title")}
                  subtitle={t("hotel.s6.subtitle")}
                />
                <TeamInvitesEditor
                  idPrefix="hotel"
                  invites={hotelTeamInvites}
                  setInvites={setHotelTeamInvites}
                  placeholder={t("hotel.invitePlaceholder")}
                  managerLabel={t("team.roles.hotelManager")}
                  adminLabel={t("team.roles.hotelAdmin")}
                  addLabel={t("team.addHotelMember")}
                />
              </div>
            )}

            {hotelStep === 7 && (
              <div className="space-y-4">
                <StepHeader
                  eyebrow={t("hotel.s7.eyebrow", { current: 7, total: HOTEL_STEPS })}
                  title={t("hotel.s7.title")}
                />
                <div className={`space-y-3 text-xs ${cardClass}`}>
                  <dl className="space-y-3">
                    <ReviewRow label={t("hotel.review.name")} valueClassName="font-bold text-primary">
                      {hotelName || t("review.empty")}
                    </ReviewRow>
                    <ReviewRow
                      label={t("hotel.review.classification")}
                      valueClassName="text-accent-700 font-bold inline-flex items-center gap-1"
                    >
                      {Array.from({ length: hotelStarRating }).map((_, i) => (
                        <BrandStarIcon key={i} size={14} className="text-accent" />
                      ))}
                      <span>{t("hotel.starCount", { count: hotelStarRating })}</span>
                    </ReviewRow>
                    <ReviewRow label={t("hotel.review.totalRooms")} valueClassName="font-mono font-bold text-primary">
                      {t("hotel.review.rooms", { count: hotelTotalRooms })}
                    </ReviewRow>
                    <ReviewRow label={t("org.registerSummary")} valueClassName="font-mono font-bold text-primary">
                      {hotelRegNumber || t("review.empty")}
                    </ReviewRow>
                    <ReviewRow label={t("org.bookingModeSummary")} valueClassName="font-bold text-emerald-700">
                      {t(`bookingMode.${hotelBookingMode}`)}
                    </ReviewRow>
                  </dl>

                  <Notice
                    icon={<BrandShieldIcon size={16} />}
                    title={t("hotel.notice.title")}
                    className="bg-blue-50 border-blue-200 text-blue-900"
                  >
                    {t("hotel.notice.body")}
                  </Notice>

                  <div className="pt-3">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      aria-busy={isSubmitting}
                      onClick={handleRegisterHotel}
                      className={`w-full py-3 font-bold text-sm shadow-sm ${primaryButton}`}
                    >
                      {isSubmitting ? t("hotel.registering") : t("hotel.register")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* HOSTEL REGISTRATION FLOW (Steps B1 - B7) */}
        {isHostelFlow && (
          <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
            {hostelStep === 1 && (
              <div className="space-y-5">
                <StepHeader
                  eyebrow={t("hostel.s1.eyebrow", { current: 1, total: HOSTEL_STEPS })}
                  title={t("hostel.s1.title")}
                  subtitle={t("hostel.s1.subtitle")}
                />
                <div className={`space-y-4 ${cardClass}`}>
                  <TextField
                    id="hostel-name"
                    label={t("hostel.name")}
                    value={hostelName}
                    onValueChange={setHostelName}
                    placeholder={t("hostel.namePlaceholder")}
                    autoComplete="organization"
                    invalid={invalid("name")}
                  />
                  <TextField
                    id="hostel-address-basic"
                    label={t("hostel.addressLabel")}
                    value={hostelAddress}
                    onValueChange={setHostelAddress}
                    placeholder={t("hostel.addressPlaceholder")}
                    autoComplete="street-address"
                  />
                </div>
              </div>
            )}

            {hostelStep === 2 && (
              <div className="space-y-5">
                <StepHeader
                  eyebrow={t("hostel.s2.eyebrow", { current: 2, total: HOSTEL_STEPS })}
                  title={t("hostel.s2.title")}
                />
                <div className={`space-y-4 ${cardClass}`}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <TextField
                      id="hostel-reg"
                      label={t("org.commercialRegister")}
                      value={hostelRegNumber}
                      onValueChange={setHostelRegNumber}
                      placeholder={t("hostel.regPlaceholder")}
                      mono
                      invalid={invalid("reg")}
                    />
                    <TextField
                      id="hostel-tax"
                      label={t("org.taxId")}
                      value={hostelTaxId}
                      onValueChange={setHostelTaxId}
                      placeholder={t("hostel.taxIdPlaceholder")}
                      mono
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <TextField
                      id="hostel-email"
                      type="email"
                      label={t("hostel.email")}
                      value={hostelEmail}
                      onValueChange={setHostelEmail}
                      placeholder={t("hostel.emailPlaceholder")}
                      autoComplete="email"
                      invalid={invalid("email")}
                    />
                    <TextField
                      id="hostel-phone"
                      type="tel"
                      label={t("hostel.phone")}
                      value={hostelPhone}
                      onValueChange={setHostelPhone}
                      placeholder={t("hostel.phonePlaceholder")}
                      autoComplete="tel"
                      dir="ltr"
                      mono
                      invalid={invalid("phone")}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <TextField
                      id="hostel-curfew"
                      label={t("hostel.curfew")}
                      value={curfewPolicy}
                      onValueChange={setCurfewPolicy}
                      placeholder={t("hostel.curfewDefault")}
                    />
                    <TextField
                      id="hostel-age"
                      label={t("hostel.age")}
                      value={agePolicy}
                      onValueChange={setAgePolicy}
                      placeholder={t("hostel.ageDefault")}
                    />
                  </div>
                  <div>
                    <p id="hostel-facilities-label" className={`${labelClass} mb-2`}>
                      {t("hostel.facilitiesLabel")}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="group" aria-labelledby="hostel-facilities-label">
                      {HOSTEL_FACILITY_IDS.map((id) => {
                        const isSelected = hostelFacilities.includes(id);
                        return (
                          <ToggleChip
                            key={id}
                            pressed={isSelected}
                            onToggle={() =>
                              setHostelFacilities((prev) =>
                                isSelected ? prev.filter((f) => f !== id) : [...prev, id]
                              )
                            }
                          >
                            {t(`hostel.facilities.${id}`)}
                          </ToggleChip>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {hostelStep === 3 && (
              <div className="space-y-5 animate-in fade-in">
                <StepHeader
                  eyebrow={t("hostel.s3.eyebrow", { current: 3, total: HOSTEL_STEPS })}
                  title={t("hostel.s3.title")}
                  subtitle={t("hostel.s3.subtitle")}
                />
                <div className={`space-y-4 ${cardClass}`}>
                  <LocationFields
                    idPrefix="hostel"
                    tone="muted"
                    wilaya={hostelWilaya}
                    onWilayaChange={(value, coords) => {
                      setHostelWilaya(value);
                      setHostelLatlng(coords);
                    }}
                    city={hostelCity}
                    onCityChange={setHostelCity}
                    cityPlaceholder={t("hostel.cityPlaceholder")}
                    street={hostelAddress}
                    onStreetChange={setHostelAddress}
                    streetLabel={t("location.exactStreet")}
                    streetPlaceholder={t("hostel.streetPlaceholder")}
                    latlng={hostelLatlng}
                    invalidStreet={invalid("address")}
                  />
                </div>
              </div>
            )}

            {hostelStep === 4 && (
              <div className="space-y-5 animate-in fade-in">
                <StepHeader
                  eyebrow={t("hostel.s4.eyebrow", { current: 4, total: HOSTEL_STEPS })}
                  title={t("photos.orgTitle")}
                  subtitle={t("photos.hostelSubtitle")}
                />
                <div className={cardClass}>
                  <PhotoGalleryEditor
                    idPrefix="hostel"
                    photos={hostelPhotos}
                    onRemove={(index) => removePhoto(hostelPhotos, index, setHostelPhotos)}
                    urlValue={hostelCustomPhotoUrl}
                    onUrlChange={setHostelCustomPhotoUrl}
                    onAddUrl={() =>
                      addPhotoFromUrl(hostelCustomPhotoUrl, setHostelPhotos, () => setHostelCustomPhotoUrl(""))
                    }
                    presets={HOSTEL_PHOTO_PRESETS}
                    onAddPreset={(src) => setHostelPhotos((prev) => [...prev, src])}
                    invalid={invalid("photos")}
                  />
                </div>
              </div>
            )}

            {hostelStep === 5 && (
              <div className="space-y-5">
                <StepHeader
                  eyebrow={t("hostel.s5.eyebrow", { current: 5, total: HOSTEL_STEPS })}
                  title={t("bookingMode.title")}
                />
                <BookingModeChooser
                  value={hostelBookingMode}
                  onChange={setHostelBookingMode}
                  instantTitle={t("bookingMode.hostelInstant")}
                  instantDesc={t("bookingMode.hostelInstantDesc")}
                  requestDesc={t("bookingMode.hostelRequestDesc")}
                />
              </div>
            )}

            {hostelStep === 6 && (
              <div className="space-y-5">
                <StepHeader
                  eyebrow={t("hostel.s6.eyebrow", { current: 6, total: HOSTEL_STEPS })}
                  title={t("hostel.s6.title")}
                  subtitle={t("team.optional")}
                />
                <TeamInvitesEditor
                  idPrefix="hostel"
                  invites={hostelTeamInvites}
                  setInvites={setHostelTeamInvites}
                  placeholder={t("hostel.invitePlaceholder")}
                  managerLabel={t("team.roles.hostelManager")}
                  adminLabel={t("team.roles.hostelAdmin")}
                  addLabel={t("team.addCrewMember")}
                />
              </div>
            )}

            {hostelStep === 7 && (
              <div className="space-y-4">
                <StepHeader
                  eyebrow={t("hostel.s7.eyebrow", { current: 7, total: HOSTEL_STEPS })}
                  title={t("hostel.s7.title")}
                />
                <div className={`space-y-3 text-xs ${cardClass}`}>
                  <dl className="space-y-3">
                    <ReviewRow label={t("hostel.review.name")} valueClassName="font-bold text-primary">
                      {hostelName || t("review.empty")}
                    </ReviewRow>
                    <ReviewRow label={t("hostel.review.totalBeds")} valueClassName="font-mono font-bold text-primary">
                      {t("hostel.review.beds", {
                        total: hostelTotalBeds,
                        dorm: hostelDormBeds,
                        private: hostelPrivateRooms,
                      })}
                    </ReviewRow>
                    <ReviewRow label={t("org.location")}>{hostelAddress || t("review.empty")}</ReviewRow>
                    <ReviewRow label={t("org.registerSummary")} valueClassName="font-mono font-bold text-primary">
                      {hostelRegNumber || t("review.empty")}
                    </ReviewRow>
                    <ReviewRow label={t("org.bookingModeSummary")} valueClassName="font-bold text-emerald-700">
                      {t(`bookingMode.${hostelBookingMode}`)}
                    </ReviewRow>
                  </dl>

                  <Notice
                    icon={<BrandShieldIcon size={16} />}
                    title={t("hostel.notice.title")}
                    className="bg-purple-50 border-purple-200 text-purple-900"
                  >
                    {t("hostel.notice.body")}
                  </Notice>

                  <div className="pt-3">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      aria-busy={isSubmitting}
                      onClick={handleRegisterHostel}
                      className={`w-full py-3 font-bold text-sm shadow-sm ${primaryButton}`}
                    >
                      {isSubmitting ? t("hostel.registering") : t("hostel.register")}
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
              <StepHeader
                eyebrow={t("step", { current: customIdx + 1, total: activeStepsCount })}
                title={customStep.title[lang] || customStep.title.en}
                subtitle={customStep.description?.[lang] || customStep.description?.en}
              />
              <div className={cardClass}>
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
      <footer className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-tertiary/60 px-4 sm:px-8 py-3.5 space-y-2">
        {/* Step validation summary (inputs reference it via aria-describedby) */}
        {stepError && (
          <p
            id={STEP_ERROR_ID}
            role="alert"
            className="max-w-4xl mx-auto px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm font-semibold text-status-error text-center"
          >
            {stepError.message}
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          {/* Back Button */}
          <div>
            {(isOrgFlow || currentStep > 0) && (
              <button
                type="button"
                onClick={handleBack}
                className={`inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-neutral-700 hover:text-primary transition ${FOCUS_RING}`}
              >
                <BrandChevronLeftIcon size={16} className="rtl:rotate-180" />
                <span>{backToChooser ? t("nav.chooseAccountType") : tCommon("back")}</span>
              </button>
            )}
          </div>

          {/* Step Indicator */}
          <p className="text-xs font-semibold text-neutral-600" aria-live="polite">
            {isChoosingHostType
              ? t("nav.selectHostMode")
              : t("step", { current: currentStepNumber, total: activeStepsCount })}
          </p>

          {/* Next / Action Button */}
          <div>
            {(() => {
              const nextButton = (id: string) => (
                <button
                  type="button"
                  id={id}
                  onClick={handleNext}
                  className={`px-6 py-2 text-xs sm:text-sm font-semibold shadow-xs ${primaryButton}`}
                >
                  {tCommon("next")}
                </button>
              );
              const submitButton = (id: string, onClick: () => void, busyLabel: string, label: string) => (
                <button
                  type="button"
                  id={id}
                  disabled={isSubmitting}
                  aria-busy={isSubmitting}
                  onClick={onClick}
                  className={`px-6 py-2.5 text-xs sm:text-sm font-bold shadow-md flex items-center gap-2 ${primaryButton}`}
                >
                  {isSubmitting ? busyLabel : label}
                </button>
              );

              if (isHotelFlow) {
                return hotelStep < HOTEL_STEPS
                  ? nextButton("hotel-next-btn")
                  : submitButton("hotel-register-footer-btn", handleRegisterHotel, t("hotel.registering"), t("hotel.register"));
              }
              if (isHostelFlow) {
                return hostelStep < HOSTEL_STEPS
                  ? nextButton("hostel-next-btn")
                  : submitButton("hostel-register-footer-btn", handleRegisterHostel, t("hostel.registering"), t("hostel.register"));
              }
              if (isAgencyFlow) {
                return agencyStep < AGENCY_STEPS
                  ? nextButton("agency-next-btn")
                  : submitButton("agency-register-footer-btn", handleRegisterAgency, tAgency("creatingAgency"), tAgency("createAgency"));
              }
              if (currentStep > 0 && currentStep < 12) return nextButton("individual-next-btn");
              if (currentStep === 12) {
                return submitButton("individual-publish-footer-btn", handlePublishListing, t("review.publishing"), t("publishListing"));
              }
              return null;
            })()}
          </div>
        </div>
      </footer>

      {/* Discard / Save & Exit 3-Button Confirm Dialog */}
      <ConfirmDialog
        isOpen={isExitDialogOpen}
        variant="discard"
        title={t("exitModalTitle")}
        message={t("exitModalDesc")}
        cancelLabel={t("keepEditing")}
        discardLabel={t("discard")}
        saveAndExitLabel={t("saveAndExit")}
        onCancel={() => setIsExitDialogOpen(false)}
        onDiscard={handleExecuteDiscard}
        onSaveAndExit={handleExecuteSaveAndExit}
        onConfirm={handleExecuteSaveAndExit}
      />
    </div>
  );
}
