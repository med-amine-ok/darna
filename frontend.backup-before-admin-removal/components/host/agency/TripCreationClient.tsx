"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "@/navigation";
import { Trip, TripItineraryDay, User, Organization } from "@/types";
import { createTrip } from "@/lib/data/trips";
import PriceDisplay from "@/components/common/PriceDisplay";
import { toast } from "react-toastify";
import {
  BrandCompassIcon,
  BrandChevronLeftIcon,
  BrandChevronRightIcon,
  BrandCheckIcon,
  BrandPlusIcon,
  BrandTrashIcon,
  BrandCalendarIcon,
  BrandUsersIcon,
  BrandPinIcon,
  BrandClockIcon,
  BrandSparklesIcon,
  BrandShieldIcon,
  BrandCloseIcon,
  BrandEyeIcon,
} from "@/components/icons";

interface TripCreationClientProps {
  currentUser?: User | null;
  organization?: Organization | null;
}

export default function TripCreationClient({
  currentUser,
  organization,
}: TripCreationClientProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Basics
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("Djanet");
  const [locationValue, setLocationValue] = useState("Djanet, Illizi");
  const [description, setDescription] = useState("");
  const [coverPhoto, setCoverPhoto] = useState(
    "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9"
  );
  const [gallery, setGallery] = useState<string[]>([
    "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9",
    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23",
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800",
  ]);
  const [newGalleryUrl, setNewGalleryUrl] = useState("");

  // Step 2: Itinerary Builder
  const [itinerary, setItinerary] = useState<TripItineraryDay[]>([
    {
      day: 1,
      title: "Arrival & Desert Welcome",
      description: "Reception at the regional airport, transfer to base camp, evening mint tea and expedition briefing.",
      activities: ["Airport pickup", "Scenic 4x4 transfer", "Campfire dinner"],
      meals: "Dinner included",
      accommodation: "Desert Bivouac tent",
    },
    {
      day: 2,
      title: "Expedition Ascent & Plateau Discovery",
      description: "Trek into ancient canyons, discover prehistoric rock paintings, and marvel at thousand-year-old cedar and cypress trees.",
      activities: ["Guided morning trek", "Rock art lecture", "Sunset vista"],
      meals: "Breakfast, Lunch, Dinner",
      accommodation: "Wild camp under the stars",
    },
  ]);

  // Step 3: Logistics & Pricing
  const [durationDays, setDurationDays] = useState<number>(3);
  const [minGroupSize, setMinGroupSize] = useState<number>(2);
  const [maxGroupSize, setMaxGroupSize] = useState<number>(8);
  const [meetingPoint, setMeetingPoint] = useState(
    "Djanet Inedbirene Airport (DJA) or Agency Office"
  );
  const [pricePerPerson, setPricePerPerson] = useState<number>(55000);
  const [departureDates, setDepartureDates] = useState<string[]>([
    "2026-11-05",
    "2026-11-20",
    "2026-12-05",
  ]);
  const [newDateInput, setNewDateInput] = useState("");

  // Step 4: Inclusions, Exclusions & Policy
  const [inclusions, setInclusions] = useState<string[]>([
    "Internal 4x4 transport with experienced desert drivers",
    "Certified mountain guide and National Park ranger",
    "Official park permits and security clearance",
    "Full board: breakfasts, trail lunches, and hot campfire dinners",
    "High-grade camping tents, foam mattresses, and mess gear",
  ]);
  const [newInclusion, setNewInclusion] = useState("");

  const [exclusions, setExclusions] = useState<string[]>([
    "Domestic airfare to/from departure city",
    "Personal sleeping bag and trekking footwear",
    "Personal medical and travel insurance",
    "Tips for drivers, cook, and guides",
  ]);
  const [newExclusion, setNewExclusion] = useState("");

  const [cancellationPolicy, setCancellationPolicy] = useState<
    "flexible" | "moderate" | "strict"
  >("moderate");

  // Itinerary helpers
  const handleAddDay = () => {
    const nextDayNum = itinerary.length + 1;
    setItinerary([
      ...itinerary,
      {
        day: nextDayNum,
        title: `Day ${nextDayNum} Exploration`,
        description: "Describe the day's route, cultural visits, and highlights.",
        activities: ["Morning trek", "Cultural workshop"],
        meals: "Breakfast, Lunch, Dinner",
        accommodation: "Traditional desert camp",
      },
    ]);
    setDurationDays(nextDayNum);
  };

  const handleRemoveDay = (index: number) => {
    if (itinerary.length <= 1) return;
    const updated = itinerary
      .filter((_, i) => i !== index)
      .map((item, idx) => ({ ...item, day: idx + 1 }));
    setItinerary(updated);
    setDurationDays(updated.length);
  };

  const handleUpdateDay = (index: number, updates: Partial<TripItineraryDay>) => {
    setItinerary(
      itinerary.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  // Departure date helpers
  const handleAddDate = () => {
    if (!newDateInput.trim()) return;
    if (!departureDates.includes(newDateInput.trim())) {
      setDepartureDates([...departureDates, newDateInput.trim()]);
    }
    setNewDateInput("");
  };

  const handleRemoveDate = (dateToRemove: string) => {
    setDepartureDates(departureDates.filter((d) => d !== dateToRemove));
  };

  // Inclusion / Exclusion helpers
  const handleAddInclusion = () => {
    if (newInclusion.trim()) {
      setInclusions([...inclusions, newInclusion.trim()]);
      setNewInclusion("");
    }
  };

  const handleAddExclusion = () => {
    if (newExclusion.trim()) {
      setExclusions([...exclusions, newExclusion.trim()]);
      setNewExclusion("");
    }
  };

  // Gallery helpers
  const handleAddGalleryUrl = () => {
    if (newGalleryUrl.trim()) {
      setGallery([...gallery, newGalleryUrl.trim()]);
      setNewGalleryUrl("");
    }
  };

  // Publish handler
  const handlePublish = async (status: "active" | "draft" = "active") => {
    if (!title.trim()) {
      toast.error("Please enter a circuit title.");
      setCurrentStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      const orgId =
        organization?.id || currentUser?.organizationId || "org_atlas_escapes";

      const newTrip = await createTrip({
        title,
        description,
        coverPhoto,
        gallery,
        itinerary,
        durationDays,
        minGroupSize,
        maxGroupSize,
        pricePerPerson,
        meetingPoint,
        city,
        locationValue,
        inclusions,
        exclusions,
        cancellationPolicy,
        organizationId: orgId,
        status,
        departureDates,
        rating: 5.0,
        reviewsCount: 0,
      });

      toast.success(
        status === "active"
          ? "Expedition published successfully to DARNA!"
          : "Expedition saved to agency drafts."
      );

      router.push("/host/agency/trips");
    } catch {
      toast.error("Failed to publish circuit. Please verify inputs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsList = [
    { num: 1, label: "Basics" },
    { num: 2, label: "Itinerary" },
    { num: 3, label: "Logistics" },
    { num: 4, label: "Inclusions" },
    { num: 5, label: "Review" },
  ];

  return (
    <div className="min-h-screen bg-bg-light/50 flex flex-col justify-between">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-tertiary/60 px-4 sm:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/host/agency/trips")}
              className="p-2 rounded-xl text-neutral-500 hover:text-primary hover:bg-neutral-100 transition"
              title="Cancel and return to trips"
            >
              <BrandChevronLeftIcon size={18} className="rtl:rotate-180" />
            </button>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary block">
                {organization?.name || "Agency Workspace"}
              </span>
              <h1 className="text-base sm:text-lg font-serif font-black text-primary">
                New Multi-Day Expedition
              </h1>
            </div>
          </div>

          {/* Stepper Indicator */}
          <div className="hidden sm:flex items-center gap-2">
            {stepsList.map((s) => (
              <button
                key={s.num}
                type="button"
                onClick={() => setCurrentStep(s.num)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition ${
                  currentStep === s.num
                    ? "bg-primary text-white"
                    : currentStep > s.num
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-neutral-100 text-neutral-400"
                }`}
              >
                <span>{s.num}.</span>
                <span>{s.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => handlePublish("draft")}
            disabled={isSubmitting}
            className="text-xs font-bold text-neutral-500 hover:text-primary underline cursor-pointer"
          >
            Save Draft
          </button>
        </div>
      </header>

      {/* Main Form Body */}
      <main className="max-w-4xl mx-auto w-full px-4 sm:px-8 py-8 flex-1">
        {/* Step 1: Basics */}
        {currentStep === 1 && (
          <div className="bg-white rounded-3xl border border-tertiary/70 p-6 sm:p-10 shadow-2xs space-y-6 animate-in fade-in">
            <div>
              <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                Step 1 of 5
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-primary mt-1">
                Expedition Title & Destination
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1">
                Give your curated circuit an inspiring title that captures the spirit of the Algerian Sahara or coastline.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  Circuit Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. 5-Day Grand Tassili n'Ajjer & Tamrit Rock Art Expedition"
                  className="w-full px-4 py-3 bg-neutral-50 border border-tertiary/80 rounded-2xl text-sm font-medium text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                    Primary Wilaya / City *
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Djanet, Taghit, Ghardaïa, Tipaza"
                    className="w-full px-4 py-3 bg-neutral-50 border border-tertiary/80 rounded-2xl text-sm font-medium text-primary focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                    Region / Location *
                  </label>
                  <input
                    type="text"
                    value={locationValue}
                    onChange={(e) => setLocationValue(e.target.value)}
                    placeholder="e.g. Djanet, Illizi, Algeria"
                    className="w-full px-4 py-3 bg-neutral-50 border border-tertiary/80 rounded-2xl text-sm font-medium text-primary focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  Trip Overview Description *
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the landscape, key landmarks, cultural significance, and who this circuit is suited for..."
                  className="w-full px-4 py-3 bg-neutral-50 border border-tertiary/80 rounded-2xl text-sm font-medium text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  Cover Photo URL *
                </label>
                <input
                  type="text"
                  value={coverPhoto}
                  onChange={(e) => setCoverPhoto(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-3 bg-neutral-50 border border-tertiary/80 rounded-2xl text-sm font-medium text-primary focus:outline-none focus:border-primary"
                />
                <div className="relative aspect-[16/9] w-full max-w-md mt-3 rounded-2xl overflow-hidden border border-tertiary bg-neutral-100">
                  <Image src={coverPhoto} alt="Cover preview" fill className="object-cover" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Itinerary Builder */}
        {currentStep === 2 && (
          <div className="bg-white rounded-3xl border border-tertiary/70 p-6 sm:p-10 shadow-2xs space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                  Step 2 of 5
                </span>
                <h2 className="text-xl sm:text-2xl font-serif font-bold text-primary mt-1">
                  Day-by-Day Itinerary Builder
                </h2>
                <p className="text-xs sm:text-sm text-neutral-500 mt-1">
                  Detail what travelers will experience on each day of the journey.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddDay}
                className="px-4 py-2 bg-secondary/15 hover:bg-secondary/25 text-secondary rounded-2xl text-xs font-bold transition flex items-center gap-1.5 self-start cursor-pointer"
              >
                <BrandPlusIcon size={16} />
                <span>+ Add Day</span>
              </button>
            </div>

            <div className="space-y-6">
              {itinerary.map((dayItem, index) => (
                <div
                  key={dayItem.day}
                  className="p-5 bg-neutral-50 rounded-2xl border border-tertiary/70 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-primary text-white text-xs font-bold">
                      Day {dayItem.day}
                    </span>
                    {itinerary.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDay(index)}
                        className="text-neutral-400 hover:text-rose-600 transition"
                        title="Remove day"
                      >
                        <BrandTrashIcon size={16} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                        Day {dayItem.day} Title *
                      </label>
                      <input
                        type="text"
                        value={dayItem.title}
                        onChange={(e) => handleUpdateDay(index, { title: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-white border border-tertiary/80 rounded-xl text-xs sm:text-sm font-semibold text-primary focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                        Day Description *
                      </label>
                      <textarea
                        rows={2}
                        value={dayItem.description}
                        onChange={(e) =>
                          handleUpdateDay(index, { description: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 bg-white border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                          Meals Included
                        </label>
                        <input
                          type="text"
                          value={dayItem.meals || ""}
                          onChange={(e) =>
                            handleUpdateDay(index, { meals: e.target.value })
                          }
                          placeholder="e.g. Breakfast, Lunch, Campfire Dinner"
                          className="w-full px-3.5 py-2 bg-white border border-tertiary/80 rounded-xl text-xs text-primary focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                          Overnight Accommodation
                        </label>
                        <input
                          type="text"
                          value={dayItem.accommodation || ""}
                          onChange={(e) =>
                            handleUpdateDay(index, { accommodation: e.target.value })
                          }
                          placeholder="e.g. Saharan Bivouac tent / Guest Riad"
                          className="w-full px-3.5 py-2 bg-white border border-tertiary/80 rounded-xl text-xs text-primary focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Logistics & Pricing */}
        {currentStep === 3 && (
          <div className="bg-white rounded-3xl border border-tertiary/70 p-6 sm:p-10 shadow-2xs space-y-6 animate-in fade-in">
            <div>
              <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                Step 3 of 5
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-primary mt-1">
                Logistics, Pricing & Scheduled Dates
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1">
                Set group sizes, per-person rates in Algerian Dinars, meeting point, and upcoming departure dates.
              </p>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                    Duration (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={durationDays}
                    onChange={(e) => setDurationDays(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-4 py-3 bg-neutral-50 border border-tertiary/80 rounded-2xl text-sm font-bold text-primary focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                    Min Group Size
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={minGroupSize}
                    onChange={(e) => setMinGroupSize(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-4 py-3 bg-neutral-50 border border-tertiary/80 rounded-2xl text-sm font-bold text-primary focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                    Max Group Size
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={maxGroupSize}
                    onChange={(e) => setMaxGroupSize(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-4 py-3 bg-neutral-50 border border-tertiary/80 rounded-2xl text-sm font-bold text-primary focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  Price per Person (DZD) *
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    step={1000}
                    min={5000}
                    value={pricePerPerson}
                    onChange={(e) => setPricePerPerson(parseInt(e.target.value, 10) || 0)}
                    className="w-full sm:w-64 px-4 py-3 bg-neutral-50 border border-tertiary/80 rounded-2xl text-lg font-black text-primary focus:outline-none focus:border-primary"
                  />
                  <div className="text-xs text-neutral-500">
                    <PriceDisplay price={pricePerPerson} priceClassName="font-bold text-primary text-base" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  Meeting Point Address / Logistics *
                </label>
                <input
                  type="text"
                  value={meetingPoint}
                  onChange={(e) => setMeetingPoint(e.target.value)}
                  placeholder="e.g. Djanet Airport (DJA) or Agency Office"
                  className="w-full px-4 py-3 bg-neutral-50 border border-tertiary/80 rounded-2xl text-sm font-medium text-primary focus:outline-none focus:border-primary"
                />
              </div>

              {/* Scheduled departure dates */}
              <div className="p-5 bg-neutral-50 rounded-2xl border border-tertiary/70 space-y-3">
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                  Scheduled Departure Dates
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={newDateInput}
                    onChange={(e) => setNewDateInput(e.target.value)}
                    className="px-3.5 py-2 bg-white border border-tertiary/80 rounded-xl text-xs font-semibold text-primary"
                  />
                  <button
                    type="button"
                    onClick={handleAddDate}
                    className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition"
                  >
                    + Add Departure
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap pt-2">
                  {departureDates.map((date) => (
                    <span
                      key={date}
                      className="px-3 py-1 rounded-full bg-white border border-tertiary/80 text-xs font-bold text-primary flex items-center gap-2 shadow-2xs"
                    >
                      <span>{date}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDate(date)}
                        className="text-neutral-400 hover:text-rose-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Inclusions & Cancellation */}
        {currentStep === 4 && (
          <div className="bg-white rounded-3xl border border-tertiary/70 p-6 sm:p-10 shadow-2xs space-y-6 animate-in fade-in">
            <div>
              <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                Step 4 of 5
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-primary mt-1">
                Inclusions, Exclusions & Cancellation Policy
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1">
                Clear expectations build trust. Specify all included logistical provisions and refund policies.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Inclusions */}
              <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-3">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <BrandCheckIcon size={15} />
                  <span>What&apos;s Included</span>
                </span>
                <div className="space-y-2">
                  {inclusions.map((inc, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between gap-2 text-xs text-neutral-700 bg-white p-2.5 rounded-xl border border-emerald-100"
                    >
                      <span className="leading-snug">{inc}</span>
                      <button
                        type="button"
                        onClick={() => setInclusions(inclusions.filter((_, idx) => idx !== i))}
                        className="text-neutral-400 hover:text-rose-500"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={newInclusion}
                    onChange={(e) => setNewInclusion(e.target.value)}
                    placeholder="Add item..."
                    className="flex-1 px-3 py-1.5 bg-white border border-emerald-200 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddInclusion}
                    className="px-3 py-1.5 bg-emerald-700 text-white rounded-xl text-xs font-bold"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Exclusions */}
              <div className="p-5 bg-rose-50/50 rounded-2xl border border-rose-200 space-y-3">
                <span className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                  <BrandCloseIcon size={15} />
                  <span>What&apos;s Excluded</span>
                </span>
                <div className="space-y-2">
                  {exclusions.map((exc, i) => (
                    <div
                      key={i}
                      className="flex items-start justify-between gap-2 text-xs text-neutral-700 bg-white p-2.5 rounded-xl border border-rose-100"
                    >
                      <span className="leading-snug">{exc}</span>
                      <button
                        type="button"
                        onClick={() => setExclusions(exclusions.filter((_, idx) => idx !== i))}
                        className="text-neutral-400 hover:text-rose-500"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={newExclusion}
                    onChange={(e) => setNewExclusion(e.target.value)}
                    placeholder="Add item..."
                    className="flex-1 px-3 py-1.5 bg-white border border-rose-200 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddExclusion}
                    className="px-3 py-1.5 bg-rose-700 text-white rounded-xl text-xs font-bold"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Cancellation policy selector */}
            <div className="space-y-3 pt-3 border-t border-tertiary/40">
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                Cancellation Policy
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: "flexible",
                    title: "Flexible",
                    desc: "Full refund up to 14 days before departure",
                  },
                  {
                    id: "moderate",
                    title: "Moderate",
                    desc: "Full refund up to 30 days before departure",
                  },
                  {
                    id: "strict",
                    title: "Strict",
                    desc: "50% refund up to 30 days before departure",
                  },
                ].map((pol) => (
                  <button
                    key={pol.id}
                    type="button"
                    onClick={() => setCancellationPolicy(pol.id as any)}
                    className={`p-4 rounded-2xl border text-start transition cursor-pointer ${
                      cancellationPolicy === pol.id
                        ? "border-primary bg-primary/5 shadow-2xs"
                        : "border-tertiary bg-neutral-50 hover:bg-white"
                    }`}
                  >
                    <span className="font-bold text-sm text-primary block">
                      {pol.title}
                    </span>
                    <span className="text-xs text-neutral-500 mt-1 block">
                      {pol.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Review & Publish */}
        {currentStep === 5 && (
          <div className="bg-white rounded-3xl border border-tertiary/70 p-6 sm:p-10 shadow-2xs space-y-6 animate-in fade-in">
            <div>
              <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                Step 5 of 5
              </span>
              <h2 className="text-xl sm:text-2xl font-serif font-bold text-primary mt-1">
                Review & Publish Circuit
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1">
                Preview how travelers will see your expedition before going live on the platform.
              </p>
            </div>

            {/* Preview Card */}
            <div className="border border-tertiary/70 rounded-3xl overflow-hidden shadow-sm bg-neutral-50/50">
              <div className="relative aspect-[16/9] w-full bg-neutral-100">
                <Image src={coverPhoto} alt={title} fill className="object-cover" />
                <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                  <span className="px-3 py-1 rounded-full bg-white/95 text-xs font-bold text-primary">
                    {durationDays} Days / {Math.max(1, durationDays - 1)} Nights
                  </span>
                  <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold">
                    Ready to Publish
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <span className="text-xs font-bold text-secondary uppercase tracking-wider">
                    {city}, Algeria
                  </span>
                  <h3 className="font-serif text-xl font-bold text-primary mt-1">
                    {title || "Untitled Expedition"}
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
                    {description || "No description provided."}
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-tertiary/50 text-xs">
                  <div>
                    <span className="text-neutral-400 block font-semibold">Group Size</span>
                    <span className="font-bold text-primary">
                      {minGroupSize}–{maxGroupSize} travelers
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block font-semibold">Rate</span>
                    <span className="font-bold text-primary">
                      {pricePerPerson.toLocaleString()} DZD / person
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block font-semibold">Itinerary</span>
                    <span className="font-bold text-primary">
                      {itinerary.length} Days Planned
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block font-semibold">Policy</span>
                    <span className="font-bold text-primary capitalize">
                      {cancellationPolicy}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-neutral-500">
                    Host Agency: <strong>{organization?.name || "Atlas Escapes"}</strong>
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handlePublish("draft")}
                      disabled={isSubmitting}
                      className="px-4 py-2 rounded-xl border border-tertiary bg-white hover:bg-neutral-50 text-xs font-bold text-neutral-700 transition"
                    >
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePublish("active")}
                      disabled={isSubmitting}
                      className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <BrandSparklesIcon size={15} />
                      <span>{isSubmitting ? "Publishing..." : "Publish to DARNA"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Sticky Bottom Navigation Footer */}
      <footer className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-tertiary/60 px-4 sm:px-8 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 ${
              currentStep === 1
                ? "text-neutral-300 cursor-not-allowed"
                : "text-primary hover:bg-neutral-100 cursor-pointer"
            }`}
          >
            <BrandChevronLeftIcon size={16} className="rtl:rotate-180" />
            <span>Previous</span>
          </button>

          <span className="text-xs text-neutral-400 font-semibold">
            Step {currentStep} of 5
          </span>

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.min(5, prev + 1))}
              className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <span>Continue</span>
              <BrandChevronRightIcon size={16} className="rtl:rotate-180" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handlePublish("active")}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <BrandCheckIcon size={16} />
              <span>{isSubmitting ? "Publishing..." : "Publish Circuit"}</span>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
