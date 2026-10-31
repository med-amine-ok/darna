"use client";

import { convertDzdToEur, formatDzd, formatEur } from "@/lib/currency";
import {
  DEFAULT_COMMISSION_RATES,
  isValidPriceDzd,
  PRICE_MAX_DZD,
  PRICE_MIN_DZD,
} from "@/lib/booking/config";
import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence, m, type Variants } from "framer-motion";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/navigation";
import {
  completeHostOnboardingAction,
  HostOnboardingInput,
} from "@/app/actions/host";
import {
  clearHostDraft,
  readHostDraft,
  writeHostDraft,
} from "@/lib/client/user-storage";
import { useLoginModal } from "@/hook/useLoginModal";
import Counter from "@/components/inputs/Counter";
import { toast } from "react-toastify";
import ConfirmDialog from "@/components/models/ConfirmDialog";
import { getOnboardingSteps } from "@/lib/onboarding-config";
import { OnboardingStepConfig } from "@/types";
import DynamicStepFields from "./DynamicStepFields";
import {
  BrandAlertCircleIcon,
  BrandChevronLeftIcon,
  BrandChevronRightIcon,
  BrandPinIcon,
  BrandShieldIcon,
  BrandSparklesIcon,
  BrandUsersIcon,
} from "@/components/icons";
import {
  AnimatedNumber,
  ArchImage,
  Badge,
  Button,
  ProgressBar,
  RadioGroup,
  Select,
  SuccessCelebration,
  Switch,
  Textarea,
  cn,
  focusRing,
  useIsRtl,
} from "@/components/ui";
import { dur, ease } from "@/lib/motion";
import { imagery } from "@/lib/imagery";
import HostTypeStep, { type HostKind } from "./onboarding/HostTypeStep";
import {
  AMENITIES,
  BUSINESS_TYPES,
  CATEGORIES,
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
  ChoiceCard,
  LocationFields,
  Notice,
  PhotoGalleryEditor,
  ReviewRow,
  StarRow,
  StepHeader,
  TeamInvitesEditor,
  TextField,
  ToggleChip,
  labelClass,
} from "./onboarding/ui";
import { useActionError } from "@/hook/useActionError";

interface BecomeHostFlowProps {
  initialStep?: string;
  initialHostType?: "individual" | "agency" | "hotel" | "hostel" | null;
  /** Session user id (from the server page), used only to key the local draft. */
  currentUserId: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Step-level validation result: a translated message plus the invalid field keys. */
type StepError = { message: string; fields: string[] };

const HOTEL_STEPS = 7;
const HOSTEL_STEPS = 7;
const AGENCY_STEPS = 5;

const cardClass = "rounded-3xl bg-white p-5 shadow-e1 sm:p-6";

/**
 * Admin-config fields that the built-in step UI already covers (placement radios, capacity
 * counters, amenity cards, cancellation cards). Rendering them again showed duplicate
 * controls (audit: redundant "Space privacy" select under the radio cards).
 */
const BUILT_IN_FIELD_IDS = new Set([
  "placement",
  "guestCount",
  "bedroomCount",
  "bedsCount",
  "bathroomCount",
  "selectedAmenities",
  "cancellationPolicy",
  "instantBook",
]);

/** Moves one photo (index 0 is the cover). */
function movePhoto(list: string[], from: number, to: number): string[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

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
  const isRtl = useIsRtl();

  // Mode: "none" (host type selection), "individual" (12 steps), "agency" (5 steps), "hotel" (7 steps), "hostel" (7 steps)
  const [currentStep, setCurrentStep] = useState<number>(() => {
    const parsed = parseInt(initialStep, 10);
    return isNaN(parsed) ? 0 : parsed;
  });

  const [hostType, setHostType] = useState<
    "individual" | "agency" | "hotel" | "hostel" | null
  >(initialHostType);
  const [activeFlow, setActiveFlow] = useState<
    "none" | "individual" | "agency" | "hotel" | "hostel"
  >(() => {
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
  const [configuredSteps, setConfiguredSteps] = useState<
    OnboardingStepConfig[]
  >([]);
  const [customFieldsData, setCustomFieldsData] = useState<Record<string, any>>(
    {},
  );

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
    const extraFields = stepCfg.fields.filter((f) => !f.isCore && !BUILT_IN_FIELD_IDS.has(f.id));
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
  const [vertical, setVertical] = useState<"home" | "vehicle" | "experience">(
    "home",
  );
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
    "https://images.unsplash.com/photo-1552573033-b7bb437bf953?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1570133435807-5feefeb2d196?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1653815129496-445487ae0479?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1549145177-238518f1ec1a?auto=format&fit=crop&w=1600&q=80",
  ]);
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string>("");

  // Details (sample content is shown in the user's language)
  const [title, setTitle] = useState<string>(() => t("titleStep.default"));
  const [description, setDescription] = useState<string>(() =>
    t("descriptionStep.default"),
  );
  const [price, setPrice] = useState<number>(18500); // DZD
  const [instantBook, setInstantBook] = useState<boolean>(true);
  const [cancellationPolicy, setCancellationPolicy] = useState<
    "flexible" | "moderate" | "strict"
  >("flexible");

  // Agency Registration Form State
  const [agencyStep, setAgencyStep] = useState<number>(1);
  const [businessName, setBusinessName] = useState<string>("");
  const [businessType, setBusinessType] = useState<string>(
    "Licensed Tourism Agency",
  );
  const [regNumber, setRegNumber] = useState<string>("");
  const [businessEmail, setBusinessEmail] = useState<string>("");
  const [businessPhone, setBusinessPhone] = useState<string>("");
  const [headquarters, setHeadquarters] = useState<string>("");
  const [teamSize, setTeamSize] = useState<TeamSize>("2-10");
  const [teamInvites, setTeamInvites] = useState<TeamInvite[]>([
    { email: "", role: "manager" },
  ]);

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
  const [hotelLatlng, setHotelLatlng] = useState<[number, number]>([
    36.7538, 3.0588,
  ]);
  const [hotelPhotos, setHotelPhotos] = useState<string[]>([
    "https://images.unsplash.com/photo-1552573033-b7bb437bf953?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1653815129496-445487ae0479?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1549145177-238518f1ec1a?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1570133435807-5feefeb2d196?auto=format&fit=crop&w=1600&q=80",
  ]);
  const [hotelCustomPhotoUrl, setHotelCustomPhotoUrl] = useState<string>("");
  const [hotelPhone, setHotelPhone] = useState<string>("");
  const [hotelEmail, setHotelEmail] = useState<string>("");
  const [hotelBookingMode, setHotelBookingMode] = useState<
    "instant" | "request"
  >("instant");
  const [hotelTeamInvites, setHotelTeamInvites] = useState<TeamInvite[]>([
    { email: "", role: "manager" },
  ]);

  // Hostel Registration Form State (Section 2)
  const [hostelStep, setHostelStep] = useState<number>(1);
  const [hostelName, setHostelName] = useState<string>("");
  const [hostelCity, setHostelCity] = useState<string>("Algiers");
  const [hostelWilaya, setHostelWilaya] = useState<string>("Algiers");
  const [hostelAddress, setHostelAddress] = useState<string>("");
  const [hostelLatlng, setHostelLatlng] = useState<[number, number]>([
    36.7865, 3.0592,
  ]);
  const [hostelPhotos, setHostelPhotos] = useState<string[]>([
    "https://images.unsplash.com/photo-1552573033-b7bb437bf953?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1570133435807-5feefeb2d196?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1653815129496-445487ae0479?auto=format&fit=crop&w=1600&q=80",
    "https://images.unsplash.com/photo-1549145177-238518f1ec1a?auto=format&fit=crop&w=1600&q=80",
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
  const [curfewPolicy, setCurfewPolicy] = useState<string>(() =>
    t("hostel.curfewDefault"),
  );
  const [agePolicy, setAgePolicy] = useState<string>(() =>
    t("hostel.ageDefault"),
  );
  const [hostelRegNumber, setHostelRegNumber] = useState<string>("");
  const [hostelTaxId, setHostelTaxId] = useState<string>("");
  const [hostelEmail, setHostelEmail] = useState<string>("");
  const [hostelPhone, setHostelPhone] = useState<string>("");
  const [hostelBookingMode, setHostelBookingMode] = useState<
    "instant" | "request"
  >("instant");
  const [hostelTeamInvites, setHostelTeamInvites] = useState<TeamInvite[]>([
    { email: "", role: "manager" },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  /** Success message once the server accepted onboarding (shows the celebration screen). */
  const [completed, setCompleted] = useState<string | null>(null);
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
          if (draft.selectedAmenities)
            setSelectedAmenities(draft.selectedAmenities);
          if (draft.latlng) setLatlng(draft.latlng);
          if (typeof draft.instantBook === "boolean")
            setInstantBook(draft.instantBook);
          if (draft.cancellationPolicy)
            setCancellationPolicy(draft.cancellationPolicy);
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
            if (draft.currentStep && draft.currentStep > 0)
              setCurrentStep(draft.currentStep);
            if (draft.customFieldsData)
              setCustomFieldsData(draft.customFieldsData);
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
    clearUrl: () => void,
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
    setGallery: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    if (gallery.length <= 1) {
      toast.error(t("photos.minOne"));
      return;
    }
    setGallery((prev) => prev.filter((_, i) => i !== index));
  };

  const redirectTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(redirectTimer.current), []);
  const goToWorkspace = () => {
    clearTimeout(redirectTimer.current);
    window.location.href = `/${locale}/host`;
  };

  /**
   * Sends onboarding to the server. The server decides ids, ownership and
   * verification status and re-issues the signed session; we only redirect.
   */
  const submitOnboarding = async (
    input: HostOnboardingInput,
    successMessage: string,
  ) => {
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

      // Celebrate, then continue to the workspace (the button goes there right away).
      setCompleted(successMessage);
      setIsSubmitting(false);
      redirectTimer.current = setTimeout(() => {
        window.location.href = `/${locale}/host`;
      }, 4000);
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
    if (!fields.name.trim())
      return { message: t("errors.orgName"), fields: ["name"] };
    if (!fields.reg.trim())
      return { message: t("errors.orgReg"), fields: ["reg"] };
    if (!EMAIL_RE.test(fields.email.trim()))
      return { message: t("errors.orgEmail"), fields: ["email"] };
    if (!fields.phone.trim())
      return { message: t("errors.orgPhone"), fields: ["phone"] };
    if (!fields.address.trim())
      return { message: t("errors.orgAddress"), fields: ["address"] };
    return null;
  };

  /** Registration number + email + phone check used by the hotel/hostel step 2. */
  const contactDetailsError = (
    reg: string,
    email: string,
    phone: string,
  ): StepError | null => {
    const fields = [
      !reg.trim() && "reg",
      !EMAIL_RE.test(email.trim()) && "email",
      !phone.trim() && "phone",
    ].filter(Boolean) as string[];
    return fields.length
      ? { message: t("errors.contactDetails"), fields }
      : null;
  };

  const handlePublishListing = async () => {
    let finalPhotos = [...photos];
    if (finalPhotos.length < 4) {
      finalPhotos = [
        "https://images.unsplash.com/photo-1552573033-b7bb437bf953?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1570133435807-5feefeb2d196?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1653815129496-445487ae0479?auto=format&fit=crop&w=1600&q=80",
        "https://images.unsplash.com/photo-1549145177-238518f1ec1a?auto=format&fit=crop&w=1600&q=80",
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
        // Content fields only, ownership/ids/ratings are set on the server.
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
      t("review.published"),
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
      tAgency("success"),
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

    const finalHotelPhotos =
      hotelPhotos.length >= 4
        ? hotelPhotos
        : [
            "https://images.unsplash.com/photo-1552573033-b7bb437bf953?auto=format&fit=crop&w=1600&q=80",
            "https://images.unsplash.com/photo-1653815129496-445487ae0479?auto=format&fit=crop&w=1600&q=80",
            "https://images.unsplash.com/photo-1549145177-238518f1ec1a?auto=format&fit=crop&w=1600&q=80",
            "https://images.unsplash.com/photo-1570133435807-5feefeb2d196?auto=format&fit=crop&w=1600&q=80",
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
              description:
                "Comfortable double room with city view, king bed and marble bath.",
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
              description:
                "Spacious luxury suite with separate sitting lounge and panoramic views.",
              amenities: [
                "wifi",
                "air_conditioning",
                "breakfast",
                "pool",
                "spa",
              ],
              bookingUnit: "room",
              imageSrc: finalHotelPhotos.slice(1, 3),
              inventoryCount: 8,
              totalInventory: 8,
            },
          ],
        },
      },
      t("hotel.success"),
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

    const finalHostelPhotos =
      hostelPhotos.length >= 4
        ? hostelPhotos
        : [
            "https://images.unsplash.com/photo-1552573033-b7bb437bf953?auto=format&fit=crop&w=1600&q=80",
            "https://images.unsplash.com/photo-1570133435807-5feefeb2d196?auto=format&fit=crop&w=1600&q=80",
            "https://images.unsplash.com/photo-1653815129496-445487ae0479?auto=format&fit=crop&w=1600&q=80",
            "https://images.unsplash.com/photo-1549145177-238518f1ec1a?auto=format&fit=crop&w=1600&q=80",
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
              description:
                "Individual bunk bed in a spacious, climate-controlled 6-bed dormitory with privacy curtain and personal secure locker.",
              amenities: [
                "wifi",
                "air_conditioning",
                "shared_kitchen",
                "lockers",
              ],
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
              description:
                "Cozy private room with queen bed, ensuite shower, desk, and peaceful courtyard view.",
              amenities: ["wifi", "air_conditioning", "breakfast"],
              bookingUnit: "room",
              imageSrc: finalHostelPhotos.slice(1, 3),
              inventoryCount: 4,
              totalInventory: 4,
            },
          ],
        },
      },
      t("hostel.success"),
    );
  };

  /** Footer "Next": validates the current step, then advances. */
  const handleNext = () => {
    if (isHotelFlow) {
      if (hotelStep === 1 && !hotelName.trim()) {
        return setStepError({
          message: t("errors.hotelName"),
          fields: ["name"],
        });
      }
      if (hotelStep === 2) {
        const error = contactDetailsError(
          hotelRegNumber,
          hotelEmail,
          hotelPhone,
        );
        if (error) return setStepError(error);
      }
      if (hotelStep === 3 && !hotelAddress.trim()) {
        return setStepError({
          message: t("errors.hotelAddress"),
          fields: ["address"],
        });
      }
      if (hotelStep === 4 && hotelPhotos.length < 4) {
        return setStepError({
          message: t("errors.minPhotos"),
          fields: ["photos"],
        });
      }
      setHotelStep((prev) => prev + 1);
      return;
    }
    if (isHostelFlow) {
      if (hostelStep === 1 && !hostelName.trim()) {
        return setStepError({
          message: t("errors.hostelName"),
          fields: ["name"],
        });
      }
      if (hostelStep === 2) {
        const error = contactDetailsError(
          hostelRegNumber,
          hostelEmail,
          hostelPhone,
        );
        if (error) return setStepError(error);
      }
      if (hostelStep === 3 && !hostelAddress.trim()) {
        return setStepError({
          message: t("errors.hostelAddress"),
          fields: ["address"],
        });
      }
      if (hostelStep === 4 && hostelPhotos.length < 4) {
        return setStepError({
          message: t("errors.minPhotos"),
          fields: ["photos"],
        });
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
        fields: [!city.trim() && "city", !address.trim() && "street"].filter(
          Boolean,
        ) as string[],
      });
    }
    if (currentStep === 8 && !title.trim()) {
      return setStepError({ message: t("errors.title"), fields: ["title"] });
    }
    setCurrentStep((prev) => prev + 1);
  };

  /** Footer "Back": previous step, or back to the host-type chooser from an org flow's first step. */
  const orgStep = isHotelFlow
    ? hotelStep
    : isHostelFlow
      ? hostelStep
      : isAgencyFlow
        ? agencyStep
        : 0;
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
    1,
  );

  const currentStepNumber = isOrgFlow ? orgStep : currentStep;
  const isChoosingHostType = currentStep === 0 && !isOrgFlow;
  const isIndividualStep = (n: number) => currentStep === n && !isOrgFlow;

  const progressPercent = isChoosingHostType
    ? 0
    : Math.min(100, Math.round((currentStepNumber / activeStepsCount) * 100));

  // Direction-aware step transitions: forward slides in from the reading end, back from the start.
  const position = isChoosingHostType ? 0 : currentStepNumber;
  const [stepNav, setStepNav] = useState<{ pos: number; dir: 1 | -1 }>({ pos: position, dir: 1 });
  if (stepNav.pos !== position) setStepNav({ pos: position, dir: position > stepNav.pos ? 1 : -1 });
  const direction = stepNav.pos !== position ? (position > stepNav.pos ? 1 : -1) : stepNav.dir;

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
  const commission = Math.round(
    (price * DEFAULT_COMMISSION_RATES.individual) / 100,
  );
  const payout = Math.round(
    (price * (100 - DEFAULT_COMMISSION_RATES.individual)) / 100,
  );
  const lang = (["en", "fr", "ar"].includes(locale) ? locale : "en") as
    | "en"
    | "fr"
    | "ar";

  const flowBadge = isHotelFlow
    ? t("header.hotel")
    : isHostelFlow
      ? t("header.hostel")
      : isAgencyFlow
        ? t("header.agency")
        : t("header.becomeHost");

  /* Wizard chrome ---------------------------------------------------- */
  const flowTotal = isHotelFlow
    ? HOTEL_STEPS
    : isHostelFlow
      ? HOSTEL_STEPS
      : isAgencyFlow
        ? AGENCY_STEPS
        : activeStepsCount;
  const stepLabel = t("step", { current: currentStepNumber, total: flowTotal });

  const stepKey = isChoosingHostType ? "choose" : `${activeFlow}-${currentStepNumber}`;
  const mirror = isRtl ? -1 : 1;
  const stepVariants: Variants = {
    enter: (d: number) => ({ opacity: 0, x: d * mirror * 36 }),
    center: { opacity: 1, x: 0, transition: { duration: dur.slow, ease: ease.out } },
    exit: (d: number) => ({ opacity: 0, x: -d * mirror * 24, transition: { duration: dur.fast, ease: ease.standard } }),
  };

  // Live preview beside the form (lg+) while the host is filling in details.
  const showPreview =
    !completed &&
    ((activeFlow === "individual" && currentStep >= 2 && currentStep <= 11) ||
      (isHotelFlow && hotelStep <= 6) ||
      (isHostelFlow && hostelStep <= 6));

  const unitLabel = t(`units.${vertical}`);
  const previewCard = isHotelFlow ? (
    <LivePreviewCard
      photo={hotelPhotos[0]}
      badge={t("header.hotel")}
      title={hotelName.trim() || t("preview.hotelPlaceholder")}
      kicker={t("review.location", { city: hotelCity, wilaya: wilayaLabel(hotelWilaya) })}
      extra={
        <span className="flex items-center gap-2 text-meta text-primary-600">
          <StarRow count={hotelStarRating} />
          <span>{t("hotel.review.rooms", { count: hotelTotalRooms })}</span>
        </span>
      }
    />
  ) : isHostelFlow ? (
    <LivePreviewCard
      photo={hostelPhotos[0]}
      badge={t("header.hostel")}
      title={hostelName.trim() || t("preview.hostelPlaceholder")}
      kicker={t("review.location", { city: hostelCity, wilaya: wilayaLabel(hostelWilaya) })}
      extra={<span className="text-meta text-primary-600">{t("preview.beds", { count: hostelTotalBeds })}</span>}
    />
  ) : (
    <LivePreviewCard
      photo={photos[0]}
      badge={categoryLabel(category)}
      title={title.trim() || t("preview.titlePlaceholder")}
      kicker={t("review.location", { city, wilaya: wilayaLabel(wilaya) })}
      extra={
        <span className="block space-y-0.5">
          <span className="block text-meta text-primary-600">
            {t("counts.guests", { count: guestCount })} · {t("counts.bedrooms", { count: bedroomCount })}
          </span>
          <span className="block pt-1 text-[0.9375rem] text-primary-900">
            <span className="font-semibold tabular-nums">{formatDzd(price, locale)}</span>{" "}
            <span className="text-primary-600">{unitLabel}</span>
          </span>
        </span>
      }
    />
  );

  /* Footer actions ---------------------------------------------------- */
  const nextButton = (id: string) => (
    <Button
      type="button"
      id={id}
      onClick={handleNext}
      size="lg"
      trailingIcon={<BrandChevronRightIcon size={18} aria-hidden="true" className="rtl:rotate-180" />}
    >
      {tCommon("next")}
    </Button>
  );
  const submitButton = (id: string, onClick: () => void, busyLabel: string, label: string) => (
    <Button type="button" id={id} size="lg" loading={isSubmitting} aria-busy={isSubmitting} onClick={onClick}>
      {isSubmitting ? busyLabel : label}
    </Button>
  );
  const primaryAction = (() => {
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
    if (currentStep === 1)
      return (
        <Button type="button" id="get-started-btn" size="lg" onClick={() => setCurrentStep(2)}>
          {t("intro.getStarted")}
        </Button>
      );
    if (currentStep > 1 && currentStep < 12) return nextButton("individual-next-btn");
    if (currentStep === 12) {
      return submitButton("individual-publish-footer-btn", handlePublishListing, t("review.publishing"), t("publishListing"));
    }
    return null;
  })();

  return (
    <div className="flex min-h-[100dvh] flex-col bg-darnaBg">
      {/* Top bar + progress */}
      <header className="glass sticky top-0 z-header border-b border-primary/[0.08]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className={cn("flex shrink-0 items-center rounded-xl", focusRing)}>
              <Image
                src="/assets/logo-horizontal.png"
                alt={t("header.logoAlt")}
                width={120}
                height={38}
                priority
                className="h-7 w-auto object-contain sm:h-8"
              />
            </Link>
            <Badge tone="sand" size="md" className="hidden sm:inline-flex">
              {flowBadge}
            </Badge>
          </div>
          {!completed && (
            <Button type="button" variant="tertiary" size="sm" onClick={handleHeaderExitClick}>
              {t("saveAndExit")}
            </Button>
          )}
        </div>
        {!isChoosingHostType && !completed && (
          <div className="mx-auto max-w-6xl px-4 pb-3 sm:px-6 lg:px-8">
            <ProgressBar value={progressPercent} label={stepLabel} showLabel showValue size="sm" />
          </div>
        )}
      </header>

      {/* Main form content */}
      <main
        ref={mainRef}
        className={cn(
          "mx-auto w-full max-w-6xl flex-1 px-4 pt-8 sm:px-6 sm:pt-12 lg:px-8",
          completed ? "pb-16" : "pb-36 sm:pb-40",
        )}
      >
        {completed ? (
          <div className="mx-auto flex max-w-xl flex-col items-center py-10 sm:py-16">
            <SuccessCelebration
              title={<span className="block font-serif text-display-md font-normal text-primary-900">{completed}</span>}
              description={<span className="block text-body-lg text-primary-600">{t("complete.redirecting")}</span>}
              actions={
                <Button type="button" size="lg" onClick={goToWorkspace}>
                  {t("complete.cta")}
                </Button>
              }
            />
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-10",
              showPreview && "lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-14",
            )}
          >
            <div className="min-w-0">
              <AnimatePresence mode="wait" initial={false} custom={direction}>
                <m.div key={stepKey} custom={direction} variants={stepVariants} initial="enter" animate="center" exit="exit">
                  {/* STEP 0: 4-WAY HOST-TYPE SELECTION (Section 2) */}
                  {isChoosingHostType && <HostTypeStep onSelect={handleSelectHostType} />}

                  {/* INDIVIDUAL FLOW: STEP 1 - INTRO */}
                  {isIndividualStep(1) && (
                    <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-[1fr_0.75fr]">
                      <div className="space-y-8">
                        <StepHeader
                          level={1}
                          size="lg"
                          eyebrow={t("intro.eyebrow")}
                          title={t("intro.title")}
                          subtitle={t("intro.subtitle")}
                        />
                        <ol className="space-y-3">
                          {([1, 2, 3] as const).map((n) => (
                            <li key={n} className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-e1">
                              <span
                                aria-hidden="true"
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tertiary-100 font-serif text-title text-primary-900"
                              >
                                {n}
                              </span>
                              <div>
                                <div className="text-title text-primary-900">{t(`intro.step${n}Title`)}</div>
                                <div className="mt-0.5 text-body text-primary-600">{t(`intro.step${n}Desc`)}</div>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                      <div className="mx-auto hidden w-full max-w-xs lg:block">
                        <ArchImage
                          src={`${imagery.riadCourtyard}?auto=format&fit=crop&w=900&q=80`}
                          alt={t("intro.imageAlt")}
                          sizes="(min-width: 1024px) 640px, 0px"
                        />
                      </div>
                    </div>
                  )}

                  {/* INDIVIDUAL FLOW: STEP 2 - PROPERTY TYPE / CATEGORY */}
                  {isIndividualStep(2) && (
                    <div className="space-y-8">
                      <StepHeader title={t("step1Title")} subtitle={t("step1Subtitle")} />
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                        {CATEGORIES.map((item) => {
                          const Icon = item.icon;
                          return (
                            <ChoiceCard
                              key={item.id}
                              size="sm"
                              selected={category === item.value}
                              onSelect={() => {
                                setCategory(item.value);
                                setVertical(item.vertical);
                              }}
                              icon={<Icon size={22} aria-hidden="true" />}
                              title={<span className="text-body font-semibold">{t(`categories.${item.id}`)}</span>}
                              description={t(`verticals.${item.vertical}`)}
                            />
                          );
                        })}
                      </div>
                      {renderDynamicFieldsForStep("category_vertical")}
                    </div>
                  )}

                  {/* INDIVIDUAL FLOW: STEP 3 - PLACEMENT */}
                  {isIndividualStep(3) && (
                    <div className="space-y-8">
                      <StepHeader title={t("placement.title")} subtitle={t("placement.subtitle")} />
                      <RadioGroup
                        legend={t("placement.title")}
                        hideLegend
                        name="placement"
                        appearance="card"
                        value={placement}
                        onChange={setPlacement}
                        options={(["entire", "private", "shared"] as const).map((id) => ({
                          value: id,
                          label: t(`placement.${id}.title`),
                          description: t(`placement.${id}.desc`),
                        }))}
                      />
                      {renderDynamicFieldsForStep("placement")}
                    </div>
                  )}

                  {/* INDIVIDUAL FLOW: STEP 4 - LOCATION & MAP PIN */}
                  {isIndividualStep(4) && (
                    <div className="space-y-8">
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
                    <div className="space-y-8">
                      <StepHeader title={t("step3Title")} subtitle={t("step3Subtitle")} />
                      <div className="divide-y divide-primary/[0.06] rounded-3xl bg-white px-5 shadow-e1 sm:px-6">
                        {(
                          [
                            ["guests", "capacity.guestsHint", guestCount, setGuestCount],
                            ["bedrooms", "capacity.bedroomsHint", bedroomCount, setBedroomCount],
                            ["beds", "capacity.bedsHint", bedsCount, setBedsCount],
                            ["bathrooms", "capacity.bathroomsHint", bathroomCount, setBathroomCount],
                          ] as const
                        ).map(([key, hint, value, setter]) => (
                          <div key={key} className="py-4">
                            <Counter title={t(key)} subtitle={t(hint)} value={value} onChange={setter} />
                          </div>
                        ))}
                      </div>
                      <p
                        aria-live="polite"
                        className="rounded-2xl bg-tertiary-100 px-4 py-3 text-center text-body font-medium text-primary-800"
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
                    <div className="space-y-8">
                      <StepHeader title={t("step4Title")} subtitle={t("step4Subtitle")} />
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                        {AMENITIES.map((amenity) => {
                          const Icon = amenity.icon;
                          const isChecked = selectedAmenities.includes(amenity.id);
                          return (
                            <ChoiceCard
                              key={amenity.id}
                              size="sm"
                              selected={isChecked}
                              onSelect={() =>
                                setSelectedAmenities((prev) =>
                                  isChecked ? prev.filter((id) => id !== amenity.id) : [...prev, amenity.id],
                                )
                              }
                              icon={<Icon size={22} aria-hidden="true" />}
                              title={<span className="text-body font-semibold">{t(`amenities.${amenity.id}`)}</span>}
                            />
                          );
                        })}
                      </div>
                      {renderDynamicFieldsForStep("amenities")}
                    </div>
                  )}

                  {/* INDIVIDUAL FLOW: STEP 7 - PHOTOS GALLERY */}
                  {isIndividualStep(7) && (
                    <div className="space-y-8">
                      <StepHeader title={t("photos.title")} subtitle={t("photos.subtitle")} />
                      <PhotoGalleryEditor
                        idPrefix="listing"
                        photos={photos}
                        onRemove={(index) => removePhoto(photos, index, setPhotos)}
                        onReorder={(from, to) => setPhotos((prev) => movePhoto(prev, from, to))}
                        urlValue={customPhotoUrl}
                        onUrlChange={setCustomPhotoUrl}
                        onAddUrl={() => addPhotoFromUrl(customPhotoUrl, setPhotos, () => setCustomPhotoUrl(""))}
                        onAddDroppedUrl={(url) => addPhotoFromUrl(url, setPhotos, () => undefined)}
                        presets={LISTING_PHOTO_PRESETS}
                        onAddPreset={(src) => setPhotos((prev) => [...prev, src])}
                      />
                      {renderDynamicFieldsForStep("photos")}
                    </div>
                  )}

                  {/* INDIVIDUAL FLOW: STEP 8 - TITLE */}
                  {isIndividualStep(8) && (
                    <div className="space-y-8">
                      <StepHeader title={t("titleStep.title")} subtitle={t("titleStep.subtitle")} />
                      <Textarea
                        id="listing-title"
                        label={t("titleStep.label")}
                        rows={2}
                        value={title}
                        maxLength={60}
                        showCount
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={t("titlePlaceholder")}
                        helper={t("titleStep.tip")}
                        aria-invalid={invalid("title") || undefined}
                        aria-describedby={invalid("title") ? STEP_ERROR_ID : undefined}
                        className="min-h-[6rem] text-title"
                      />
                      <div className="space-y-3" role="group" aria-labelledby="title-ideas">
                        <p id="title-ideas" className="text-meta font-semibold text-primary-800">
                          {t("titleStep.ideas")}
                        </p>
                        <div className="flex flex-col gap-2">
                          {(["chenoua", "casbah", "tassili"] as const).map((key) => {
                            const suggestion = t(`titleStep.suggestions.${key}`);
                            const active = title === suggestion;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setTitle(suggestion)}
                                aria-pressed={active}
                                className={cn(
                                  "flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-start text-body text-primary-800 shadow-e1",
                                  "transition-[box-shadow,transform] duration-base ease-out hover:-translate-y-0.5 hover:shadow-e2",
                                  active && "ring-2 ring-primary-800",
                                  focusRing,
                                )}
                              >
                                <span>&ldquo;{suggestion}&rdquo;</span>
                                <BrandSparklesIcon size={16} aria-hidden="true" className="shrink-0 text-accent-600" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* INDIVIDUAL FLOW: STEP 9 - DESCRIPTION */}
                  {isIndividualStep(9) && (
                    <div className="space-y-8">
                      <StepHeader title={t("descriptionStep.title")} subtitle={t("descriptionStep.subtitle")} />
                      <Textarea
                        id="listing-description"
                        label={t("descriptionStep.label")}
                        rows={7}
                        value={description}
                        maxLength={500}
                        showCount
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder={t("descPlaceholder")}
                        helper={t("descriptionStep.tip")}
                      />
                      {renderDynamicFieldsForStep("title_description")}
                    </div>
                  )}

                  {/* INDIVIDUAL FLOW: STEP 10 - PRICING & EARNINGS ESTIMATE */}
                  {isIndividualStep(10) && (
                    <div className="space-y-8">
                      <StepHeader title={t("step7Title")} subtitle={t("step7Subtitle")} />
                      <div className="space-y-6 rounded-3xl bg-white p-6 text-center shadow-e1 sm:p-8">
                        <label htmlFor="listing-price" className="block text-meta font-semibold text-primary-700">
                          {t(`pricing.priceLabel.${vertical}`)}
                        </label>
                        <div className="flex items-baseline justify-center gap-3" dir="ltr">
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
                            className={cn(
                              "w-52 rounded-none border-b-2 border-primary-800 bg-transparent text-center font-serif text-display-lg font-normal tabular-nums text-primary-900",
                              "focus:outline-none focus-visible:border-accent-600 aria-[invalid=true]:border-accent-700",
                            )}
                          />
                          <span className="text-title text-primary-600">{t("pricing.currency")}</span>
                        </div>
                        <div id="listing-price-preview" className="space-y-0.5 text-meta text-primary-600">
                          <p className="font-semibold text-primary-800">
                            {t("pricing.previewUnit", { amount: formatDzd(price, locale), unit: unitLabel })}
                          </p>
                          <p>{t("pricing.eurUnit", { amount: formatEur(convertDzdToEur(price), locale), unit: unitLabel })}</p>
                        </div>
                        <dl
                          aria-label={t("pricing.breakdown")}
                          className="divide-y divide-primary/[0.06] rounded-2xl bg-darnaBg px-5 py-4 text-start"
                        >
                          <ReviewRow label={t("pricing.base")}>
                            <AnimatedNumber value={price} format={(n) => formatDzd(n, locale)} />
                          </ReviewRow>
                          <ReviewRow
                            label={t("pricing.commission", { rate: DEFAULT_COMMISSION_RATES.individual })}
                            valueClassName="text-accent-700"
                          >
                            <AnimatedNumber value={-commission} format={(n) => formatDzd(n, locale)} />
                          </ReviewRow>
                          <div className="flex items-baseline justify-between gap-4 pt-3">
                            <dt className="text-body font-semibold text-primary-900">{t("pricing.payout")}</dt>
                            <dd className="text-end">
                              <AnimatedNumber
                                value={payout}
                                format={(n) => formatDzd(n, locale)}
                                className="font-serif text-heading text-secondary-800"
                              />
                              <span className="block text-meta text-primary-500 tabular-nums">
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
                    <div className="space-y-8">
                      <StepHeader title={t("booking.title")} subtitle={t("booking.subtitle")} />
                      <div className="rounded-3xl bg-white p-5 shadow-e1 sm:p-6">
                        <Switch
                          id="instant-book"
                          label={<span className="text-title text-primary-900">{t("booking.instantBook")}</span>}
                          description={t("booking.instantBookDesc")}
                          checked={instantBook}
                          onCheckedChange={setInstantBook}
                        />
                      </div>
                      <div className="space-y-3" role="group" aria-labelledby="cancellation-label">
                        <p id="cancellation-label" className="text-title text-primary-900">
                          {t("booking.cancellation")}
                        </p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                          {(["flexible", "moderate", "strict"] as const).map((id) => (
                            <ChoiceCard
                              key={id}
                              size="sm"
                              selected={cancellationPolicy === id}
                              onSelect={() => setCancellationPolicy(id)}
                              title={<span className="text-body font-semibold">{t(`booking.${id}.label`)}</span>}
                              description={t(`booking.${id}.desc`)}
                            />
                          ))}
                        </div>
                      </div>
                      {renderDynamicFieldsForStep("approval_mode")}
                      {renderDynamicFieldsForStep("policies")}
                    </div>
                  )}

                  {/* INDIVIDUAL FLOW: STEP 12 - REVIEW & PUBLISH */}
                  {isIndividualStep(12) && (
                    <div className="mx-auto max-w-3xl space-y-8">
                      <StepHeader eyebrow={t("review.eyebrow")} title={t("reviewTitle")} subtitle={t("reviewSubtitle")} />
                      <article className="overflow-hidden rounded-3xl bg-white shadow-e3">
                        <div className="grid gap-1 sm:grid-cols-[2fr_1fr]">
                          <div className="relative aspect-[4/3] bg-tertiary-100 sm:aspect-auto sm:min-h-[18rem]">
                            <Image
                              src={photos[0] || "https://images.unsplash.com/photo-1552573033-b7bb437bf953?auto=format&fit=crop&w=1600&q=80"}
                              alt={title}
                              fill
                              sizes="(min-width: 768px) 520px, 100vw"
                              className="object-cover"
                            />
                            <span className="absolute start-3 top-3 rounded-full glass-light px-3 py-1 text-[0.6875rem] font-semibold text-primary-900 shadow-e1">
                              {categoryLabel(category)}
                            </span>
                          </div>
                          <div className="hidden grid-rows-2 gap-1 sm:grid">
                            {photos.slice(1, 3).map((src, i) => (
                              <div key={`${src}-${i}`} className="relative bg-tertiary-100">
                                <Image src={src} alt="" fill sizes="260px" className="object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-5 p-6 sm:p-8">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <h3 className="font-serif text-heading font-normal text-primary-900">{title}</h3>
                              <p className="mt-1.5 flex items-center gap-1.5 text-meta text-primary-600">
                                <BrandPinIcon size={15} aria-hidden="true" className="text-secondary-600" />
                                <span>{t("review.location", { city, wilaya: wilayaLabel(wilaya) })}</span>
                              </p>
                            </div>
                            <div className="shrink-0 sm:text-end">
                              <div className="font-serif text-heading text-primary-900 tabular-nums">
                                {formatDzd(price, locale)}
                              </div>
                              <div className="text-meta text-primary-500">
                                {t("review.perUnit", { unit: unitLabel, eur: formatEur(convertDzdToEur(price), locale) })}
                              </div>
                            </div>
                          </div>
                          <ul className="flex flex-wrap gap-2">
                            {[
                              t("counts.guests", { count: guestCount }),
                              t("counts.bedrooms", { count: bedroomCount }),
                              t("counts.beds", { count: bedsCount }),
                              t("counts.bathrooms", { count: bathroomCount }),
                            ].map((label) => (
                              <li key={label}>
                                <Badge tone="neutral" size="md">
                                  {label}
                                </Badge>
                              </li>
                            ))}
                          </ul>
                          <p className="line-clamp-3 text-body text-primary-700">{description}</p>
                          <div className="flex flex-wrap gap-2 border-t border-primary/[0.08] pt-4">
                            <Button type="button" variant="tertiary" size="sm" onClick={() => setCurrentStep(4)}>
                              {t("review.editLocation")}
                            </Button>
                            <Button type="button" variant="tertiary" size="sm" onClick={() => setCurrentStep(7)}>
                              {t("review.editPhotos", { count: photos.length })}
                            </Button>
                            <Button type="button" variant="tertiary" size="sm" onClick={() => setCurrentStep(10)}>
                              {t("review.editPrice")}
                            </Button>
                          </div>
                        </div>
                      </article>
                    </div>
                  )}

                  {/* AGENCY REGISTRATION FLOW (Steps A1 - A5) */}
                  {isAgencyFlow && (
                    <div className="mx-auto max-w-2xl space-y-8">
                      {agencyStep === 1 && (
                        <>
                          <StepHeader
                            eyebrow={tAgency("eyebrow", { current: 1, total: AGENCY_STEPS })}
                            title={tAgency("step1Title")}
                          />
                          <div className={`space-y-4 ${cardClass}`}>
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
                            <Select
                              id="agency-type"
                              label={tAgency("businessType")}
                              value={businessType}
                              onChange={(e) => setBusinessType(e.target.value)}
                            >
                              {!BUSINESS_TYPES.some((b) => b.value === businessType) && businessType && (
                                <option value={businessType}>{businessType}</option>
                              )}
                              {BUSINESS_TYPES.map((b) => (
                                <option key={b.id} value={b.value}>
                                  {tAgency(`businessTypes.${b.id}`)}
                                </option>
                              ))}
                            </Select>
                          </div>
                        </>
                      )}

                      {agencyStep === 2 && (
                        <>
                          <StepHeader
                            eyebrow={tAgency("eyebrow", { current: 2, total: AGENCY_STEPS })}
                            title={tAgency("step2Title")}
                          />
                          <div className={`space-y-4 ${cardClass}`}>
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
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                        </>
                      )}

                      {agencyStep === 3 && (
                        <>
                          <StepHeader
                            eyebrow={tAgency("eyebrow", { current: 3, total: AGENCY_STEPS })}
                            title={tAgency("step3Title")}
                            subtitle={tAgency("step3Subtitle")}
                          />
                          <div className="grid grid-cols-2 gap-3 sm:gap-4" role="group" aria-label={tAgency("step3Title")}>
                            {TEAM_SIZES.map((size) => (
                              <ChoiceCard
                                key={size}
                                selected={teamSize === size}
                                onSelect={() => setTeamSize(size)}
                                icon={<BrandUsersIcon size={22} aria-hidden="true" />}
                                title={tAgency(`teamSizes.${size}`)}
                              />
                            ))}
                          </div>
                        </>
                      )}

                      {agencyStep === 4 && (
                        <>
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
                        </>
                      )}

                      {agencyStep === 5 && (
                        <>
                          <StepHeader
                            eyebrow={tAgency("eyebrow", { current: 5, total: AGENCY_STEPS })}
                            title={tAgency("step5Title")}
                            subtitle={tAgency("step5Subtitle")}
                          />
                          <div className={`space-y-5 ${cardClass}`}>
                            <dl className="divide-y divide-primary/[0.06]">
                              <ReviewRow label={tAgency("review.name")}>{businessName || t("review.empty")}</ReviewRow>
                              <ReviewRow label={tAgency("review.license")}>{regNumber || t("review.empty")}</ReviewRow>
                              <ReviewRow label={tAgency("review.email")}>{businessEmail || t("review.empty")}</ReviewRow>
                              <ReviewRow label={tAgency("review.category")}>{businessTypeLabel(businessType)}</ReviewRow>
                            </dl>
                            <Notice icon={<BrandShieldIcon size={18} />} title={tAgency("verificationTitle")} tone="ochre">
                              {tAgency("verificationNotice")}
                            </Notice>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* HOTEL REGISTRATION FLOW (Steps H1 - H7) */}
                  {isHotelFlow && (
                    <div className={cn("space-y-8", hotelStep === 7 && "mx-auto max-w-2xl")}>
                      {hotelStep === 1 && (
                        <>
                          <StepHeader
                            eyebrow={t("hotel.s1.eyebrow", { current: 1, total: HOTEL_STEPS })}
                            title={t("hotel.s1.title")}
                            subtitle={t("hotel.s1.subtitle")}
                          />
                          <div className={`space-y-6 ${cardClass}`}>
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
                              <div
                                className="grid grid-cols-3 gap-2 sm:grid-cols-5"
                                role="group"
                                aria-labelledby="hotel-stars-label"
                              >
                                {[1, 2, 3, 4, 5].map((stars) => {
                                  const selected = hotelStarRating === stars;
                                  return (
                                    <button
                                      key={stars}
                                      type="button"
                                      aria-pressed={selected}
                                      onClick={() => setHotelStarRating(stars)}
                                      className={cn(
                                        "flex min-h-[4.5rem] flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-3",
                                        "transition-[box-shadow,transform,background-color] duration-base ease-out hover:-translate-y-0.5",
                                        selected
                                          ? "bg-primary-800 text-white shadow-e2"
                                          : "bg-darnaBg text-primary-800 hover:shadow-e1",
                                        focusRing,
                                      )}
                                    >
                                      <span className={selected ? "text-tertiary-300" : "text-accent-600"}>
                                        <StarRow count={stars} size={12} />
                                      </span>
                                      <span className="text-meta font-semibold">{t("hotel.starCount", { count: stars })}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      {hotelStep === 2 && (
                        <>
                          <StepHeader
                            eyebrow={t("hotel.s2.eyebrow", { current: 2, total: HOTEL_STEPS })}
                            title={t("hotel.s2.title")}
                          />
                          <div className={`space-y-4 ${cardClass}`}>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                            <div className="grid grid-cols-2 gap-4">
                              <TextField
                                id="hotel-checkin"
                                label={t("hotel.checkIn")}
                                value={checkInTime}
                                onValueChange={setCheckInTime}
                                placeholder="15:00"
                                dir="ltr"
                                mono
                              />
                              <TextField
                                id="hotel-checkout"
                                label={t("hotel.checkOut")}
                                value={checkOutTime}
                                onValueChange={setCheckOutTime}
                                placeholder="12:00"
                                dir="ltr"
                                mono
                              />
                            </div>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                            <div className="pt-2">
                              <p id="hotel-amenities-label" className={labelClass}>
                                {t("hotel.amenitiesLabel")}
                              </p>
                              <div className="flex flex-wrap gap-2" role="group" aria-labelledby="hotel-amenities-label">
                                {HOTEL_AMENITY_IDS.map((id) => {
                                  const isSelected = hotelAmenities.includes(id);
                                  return (
                                    <ToggleChip
                                      key={id}
                                      pressed={isSelected}
                                      onToggle={() =>
                                        setHotelAmenities((prev) =>
                                          isSelected ? prev.filter((a) => a !== id) : [...prev, id],
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
                        </>
                      )}

                      {hotelStep === 3 && (
                        <>
                          <StepHeader
                            eyebrow={t("hotel.s3.eyebrow", { current: 3, total: HOTEL_STEPS })}
                            title={t("hotel.s3.title")}
                            subtitle={t("hotel.s3.subtitle")}
                          />
                          <div className={cardClass}>
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
                        </>
                      )}

                      {hotelStep === 4 && (
                        <>
                          <StepHeader
                            eyebrow={t("hotel.s4.eyebrow", { current: 4, total: HOTEL_STEPS })}
                            title={t("photos.orgTitle")}
                            subtitle={t("photos.hotelSubtitle")}
                          />
                          <PhotoGalleryEditor
                            idPrefix="hotel"
                            photos={hotelPhotos}
                            onRemove={(index) => removePhoto(hotelPhotos, index, setHotelPhotos)}
                            onReorder={(from, to) => setHotelPhotos((prev) => movePhoto(prev, from, to))}
                            urlValue={hotelCustomPhotoUrl}
                            onUrlChange={setHotelCustomPhotoUrl}
                            onAddUrl={() =>
                              addPhotoFromUrl(hotelCustomPhotoUrl, setHotelPhotos, () => setHotelCustomPhotoUrl(""))
                            }
                            onAddDroppedUrl={(url) => addPhotoFromUrl(url, setHotelPhotos, () => undefined)}
                            presets={HOTEL_PHOTO_PRESETS}
                            onAddPreset={(src) => setHotelPhotos((prev) => [...prev, src])}
                            invalid={invalid("photos")}
                          />
                        </>
                      )}

                      {hotelStep === 5 && (
                        <>
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
                        </>
                      )}

                      {hotelStep === 6 && (
                        <>
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
                        </>
                      )}

                      {hotelStep === 7 && (
                        <>
                          <StepHeader
                            eyebrow={t("hotel.s7.eyebrow", { current: 7, total: HOTEL_STEPS })}
                            title={t("hotel.s7.title")}
                          />
                          <div className={`space-y-5 ${cardClass}`}>
                            <dl className="divide-y divide-primary/[0.06]">
                              <ReviewRow label={t("hotel.review.name")}>{hotelName || t("review.empty")}</ReviewRow>
                              <ReviewRow
                                label={t("hotel.review.classification")}
                                valueClassName="inline-flex items-center gap-2 text-primary-900"
                              >
                                <StarRow count={hotelStarRating} size={14} />
                                <span>{t("hotel.starCount", { count: hotelStarRating })}</span>
                              </ReviewRow>
                              <ReviewRow label={t("hotel.review.totalRooms")}>
                                {t("hotel.review.rooms", { count: hotelTotalRooms })}
                              </ReviewRow>
                              <ReviewRow label={t("org.registerSummary")}>{hotelRegNumber || t("review.empty")}</ReviewRow>
                              <ReviewRow label={t("org.bookingModeSummary")} valueClassName="text-secondary-800">
                                {t(`bookingMode.${hotelBookingMode}`)}
                              </ReviewRow>
                            </dl>
                            <Notice icon={<BrandShieldIcon size={18} />} title={t("hotel.notice.title")} tone="olive">
                              {t("hotel.notice.body")}
                            </Notice>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* HOSTEL REGISTRATION FLOW (Steps B1 - B7) */}
                  {isHostelFlow && (
                    <div className={cn("space-y-8", hostelStep === 7 && "mx-auto max-w-2xl")}>
                      {hostelStep === 1 && (
                        <>
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
                        </>
                      )}

                      {hostelStep === 2 && (
                        <>
                          <StepHeader
                            eyebrow={t("hostel.s2.eyebrow", { current: 2, total: HOSTEL_STEPS })}
                            title={t("hostel.s2.title")}
                          />
                          <div className={`space-y-4 ${cardClass}`}>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                            <div className="pt-2">
                              <p id="hostel-facilities-label" className={labelClass}>
                                {t("hostel.facilitiesLabel")}
                              </p>
                              <div className="flex flex-wrap gap-2" role="group" aria-labelledby="hostel-facilities-label">
                                {HOSTEL_FACILITY_IDS.map((id) => {
                                  const isSelected = hostelFacilities.includes(id);
                                  return (
                                    <ToggleChip
                                      key={id}
                                      pressed={isSelected}
                                      onToggle={() =>
                                        setHostelFacilities((prev) =>
                                          isSelected ? prev.filter((f) => f !== id) : [...prev, id],
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
                        </>
                      )}

                      {hostelStep === 3 && (
                        <>
                          <StepHeader
                            eyebrow={t("hostel.s3.eyebrow", { current: 3, total: HOSTEL_STEPS })}
                            title={t("hostel.s3.title")}
                            subtitle={t("hostel.s3.subtitle")}
                          />
                          <div className={cardClass}>
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
                        </>
                      )}

                      {hostelStep === 4 && (
                        <>
                          <StepHeader
                            eyebrow={t("hostel.s4.eyebrow", { current: 4, total: HOSTEL_STEPS })}
                            title={t("photos.orgTitle")}
                            subtitle={t("photos.hostelSubtitle")}
                          />
                          <PhotoGalleryEditor
                            idPrefix="hostel"
                            photos={hostelPhotos}
                            onRemove={(index) => removePhoto(hostelPhotos, index, setHostelPhotos)}
                            onReorder={(from, to) => setHostelPhotos((prev) => movePhoto(prev, from, to))}
                            urlValue={hostelCustomPhotoUrl}
                            onUrlChange={setHostelCustomPhotoUrl}
                            onAddUrl={() =>
                              addPhotoFromUrl(hostelCustomPhotoUrl, setHostelPhotos, () => setHostelCustomPhotoUrl(""))
                            }
                            onAddDroppedUrl={(url) => addPhotoFromUrl(url, setHostelPhotos, () => undefined)}
                            presets={HOSTEL_PHOTO_PRESETS}
                            onAddPreset={(src) => setHostelPhotos((prev) => [...prev, src])}
                            invalid={invalid("photos")}
                          />
                        </>
                      )}

                      {hostelStep === 5 && (
                        <>
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
                        </>
                      )}

                      {hostelStep === 6 && (
                        <>
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
                        </>
                      )}

                      {hostelStep === 7 && (
                        <>
                          <StepHeader
                            eyebrow={t("hostel.s7.eyebrow", { current: 7, total: HOSTEL_STEPS })}
                            title={t("hostel.s7.title")}
                          />
                          <div className={`space-y-5 ${cardClass}`}>
                            <dl className="divide-y divide-primary/[0.06]">
                              <ReviewRow label={t("hostel.review.name")}>{hostelName || t("review.empty")}</ReviewRow>
                              <ReviewRow label={t("hostel.review.totalBeds")}>
                                {t("hostel.review.beds", {
                                  total: hostelTotalBeds,
                                  dorm: hostelDormBeds,
                                  private: hostelPrivateRooms,
                                })}
                              </ReviewRow>
                              <ReviewRow label={t("org.location")}>{hostelAddress || t("review.empty")}</ReviewRow>
                              <ReviewRow label={t("org.registerSummary")}>{hostelRegNumber || t("review.empty")}</ReviewRow>
                              <ReviewRow label={t("org.bookingModeSummary")} valueClassName="text-secondary-800">
                                {t(`bookingMode.${hostelBookingMode}`)}
                              </ReviewRow>
                            </dl>
                            <Notice icon={<BrandShieldIcon size={18} />} title={t("hostel.notice.title")} tone="sand">
                              {t("hostel.notice.body")}
                            </Notice>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Dynamic Custom Step Renderer (for admin-created custom steps) */}
                  {configuredSteps.map((customStep, customIdx) => {
                    if (!customStep.id.startsWith("custom_step_") || !customStep.isActive) return null;
                    const isCustomActive = currentStepNumber === customIdx + 1;
                    if (!isCustomActive) return null;

                    return (
                      <div key={customStep.id} className="mx-auto max-w-2xl space-y-8">
                        <StepHeader
                          eyebrow={t("step", { current: customIdx + 1, total: activeStepsCount })}
                          title={customStep.title[lang] || customStep.title.en}
                          subtitle={customStep.description?.[lang] || customStep.description?.en}
                        />
                        <div className={cardClass}>
                          <DynamicStepFields
                            fields={customStep.fields}
                            values={customFieldsData}
                            onChange={(fieldId, val) => setCustomFieldsData((prev) => ({ ...prev, [fieldId]: val }))}
                          />
                        </div>
                      </div>
                    );
                  })}
                </m.div>
              </AnimatePresence>
            </div>

            {showPreview && (
              <aside aria-label={t("preview.eyebrow")} className="hidden lg:block">
                <div className="sticky top-36 space-y-3">
                  <p className="text-eyebrow uppercase text-secondary-700">{t("preview.eyebrow")}</p>
                  {previewCard}
                  <p className="text-meta text-primary-500">{t("preview.note")}</p>
                </div>
              </aside>
            )}
          </div>
        )}
      </main>

      {/* Sticky footer actions */}
      {!completed && !isChoosingHostType && (
        <footer className="glass sticky bottom-0 z-sticky border-t border-primary/[0.08] pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto max-w-6xl space-y-3 px-4 py-3 sm:px-6 lg:px-8">
            {/* Step validation summary (inputs reference it via aria-describedby) */}
            {stepError && (
              <p
                id={STEP_ERROR_ID}
                role="alert"
                className="flex items-start gap-2 rounded-xl bg-accent-50 px-4 py-2.5 text-meta font-semibold text-accent-800"
              >
                <BrandAlertCircleIcon size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
                <span>{stepError.message}</span>
              </p>
            )}
            <div className="flex min-h-[3rem] items-center justify-between gap-3">
              <div className="min-w-0">
                {(isOrgFlow || currentStep > 0) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={handleBack}
                    leadingIcon={<BrandChevronLeftIcon size={18} aria-hidden="true" className="rtl:rotate-180" />}
                  >
                    {backToChooser ? t("nav.chooseAccountType") : tCommon("back")}
                  </Button>
                )}
              </div>
              <p className="hidden text-meta font-medium text-primary-600 sm:block" aria-live="polite">
                {stepLabel}
              </p>
              <div className="shrink-0">{primaryAction}</div>
            </div>
          </div>
        </footer>
      )}

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

/** Listing-card style preview (pilot ListingCarouselCard look) that updates as the host types. */
function LivePreviewCard({
  photo,
  badge,
  title,
  kicker,
  extra,
}: {
  photo?: string;
  badge: string;
  title: string;
  kicker: string;
  extra?: React.ReactNode;
}) {
  const [loaded, setLoaded] = useState<string | null>(null);
  return (
    <article className="rounded-3xl bg-white p-3 shadow-e2">
      <div className="relative aspect-[20/19] w-full overflow-hidden rounded-2xl bg-tertiary-100">
        {photo && (
          <Image
            key={photo}
            src={photo}
            alt=""
            fill
            sizes="360px"
            onLoad={() => setLoaded(photo)}
            className={cn(
              "object-cover transition-opacity duration-slow ease-out",
              loaded === photo ? "opacity-100" : "opacity-0",
            )}
          />
        )}
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-primary-900/25 to-transparent" />
        <span className="absolute start-3 top-3 max-w-[80%] truncate rounded-full glass-light px-2.5 py-1 text-[0.6875rem] font-semibold text-primary-900 shadow-e1">
          {badge}
        </span>
      </div>
      <div className="space-y-1 px-1.5 pb-2 pt-3.5">
        <h3 className="line-clamp-2 text-[0.9375rem] font-semibold leading-snug text-primary-900">{title}</h3>
        <p className="truncate text-meta text-primary-500">{kicker}</p>
        {extra && <div className="pt-1">{extra}</div>}
      </div>
    </article>
  );
}
