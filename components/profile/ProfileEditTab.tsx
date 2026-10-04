"use client";

import React, { useState } from "react";
import Image from "next/image";
import axios from "axios";
import { toast } from "react-toastify";
import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import {
  MdCameraAlt,
  MdCheck,
  MdAdd,
  MdClose,
  MdSave,
  MdLocationOn,
  MdWork,
  MdTranslate,
  MdVerified,
  MdRemoveRedEye,
} from "react-icons/md";
import { SafeUser } from "@/types";
import Avatar from "@/components/Avatar";

interface ProfileEditTabProps {
  currentUser: SafeUser;
  onUserUpdated: (updatedUser: SafeUser) => void;
}

const PRESET_AVATARS = [
  {
    name: "Alex (Casbah Architect)",
    url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Amine (Saharan Explorer)",
    url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Sarah (Coastal Photographer)",
    url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Karim (Constantine Guide)",
    url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Fatima (Mediterranean Host)",
    url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Tariq (Desert Nomad)",
    url: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80",
  },
];

const AVAILABLE_LANGUAGES = [
  "Arabic (العربية)",
  "French (Français)",
  "English",
  "Tamazight (البربرية)",
  "Spanish (Español)",
  "Italian (Italiano)",
];

const SUGGESTED_INTERESTS = [
  "Casbah Architecture",
  "Sahara Caravans",
  "Mediterranean Cuisine",
  "Desert Stargazing",
  "Artisanal Crafts",
  "Roman Ruins",
  "Coastal Diving",
  "Mountain Hiking",
];

export default function ProfileEditTab({
  currentUser,
  onUserUpdated,
}: ProfileEditTabProps) {
  const t = useTranslations("profile.editForm");
  const tProfile = useTranslations("profile");
  const router = useRouter();

  // Form states
  const [name, setName] = useState(currentUser.name || "");
  const [image, setImage] = useState(currentUser.image || PRESET_AVATARS[0].url);
  const [phone, setPhone] = useState(currentUser.phone || "");
  const [location, setLocation] = useState(currentUser.location || "");
  const [occupation, setOccupation] = useState(currentUser.occupation || "");
  const [bio, setBio] = useState(currentUser.bio || "");
  const [languages, setLanguages] = useState<string[]>(
    currentUser.languages && currentUser.languages.length > 0
      ? currentUser.languages
      : ["Arabic (العربية)", "French (Français)", "English"]
  );
  const [interests, setInterests] = useState<string[]>(
    currentUser.interests && currentUser.interests.length > 0
      ? currentUser.interests
      : ["Historical Architecture", "Casbah Wanderings", "Sahara Caravans"]
  );

  const [customInterest, setCustomInterest] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Toggle language selection
  const handleToggleLanguage = (lang: string) => {
    if (languages.includes(lang)) {
      setLanguages(languages.filter((l) => l !== lang));
    } else {
      setLanguages([...languages, lang]);
    }
  };

  // Add interest tag
  const handleAddInterest = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !interests.includes(trimmed)) {
      setInterests([...interests, trimmed]);
      setCustomInterest("");
    }
  };

  const handleRemoveInterest = (tag: string) => {
    setInterests(interests.filter((i) => i !== tag));
  };

  // Submit profile updates
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        name,
        image,
        phone,
        location,
        occupation,
        bio,
        languages,
        interests,
      };

      const response = await axios.patch("/api/profile", payload);
      const updated = response.data;

      onUserUpdated(updated);
      toast.success(t("saveSuccess"));
      router.refresh();
    } catch (error) {
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-primary tracking-tight">
          {t("title")}
        </h2>
        <p className="text-xs text-neutral-500 mt-1">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: 7 columns */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-surface p-6 sm:p-8 rounded-3xl border border-tertiary/40 shadow-xs space-y-6"
        >
          {/* 1. Avatar Chooser */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
              {t("avatarTitle")}
            </label>

            {/* Presets Gallery */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {PRESET_AVATARS.map((avatar, idx) => {
                const isSelected = image === avatar.url;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setImage(avatar.url)}
                    className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                      isSelected
                        ? "border-accent ring-2 ring-accent/30 scale-105 shadow-sm"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={avatar.url}
                      alt={avatar.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-accent/25 flex items-center justify-center">
                        <div className="w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center shadow-xs">
                          <MdCheck size={14} />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom URL Input */}
            <div className="pt-2">
              <input
                type="url"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder={t("customUrl")}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent bg-neutral-50/50"
              />
            </div>
          </div>

          {/* 2. Personal Info Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                {t("fullName")} *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("namePlaceholder")}
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-neutral-200 focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent bg-neutral-50/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                {t("phone")}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("phonePlaceholder")}
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-neutral-200 focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent bg-neutral-50/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                {t("location")}
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t("locationPlaceholder")}
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-neutral-200 focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent bg-neutral-50/30"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                {t("occupation")}
              </label>
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder={t("occupationPlaceholder")}
                className="w-full text-sm px-4 py-2.5 rounded-xl border border-neutral-200 focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent bg-neutral-50/30"
              />
            </div>
          </div>

          {/* 3. Bio Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-neutral-700">
                {t("bio")}
              </label>
              <span className="text-[11px] text-neutral-400">
                {bio.length}/350 chars
              </span>
            </div>
            <textarea
              rows={4}
              maxLength={350}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t("bioPlaceholder")}
              className="w-full text-sm px-4 py-3 rounded-2xl border border-neutral-200 focus:outline-hidden focus:border-accent focus:ring-1 focus:ring-accent bg-neutral-50/30 resize-none leading-relaxed"
            />
          </div>

          {/* 4. Languages Selection */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-2">
              {t("languages")}
            </label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_LANGUAGES.map((lang) => {
                const isSelected = languages.includes(lang);
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => handleToggleLanguage(lang)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-accent text-white shadow-xs"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {isSelected && <MdCheck size={14} />}
                    <span>{lang}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Interests & Tags */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-neutral-700">
              {t("interests")}
            </label>

            {/* Current Active Tags */}
            <div className="flex flex-wrap gap-2 min-h-[32px]">
              {interests.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-tertiary/20 text-primary-900 border border-tertiary/60"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveInterest(tag)}
                    className="hover:text-accent cursor-pointer"
                  >
                    <MdClose size={14} />
                  </button>
                </span>
              ))}
            </div>

            {/* Add Custom Tag */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customInterest}
                onChange={(e) => setCustomInterest(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddInterest(customInterest);
                  }
                }}
                placeholder={t("addInterestPlaceholder")}
                className="flex-1 text-xs px-3.5 py-2 rounded-xl border border-neutral-200 focus:outline-hidden focus:border-accent bg-neutral-50/50"
              />
              <button
                type="button"
                onClick={() => handleAddInterest(customInterest)}
                className="px-4 py-2 bg-neutral-800 hover:bg-black text-white text-xs font-semibold rounded-xl flex items-center gap-1 transition cursor-pointer"
              >
                <MdAdd size={16} />
                <span>Add</span>
              </button>
            </div>

            {/* Suggested Tags */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[11px] text-neutral-400 self-center me-1">
                Suggested:
              </span>
              {SUGGESTED_INTERESTS.filter((s) => !interests.includes(s)).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleAddInterest(s)}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition cursor-pointer"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-neutral-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-7 py-3 bg-accent hover:bg-accent-600 active:scale-[0.98] text-white text-sm font-bold rounded-2xl shadow-md shadow-accent/25 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              <MdSave size={18} />
              <span>{isSaving ? t("saving") : t("saveButton")}</span>
            </button>
          </div>
        </form>

        {/* Right Pane: Live Interactive Preview Card (5 columns) */}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400 px-1">
            <MdRemoveRedEye size={16} className="text-accent" />
            <span>{t("livePreview")}</span>
          </div>

          <div className="bg-surface rounded-3xl border border-tertiary shadow-lg overflow-hidden transition-all duration-300">
            {/* Scenic Card Banner */}
            <div className="h-28 bg-gradient-to-r from-accent via-accent-400 to-tertiary relative">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
            </div>

            {/* Avatar & Badges */}
            <div className="px-6 pb-6 pt-0 relative">
              <div className="flex justify-between items-end -mt-12 mb-4">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-4 border-surface shadow-md overflow-hidden bg-neutral-100">
                    <Avatar src={image} userName={name} size={96} />
                  </div>
                  <span className="absolute bottom-1 end-1 p-1 bg-status-success text-white rounded-full ring-2 ring-surface">
                    <MdVerified size={14} />
                  </span>
                </div>

                <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                  {currentUser.role === "admin"
                    ? "Admin"
                    : currentUser.role === "host"
                    ? "Superhost"
                    : "Guest"}
                </span>
              </div>

              {/* Name & Title */}
              <h3 className="text-xl font-extrabold text-primary leading-tight">
                {name || "Your Name"}
              </h3>
              {occupation && (
                <p className="text-xs font-medium text-neutral-500 mt-0.5 flex items-center gap-1">
                  <MdWork size={14} className="text-neutral-400" />
                  <span>{occupation}</span>
                </p>
              )}
              {location && (
                <p className="text-xs font-medium text-neutral-500 mt-0.5 flex items-center gap-1">
                  <MdLocationOn size={14} className="text-accent" />
                  <span>{location}</span>
                </p>
              )}

              {/* Bio Preview */}
              <div className="mt-4 pt-4 border-t border-neutral-100">
                <p className="text-xs text-neutral-600 leading-relaxed italic line-clamp-4">
                  {bio ? `“${bio}”` : "“Add a bio to introduce yourself to hosts and guests across Algeria.”"}
                </p>
              </div>

              {/* Languages Preview */}
              {languages.length > 0 && (
                <div className="mt-4 pt-3 border-t border-neutral-100">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block mb-1.5">
                    Languages
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {languages.map((l) => (
                      <span
                        key={l}
                        className="px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 text-[10px] font-medium"
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Interests Preview */}
              {interests.length > 0 && (
                <div className="mt-4 pt-3 border-t border-neutral-100">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block mb-1.5">
                    Interests
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {interests.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full bg-accent/10 text-accent text-[10px] font-semibold"
                      >
                        ✦ {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="text-[11px] text-neutral-400 text-center px-4">
            {t("livePreviewDesc")}
          </p>
        </div>
      </div>
    </div>
  );
}
