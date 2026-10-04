"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import {
  MdLuggage,
  MdFavorite,
  MdExplore,
  MdRateReview,
  MdLocationOn,
  MdWork,
  MdPhone,
  MdEmail,
  MdTranslate,
  MdContactPhone,
  MdChevronRight,
  MdVerified,
  MdCalendarMonth,
} from "react-icons/md";
import { SafeReservation, safeListing, SafeUser } from "@/types";
import PassportModal, { PassportStamp } from "./PassportModal";

interface ProfileOverviewTabProps {
  currentUser: SafeUser;
  reservations: SafeReservation[];
  favorites: safeListing[];
  userListings?: safeListing[];
  onSwitchTab: (tab: string) => void;
}

export default function ProfileOverviewTab({
  currentUser,
  reservations,
  favorites,
  userListings = [],
  onSwitchTab,
}: ProfileOverviewTabProps) {
  const t = useTranslations("profile");
  const router = useRouter();
  const [selectedStamp, setSelectedStamp] = useState<PassportStamp | null>(null);

  // Passport stamps definition
  const passportStamps: PassportStamp[] = [
    {
      id: "algiers",
      name: t("passport.stampAlgiers"),
      wilaya: "16 - Alger",
      arabicName: "قصبة الجزائر",
      image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80",
      tagline: t("passport.stampAlgiersDesc"),
      description:
        "The ancient Casbah of Algiers is a UNESCO World Heritage site, famous for its whitewashed Ottoman palaces, historic fountains, and tiered stairways cascading down towards the Mediterranean bay.",
      highlights: ["Palais des Raïs", "Panoramic Rooftops", "Artisanal Brass Workshops"],
      searchQuery: "Alger",
      unlocked: true,
    },
    {
      id: "tipaza",
      name: t("passport.stampTipaza"),
      wilaya: "42 - Tipaza",
      arabicName: "تيبازة الشاطئية",
      image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
      tagline: t("passport.stampTipazaDesc"),
      description:
        "Where ancient Roman ruins meet the turquoise waters of the Mediterranean, under the majestic gaze of Mount Chenoua and maritime pine groves.",
      highlights: ["Tipaza Archeological Park", "Royal Mauritanian Mausoleum", "Chenoua Beaches"],
      searchQuery: "Tipaza",
      unlocked: true,
    },
    {
      id: "oran",
      name: t("passport.stampOran"),
      wilaya: "31 - Oran",
      arabicName: "وهران الباهية",
      image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80",
      tagline: t("passport.stampOranDesc"),
      description:
        "The Radiance of the West. A vibrant coastal metropolis brimming with Spanish-Andalusian history, breezy seaside corniche strolls, and the legendary Santa Cruz fortress.",
      highlights: ["Fort & Chapel Santa Cruz", "Front de Mer", "Canastel Forest"],
      searchQuery: "Oran",
      unlocked: false,
    },
    {
      id: "constantine",
      name: t("passport.stampConstantine"),
      wilaya: "25 - Constantine",
      arabicName: "مدينة الجسور المعلقة",
      image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80",
      tagline: t("passport.stampConstantineDesc"),
      description:
        "The dramatic City of Suspension Bridges, perched atop steep limestone cliffs carved by the Rhummel River over thousands of years.",
      highlights: ["Sidi M'Cid Suspension Bridge", "Ahmed Bey Palace", "Monument aux Morts"],
      searchQuery: "Constantine",
      unlocked: true,
    },
    {
      id: "taghit",
      name: t("passport.stampTaghit"),
      wilaya: "08 - Béchar",
      arabicName: "واحة تاغيت الساحرة",
      image: "https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80",
      tagline: t("passport.stampTaghitDesc"),
      description:
        "The pearl of the Saoura desert. Enormous golden sand dunes framing lush date palm groves and an ancient mud-brick ksar standing timeless against the desert sunset.",
      highlights: ["Grand Erg Occidental Dunes", "Prehistoric Petroglyphs", "Mud-brick Ksar"],
      searchQuery: "Taghit",
      unlocked: true,
    },
    {
      id: "djanet",
      name: t("passport.stampDjanet"),
      wilaya: "33 - Illizi / Djanet",
      arabicName: "طاسيلي ناجر جانت",
      image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
      tagline: t("passport.stampDjanetDesc"),
      description:
        "The heart of the deep Sahara. A surreal lunar landscape of eroded sandstone spires and millennia-old rock frescoes narrating early civilization under the starry desert sky.",
      highlights: ["The Crying Cows (La Vache qui pleure)", "Tikobaouine Arch", "Desert Bivouac"],
      searchQuery: "Djanet",
      unlocked: false,
    },
    {
      id: "kabylie",
      name: t("passport.stampKabylie"),
      wilaya: "15 - Tizi Ouzou",
      arabicName: "جبال جرجرة الشامخة",
      image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
      tagline: t("passport.stampKabylieDesc"),
      description:
        "Lush valleys, mountain villages perched on high ridges, and cedar-blanketed peaks rising into snowy wonderlands during winter.",
      highlights: ["Djurdjura National Park", "Tala Guilef", "Artisanal Berber Jewelry"],
      searchQuery: "Tizi Ouzou",
      unlocked: false,
    },
    {
      id: "ghardaia",
      name: t("passport.stampGhardaia"),
      wilaya: "47 - Ghardaïa",
      arabicName: "وادي ميزاب العريق",
      image: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80",
      tagline: t("passport.stampGhardaiaDesc"),
      description:
        "A UNESCO-recognized pentapolis built over 1,000 years ago with pristine cubist architecture that famously inspired Le Corbusier and global modern architects.",
      highlights: ["Beni Isguen Market", "Ghardaïa Minaret", "Traditional Wool Carpets"],
      searchQuery: "Ghardaia",
      unlocked: false,
    },
  ];

  const unlockedCount = passportStamps.filter((s) => s.unlocked).length;

  return (
    <div className="space-y-8">
      {/* 1. Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface p-5 rounded-2xl border border-tertiary/40 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              {t("stats.trips")}
            </span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <MdLuggage size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-primary">{reservations.length}</div>
          <p className="text-[11px] text-neutral-400 mt-1">Booked on DARNA</p>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-tertiary/40 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              {t("stats.favorites")}
            </span>
            <div className="p-2 rounded-xl bg-accent/10 text-accent">
              <MdFavorite size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-accent">
            {currentUser.favoriteIds?.length || favorites.length}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Saved for upcoming stays</p>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-tertiary/40 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              {t("stats.wilayas")}
            </span>
            <div className="p-2 rounded-xl bg-secondary/15 text-secondary-700">
              <MdExplore size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-secondary-800">
            {unlockedCount} / {passportStamps.length}
          </div>
          <p className="text-[11px] text-neutral-400 mt-1">Stamps in passport</p>
        </div>

        <div className="bg-surface p-5 rounded-2xl border border-tertiary/40 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              {t("stats.reviews")}
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <MdRateReview size={20} />
            </div>
          </div>
          <div className="text-3xl font-black text-primary">5★</div>
          <p className="text-[11px] text-neutral-400 mt-1">100% positive feedback</p>
        </div>
      </div>

      {/* 2. Main Row: About Me Card & Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Bio & Story (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-surface p-6 sm:p-7 rounded-3xl border border-tertiary/40 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                <span>{t("about.title")}</span>
              </h3>
              <button
                type="button"
                onClick={() => onSwitchTab("edit")}
                className="text-xs font-semibold text-accent hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{t("editProfile")}</span>
                <MdChevronRight size={16} className="rtl:rotate-180" />
              </button>
            </div>

            {currentUser.bio ? (
              <blockquote className="relative ps-4 border-s-3 border-accent text-neutral-700 text-sm leading-relaxed italic bg-accent/5 p-4 rounded-r-2xl">
                “{currentUser.bio}”
              </blockquote>
            ) : (
              <div className="p-4 bg-neutral-50 rounded-2xl border border-dashed border-neutral-200 text-neutral-400 text-sm">
                {t("about.noBio")}
              </div>
            )}

            {/* Travel Passions & Interests */}
            <div className="mt-6 pt-5 border-t border-neutral-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-3">
                {t("about.interests")}
              </h4>
              <div className="flex flex-wrap gap-2">
                {(currentUser.interests && currentUser.interests.length > 0
                  ? currentUser.interests
                  : [
                      "Casbah Architecture",
                      "Sahara Caravans",
                      "Mediterranean Cuisine",
                      "Desert Stargazing",
                      "Artisanal Crafts",
                    ]
                ).map((interest, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 text-xs font-medium rounded-full bg-background-100 text-primary-800 border border-tertiary/50 hover:border-accent/50 transition cursor-default"
                  >
                    ✦ {interest}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Algerian Travel Passport (Interactive Stamps) */}
          <div className="bg-surface p-6 sm:p-7 rounded-3xl border border-tertiary/40 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-primary">
                    {t("passport.title")}
                  </h3>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                    {unlockedCount} / {passportStamps.length}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {t("passport.subtitle")}
                </p>
              </div>
            </div>

            {/* Stamps Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {passportStamps.map((stamp) => (
                <div
                  key={stamp.id}
                  onClick={() => setSelectedStamp(stamp)}
                  className={`group relative p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer text-center flex flex-col items-center justify-between ${
                    stamp.unlocked
                      ? "bg-gradient-to-b from-surface via-background-50 to-tertiary/20 border-accent/40 shadow-2xs hover:shadow-md hover:border-accent hover:-translate-y-0.5"
                      : "bg-neutral-50/60 border-neutral-200/80 opacity-60 hover:opacity-100 hover:border-neutral-300"
                  }`}
                >
                  {/* Stamp Icon Ring */}
                  <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden mb-2.5 p-0.5 border-2 border-dashed border-tertiary-400 group-hover:scale-105 transition-transform duration-200">
                    <Image
                      src={stamp.image}
                      alt={stamp.name}
                      fill
                      className={`object-cover rounded-full ${
                        stamp.unlocked ? "" : "grayscale"
                      }`}
                      sizes="64px"
                    />
                    {stamp.unlocked && (
                      <div className="absolute inset-0 bg-accent/10 ring-1 ring-inset ring-accent/30 rounded-full" />
                    )}
                  </div>

                  <span className="text-[10px] font-bold text-accent uppercase tracking-wider mb-0.5">
                    {stamp.wilaya}
                  </span>
                  <p className="text-xs font-bold text-primary group-hover:text-accent transition line-clamp-1">
                    {stamp.name}
                  </p>
                  <span className="text-[10px] text-neutral-400 font-medium">
                    {stamp.unlocked ? "✓ Collected" : "Explore"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Identity Verification & Details */}
        <div className="space-y-6">
          {/* Details Card */}
          <div className="bg-surface p-6 rounded-3xl border border-tertiary/40 shadow-xs space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-1">
              {t("about.details")}
            </h3>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center gap-3 py-1.5 border-b border-neutral-100">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <MdLocationOn size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-neutral-400 uppercase font-semibold">
                    {t("about.location")}
                  </p>
                  <p className="font-semibold text-neutral-800 truncate">
                    {currentUser.location || t("about.notProvided")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 py-1.5 border-b border-neutral-100">
                <div className="w-8 h-8 rounded-xl bg-secondary/15 text-secondary-700 flex items-center justify-center shrink-0">
                  <MdWork size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-neutral-400 uppercase font-semibold">
                    {t("about.occupation")}
                  </p>
                  <p className="font-semibold text-neutral-800 truncate">
                    {currentUser.occupation || t("about.notProvided")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 py-1.5 border-b border-neutral-100">
                <div className="w-8 h-8 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                  <MdPhone size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-neutral-400 uppercase font-semibold">
                    {t("about.phone")}
                  </p>
                  <p className="font-semibold text-neutral-800 truncate">
                    {currentUser.phone || t("about.notProvided")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 py-1.5 border-b border-neutral-100">
                <div className="w-8 h-8 rounded-xl bg-tertiary/30 text-primary flex items-center justify-center shrink-0">
                  <MdEmail size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-neutral-400 uppercase font-semibold">
                    {t("about.email")}
                  </p>
                  <p className="font-semibold text-neutral-800 truncate">
                    {currentUser.email || t("about.notProvided")}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 py-1.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <MdTranslate size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-neutral-400 uppercase font-semibold mb-1">
                    {t("about.languages")}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(currentUser.languages && currentUser.languages.length > 0
                      ? currentUser.languages
                      : ["Arabic (العربية)", "French (Français)", "English"]
                    ).map((lang, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-neutral-100 text-neutral-700 text-[11px] rounded-md font-medium"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Contact Card */}
          <div className="bg-surface p-6 rounded-3xl border border-tertiary/40 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <MdContactPhone className="text-accent" size={16} />
                <span>{t("about.emergencyContact")}</span>
              </h3>
              <button
                type="button"
                onClick={() => onSwitchTab("security")}
                className="text-[11px] font-semibold text-accent hover:underline cursor-pointer"
              >
                Edit
              </button>
            </div>

            {currentUser.emergencyContact?.name ? (
              <div className="p-3 bg-neutral-50 rounded-2xl text-xs space-y-1 border border-neutral-100">
                <p className="font-bold text-neutral-800">
                  {currentUser.emergencyContact.name}{" "}
                  <span className="text-[11px] font-normal text-neutral-400">
                    ({currentUser.emergencyContact.relationship || "Contact"})
                  </span>
                </p>
                <p className="text-neutral-600 font-mono text-[11px]">
                  {currentUser.emergencyContact.phone}
                </p>
              </div>
            ) : (
              <div className="p-3 bg-amber-50/60 rounded-2xl text-xs border border-amber-200/60 text-amber-800 flex items-center justify-between">
                <span>{t("about.notProvided")}</span>
                <button
                  type="button"
                  onClick={() => onSwitchTab("security")}
                  className="font-bold text-accent hover:underline text-xs"
                >
                  + Add Contact
                </button>
              </div>
            )}
          </div>

          {/* Become a Host Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-primary to-primary-900 text-white relative overflow-hidden shadow-md">
            <div className="relative z-10 space-y-3">
              <span className="text-[10px] uppercase font-bold tracking-widest text-tertiary-300">
                Host on DARNA
              </span>
              <h4 className="text-base font-extrabold leading-snug">
                Share your home or vehicle with travelers
              </h4>
              <p className="text-xs text-neutral-300 leading-relaxed">
                Welcome guests to authentic Algerian villas, coastal apartments, or Sahara camps.
              </p>
              <Link
                href="/become-a-host"
                className="inline-block mt-2 px-4 py-2 bg-accent hover:bg-accent-600 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
              >
                Start Hosting Today
              </Link>
            </div>
            <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-accent/20 blur-xl pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Selected Stamp Cultural Modal */}
      <PassportModal
        stamp={selectedStamp}
        onClose={() => setSelectedStamp(null)}
      />
    </div>
  );
}
