"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { toast } from "react-toastify";
import {
  MdVerified,
  MdLocationOn,
  MdCalendarMonth,
  MdShare,
  MdEdit,
  MdLuggage,
  MdFavorite,
  MdExplore,
  MdSettings,
  MdInfoOutline,
  MdCheckCircle,
  MdArrowForward,
  MdLogin,
  MdStars,
  MdCameraAlt,
} from "react-icons/md";
import Container from "@/components/Container";
import Avatar from "@/components/Avatar";
import useLoginModel from "@/hook/useLoginModal";
import { SafeReservation, safeListing, SafeUser } from "@/types";
import ProfileOverviewTab from "@/components/profile/ProfileOverviewTab";
import ProfileEditTab from "@/components/profile/ProfileEditTab";
import ProfileTripsTab from "@/components/profile/ProfileTripsTab";
import ProfileFavoritesTab from "@/components/profile/ProfileFavoritesTab";
import ProfileSettingsTab from "@/components/profile/ProfileSettingsTab";

interface ProfileClientProps {
  currentUser: SafeUser;
  isDemo?: boolean;
  reservations: SafeReservation[];
  userListings: safeListing[];
  favorites: safeListing[];
}

export default function ProfileClient({
  currentUser: initialUser,
  isDemo = false,
  reservations,
  userListings,
  favorites,
}: ProfileClientProps) {
  const t = useTranslations("profile");
  const loginModal = useLoginModel();

  // Local user state for instant reactivity
  const [currentUser, setCurrentUser] = useState<SafeUser>(initialUser);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isCopied, setIsCopied] = useState(false);

  // Profile completion calculation
  const completionData = useMemo(() => {
    let score = 0;
    const missing: { label: string; tab: string }[] = [];

    if (currentUser.name) score += 15;
    else missing.push({ label: "+ Name (15%)", tab: "edit" });

    if (currentUser.image) score += 15;
    else missing.push({ label: "+ Photo (15%)", tab: "edit" });

    if (currentUser.bio && currentUser.bio.length > 20) score += 20;
    else missing.push({ label: "+ Bio (20%)", tab: "edit" });

    if (currentUser.phone) score += 15;
    else missing.push({ label: "+ Phone (15%)", tab: "edit" });

    if (currentUser.location) score += 15;
    else missing.push({ label: "+ Location (15%)", tab: "edit" });

    if (currentUser.languages && currentUser.languages.length > 0) score += 10;
    else missing.push({ label: "+ Languages (10%)", tab: "edit" });

    if (currentUser.emergencyContact?.name) score += 10;
    else missing.push({ label: "+ Emergency Contact (10%)", tab: "security" });

    return { score, missing };
  }, [currentUser]);

  // Share profile handler
  const handleShare = async () => {
    if (typeof window !== "undefined") {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setIsCopied(true);
        toast.success(t("copied"));
        setTimeout(() => setIsCopied(false), 2500);
      } catch {
        toast.info("Share this URL: " + window.location.href);
      }
    }
  };

  const formattedDate = useMemo(() => {
    try {
      return format(new Date(currentUser.createdAt), "MMMM yyyy");
    } catch {
      return "August 2023";
    }
  }, [currentUser.createdAt]);

  return (
    <div className="min-h-screen bg-background pb-28 md:pb-16 pt-6">
      <Container>
        <div className="space-y-8">
          {/* Demo Alert Banner if not authenticated with real session */}
          {isDemo && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                  <MdInfoOutline size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold">{t("demoMode")}</p>
                  <p className="text-[11px] text-amber-800">{t("demoModeDesc")}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => loginModal.onOpen()}
                className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
              >
                <MdLogin size={16} />
                <span>Log In / Sign Up</span>
              </button>
            </div>
          )}

          {/* Hero Identity Banner */}
          <div className="relative rounded-3xl overflow-hidden bg-surface border border-tertiary/40 shadow-xs">
            {/* Panoramic Cover */}
            <div className="h-44 sm:h-56 w-full relative bg-gradient-to-r from-primary via-primary-800 to-primary-950 overflow-hidden">
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />
              <div className="absolute -bottom-10 -right-10 w-64 h-64 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
              <div className="absolute top-0 left-1/3 w-80 h-40 rounded-full bg-secondary/15 blur-3xl pointer-events-none" />

              {/* Cover Top Badges */}
              <div className="absolute top-4 end-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShare}
                  className="px-3.5 py-1.5 bg-black/40 hover:bg-black/60 text-white rounded-full text-xs font-semibold backdrop-blur-md transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <MdShare size={15} />
                  <span>{isCopied ? "Copied!" : t("shareProfile")}</span>
                </button>
              </div>
            </div>

            {/* Profile Info Row */}
            <div className="px-6 sm:px-8 pb-7 pt-0 relative">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-5">
                {/* Avatar with Interactive Edit Overlay */}
                <div className="relative inline-block self-start">
                  <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-surface shadow-xl overflow-hidden bg-neutral-100 relative group">
                    <Avatar
                      src={currentUser.image}
                      userName={currentUser.name}
                      size={144}
                      className="w-full h-full"
                    />
                    <button
                      type="button"
                      onClick={() => setActiveTab("edit")}
                      className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity backdrop-blur-xs cursor-pointer"
                      title="Change photo"
                    >
                      <MdCameraAlt size={22} />
                      <span className="text-[10px] font-bold">Edit Photo</span>
                    </button>
                  </div>
                  <span
                    className="absolute bottom-2 end-2 p-1.5 bg-status-success text-white rounded-full ring-4 ring-surface shadow-xs"
                    title={t("verifiedMember")}
                  >
                    <MdVerified size={18} />
                  </span>
                </div>

                {/* Header Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab("edit")}
                    className="px-5 py-2.5 bg-accent hover:bg-accent-600 text-white text-xs font-bold rounded-2xl shadow-sm shadow-accent/20 flex items-center gap-1.5 transition hover:scale-[1.02] cursor-pointer"
                  >
                    <MdEdit size={16} />
                    <span>{t("editProfile")}</span>
                  </button>
                </div>
              </div>

              {/* Title & Metadata */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-black text-primary tracking-tight">
                    {currentUser.name}
                  </h1>
                  <span className="px-3 py-1 bg-accent/10 text-accent font-bold text-xs rounded-full border border-accent/20">
                    {t("verifiedMember")}
                  </span>
                  {currentUser.role === "admin" ? (
                    <span className="px-3 py-1 bg-primary/10 text-primary font-bold text-xs rounded-full border border-primary/20">
                      Platform Admin
                    </span>
                  ) : currentUser.role === "host" ? (
                    <span className="px-3 py-1 bg-amber-500/10 text-amber-700 font-bold text-xs rounded-full border border-amber-500/20 flex items-center gap-1">
                      <MdStars size={14} />
                      <span>{t("superhost")}</span>
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-secondary/15 text-secondary-800 font-bold text-xs rounded-full border border-secondary/30">
                      {t("explorer")}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500 font-medium pt-1">
                  {currentUser.location && (
                    <span className="flex items-center gap-1 text-neutral-700">
                      <MdLocationOn className="text-accent" size={16} />
                      <span>{currentUser.location}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <MdCalendarMonth className="text-neutral-400" size={16} />
                    <span>{t("memberSince", { date: formattedDate })}</span>
                  </span>
                </div>
              </div>

              {/* 2. Interactive Profile Completion Gauge */}
              <div className="mt-6 pt-5 border-t border-neutral-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">
                      {t("profileCompleteness")}
                    </span>
                    <span className="text-xs font-extrabold text-accent">
                      {completionData.score}%
                    </span>
                  </div>
                  {completionData.score === 100 ? (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <MdCheckCircle size={15} />
                      <span>All Set & Verified!</span>
                    </span>
                  ) : (
                    <p className="text-[11px] text-neutral-400">
                      {t("completionDesc")}
                    </p>
                  )}
                </div>

                {/* Progress Track */}
                <div className="w-full h-2.5 rounded-full bg-neutral-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-secondary transition-all duration-500"
                    style={{ width: `${completionData.score}%` }}
                  />
                </div>

                {/* Missing Items Chips */}
                {completionData.missing.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 items-center">
                    <span className="text-[11px] text-neutral-400 me-1">Complete:</span>
                    {completionData.missing.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveTab(item.tab)}
                        className="text-[11px] px-2.5 py-0.5 rounded-full bg-neutral-100 hover:bg-accent/10 hover:text-accent font-medium text-neutral-600 transition cursor-pointer"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-tertiary/40 overflow-x-auto no-scrollbar pb-0.5">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === "overview"
                  ? "border-accent text-accent"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <MdExplore size={18} />
              <span>{t("tabs.overview")}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("edit")}
              className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === "edit"
                  ? "border-accent text-accent"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <MdEdit size={18} />
              <span>{t("tabs.edit")}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("trips")}
              className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === "trips"
                  ? "border-accent text-accent"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <MdLuggage size={18} />
              <span>{t("tabs.trips")}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-neutral-100 text-[10px] text-neutral-600 font-extrabold">
                {reservations.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("favorites")}
              className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === "favorites"
                  ? "border-accent text-accent"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <MdFavorite size={18} />
              <span>{t("tabs.favorites")}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-neutral-100 text-[10px] text-neutral-600 font-extrabold">
                {currentUser.favoriteIds?.length || favorites.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("security")}
              className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                activeTab === "security"
                  ? "border-accent text-accent"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <MdSettings size={18} />
              <span>{t("tabs.security")}</span>
            </button>
          </div>

          {/* Tab Content Display */}
          <div>
            {activeTab === "overview" && (
              <ProfileOverviewTab
                currentUser={currentUser}
                reservations={reservations}
                favorites={favorites}
                userListings={userListings}
                onSwitchTab={setActiveTab}
              />
            )}

            {activeTab === "edit" && (
              <ProfileEditTab
                currentUser={currentUser}
                onUserUpdated={(updated) => setCurrentUser(updated)}
              />
            )}

            {activeTab === "trips" && (
              <ProfileTripsTab reservations={reservations} />
            )}

            {activeTab === "favorites" && (
              <ProfileFavoritesTab
                favorites={favorites}
                currentUser={currentUser}
              />
            )}

            {activeTab === "security" && (
              <ProfileSettingsTab
                currentUser={currentUser}
                onUserUpdated={(updated) => setCurrentUser(updated)}
              />
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
