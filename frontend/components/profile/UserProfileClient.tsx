"use client";

import React, { useState } from "react";
import Image from "next/image";
import { User, Listing, Review } from "@/types";
import ListingCard from "@/components/listing/ListingCard";
import Avatar from "@/components/Avatar";
import { toast } from "react-toastify";
import {
  PremiumStarIcon,
  BrandStarIcon,
  BrandShareIcon,
  BrandShieldIcon,
  BrandCheckIcon,
  BrandGlobeIcon,
  BrandEditIcon,
  BrandCameraIcon,
  BrandPinIcon,
  passportStampIcons,
} from "@/components/icons";

interface UserProfileClientProps {
  user: User;
  listings: Listing[];
  reviews: Review[];
  isOwner?: boolean;
}

export default function UserProfileClient({
  user: initialUser,
  listings,
  reviews,
  isOwner = false,
}: UserProfileClientProps) {
  const [user, setUser] = useState<User>(initialUser);
  const [activeTab, setActiveTab] = useState<"overview" | "edit" | "listings" | "reviews">("overview");

  // Edit form state
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(
    user.bio ||
      "Passionate traveler and host exploring the hidden architectural treasures of Algeria."
  );
  const [address, setAddress] = useState(user.address || "Tipaza & Algiers, Algeria");
  const [phone, setPhone] = useState(user.phone || "+213 550 12 34 56");
  const [languages, setLanguages] = useState<string[]>(
    user.languages || ["Arabic", "French", "English"]
  );
  const [funFact, setFunFact] = useState("Favorite road trip: Algiers to Djanet Tassili plateau");
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setUser((prev) => ({
        ...prev,
        name,
        bio,
        address,
        phone,
        languages,
      }));
      setIsSaving(false);
      toast.success("Profile successfully updated!");
      setActiveTab("overview");
    }, 400);
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.info("Profile link copied to clipboard!");
    }
  };

  const passportStamps = [
    { id: "algiers", name: "Casbah of Algiers", region: "North Coast", unlocked: true },
    { id: "tipaza", name: "Tipaza Roman Coast", region: "North Coast", unlocked: true },
    { id: "oran", name: "Oran El Bahia", region: "West Coast", unlocked: true },
    { id: "constantine", name: "Constantine Bridges", region: "East Rock", unlocked: true },
    { id: "taghit", name: "Taghit Golden Oasis", region: "Saoura Desert", unlocked: true },
    { id: "djanet", name: "Tassili n'Ajjer Plateau", region: "Deep Sahara", unlocked: true },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-tertiary/50 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary font-serif">
            {isOwner ? "Your Profile & Explorer Passport" : `${user.name}'s Profile`}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {isOwner
              ? "Manage your identity, Algerian passport stamps, and public traveler persona"
              : `Member since ${new Date(user.createdAt).getFullYear()} · Verified DARNA Community`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-tertiary rounded-xl text-xs sm:text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition shadow-xs"
          >
            <BrandShareIcon size={16} />
            <span>Share</span>
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === "edit" ? "overview" : "edit")}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-primary/95 transition shadow-xs"
            >
              <BrandEditIcon size={16} />
              <span>{activeTab === "edit" ? "View Profile" : "Edit Profile"}</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Avatar & Trust Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-tertiary shadow-sm text-center">
            <div className="relative inline-block mx-auto mb-4">
              <Avatar src={user.image} size={110} />
              {isOwner && (
                <button
                  type="button"
                  onClick={() => toast.info("Avatar photo change simulated.")}
                  className="absolute bottom-1 end-1 p-2 bg-primary text-white rounded-full shadow-md hover:bg-primary/90 transition"
                  title="Change photo"
                >
                  <BrandCameraIcon size={16} />
                </button>
              )}
            </div>

            <h2 className="text-xl font-bold text-primary font-serif">{user.name}</h2>
            <div className="text-xs text-neutral-500 mt-1">
              {user.role === "host" ? "Verified Host & Superhost" : "Verified Traveler"}
            </div>

            {/* Verification Badges */}
            <div className="my-6 p-4 bg-tertiary/20 rounded-2xl border border-tertiary/40 text-start space-y-2.5">
              <div className="text-xs font-bold text-primary uppercase tracking-wider">
                Confirmed Information
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-700">
                <BrandShieldIcon size={16} className="text-emerald-700 shrink-0" />
                <span>Identity verified with Algerian ID</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-700">
                <BrandCheckIcon size={16} className="text-emerald-700 shrink-0" />
                <span>Email address confirmed</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-700">
                <BrandCheckIcon size={16} className="text-emerald-700 shrink-0" />
                <span>Phone number verified</span>
              </div>
            </div>

            {/* Host Stats */}
            {user.role === "host" && (
              <div className="pt-4 border-t border-tertiary/50 grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold text-primary">{user.yearsHosting || 3}</div>
                  <div className="text-[11px] text-neutral-500">Years hosting</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-primary">{user.responseRate || 98}%</div>
                  <div className="text-[11px] text-neutral-500">Response rate</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-primary flex items-center gap-1">
                    <BrandStarIcon size={16} className="text-accent" />
                    <span>4.96</span>
                  </div>
                  <div className="text-[11px] text-neutral-500">Rating</div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Info Block */}
          <div className="bg-white rounded-3xl p-6 border border-tertiary shadow-sm space-y-3.5 text-xs text-neutral-700">
            <h3 className="font-bold text-primary text-sm">Profile Details</h3>
            <div className="flex items-center gap-2">
              <BrandPinIcon size={16} className="text-secondary shrink-0" />
              <span>Lives in: <strong>{user.address || "Algiers, Algeria"}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <BrandGlobeIcon size={16} className="text-secondary shrink-0" />
              <span>Languages: <strong>{(user.languages || ["Arabic", "French"]).join(", ")}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <BrandGlobeIcon size={16} className="text-secondary shrink-0" />
              <span>Wilayas visited: <strong>14 of 58</strong></span>
            </div>
          </div>
        </div>

        {/* Right Column: Content Tabs */}
        <div className="lg:col-span-8 space-y-6">
          {/* Tabs Navigation */}
          <div className="flex items-center gap-2 border-b border-tertiary/50 pb-2">
            {[
              { id: "overview", label: "Overview & Passport" },
              { id: "listings", label: `Listings (${listings.length})` },
              { id: "reviews", label: `Reviews (${reviews.length})` },
              ...(isOwner ? [{ id: "edit", label: "Edit Profile" }] : []),
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-primary text-white shadow-xs"
                    : "text-neutral-600 hover:text-primary hover:bg-neutral-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB: Overview & Passport */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* About Me */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-tertiary shadow-sm space-y-3">
                <h3 className="text-lg font-bold text-primary font-serif">About Me</h3>
                <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line">
                  {user.bio || "Welcome to my DARNA profile!"}
                </p>
                <div className="pt-3 border-t border-tertiary/40 text-xs text-neutral-500">
                  Fun fact: <span className="font-semibold text-primary">{funFact}</span>
                </div>
              </div>

              {/* Algerian Explorer Passport */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-tertiary shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-primary font-serif flex items-center gap-2">
                      <span>DARNA Algerian Explorer Passport</span>
                      <PremiumStarIcon size={18} className="text-accent" />
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Cultural wilaya stamps earned by booking stays and journeys across Algeria
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-bold">
                    6 Stamps Earned
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pt-2">
                  {passportStamps.map((stamp) => {
                    const StampIcon = passportStampIcons[stamp.id];
                    return (
                      <div
                        key={stamp.id}
                        className="p-3.5 bg-neutral-50 rounded-2xl border border-tertiary/60 flex flex-col items-center text-center hover:bg-tertiary/20 transition group"
                      >
                        <div className="w-12 h-12 mb-1.5 flex items-center justify-center transition-transform group-hover:scale-105">
                          {StampIcon && <StampIcon size={44} className="drop-shadow-xs" />}
                        </div>
                        <div className="text-xs font-bold text-primary">{stamp.name}</div>
                        <div className="text-[10px] text-neutral-400 mt-0.5">{stamp.region}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Listings */}
          {activeTab === "listings" && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-primary">
                Listings hosted by {user.name}
              </h3>
              {listings.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-tertiary text-center text-xs text-neutral-500">
                  No listings published yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {listings.map((listing) => (
                    <ListingCard key={listing.id} data={listing} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: Reviews */}
          {activeTab === "reviews" && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-primary">
                Community Reviews ({reviews.length})
              </h3>
              {reviews.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-tertiary text-center text-xs text-neutral-500">
                  No reviews received yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="bg-white rounded-2xl border border-tertiary p-5 shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <Avatar src={rev.user?.image} size={36} />
                          <div>
                            <div className="text-xs font-bold text-primary">
                              {rev.user?.name || "Traveler"}
                            </div>
                            <div className="text-[11px] text-neutral-400">
                              {new Date(rev.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-bold text-primary">
                          <BrandStarIcon size={14} className="text-amber-500 fill-amber-500" />
                          <span>{rev.rating}.0</span>
                        </div>
                      </div>
                      <p className="text-xs text-neutral-600 leading-relaxed">
                        {rev.comment}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: Edit Profile Form */}
          {activeTab === "edit" && isOwner && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-tertiary shadow-sm">
              <h3 className="text-lg font-bold text-primary font-serif mb-4">
                Edit Your Profile Information
              </h3>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-tertiary/70 rounded-xl text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    About You (Bio)
                  </label>
                  <textarea
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-tertiary/70 rounded-xl text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Where You Live (Wilaya)
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-4 py-2.5 bg-neutral-50 border border-tertiary/70 rounded-xl text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-2.5 bg-neutral-50 border border-tertiary/70 rounded-xl text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Fun Fact Prompt
                  </label>
                  <input
                    type="text"
                    value={funFact}
                    onChange={(e) => setFunFact(e.target.value)}
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-tertiary/70 rounded-xl text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab("overview")}
                    className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-neutral-600 hover:bg-neutral-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-primary text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-primary/95 transition shadow-sm disabled:opacity-50"
                  >
                    {isSaving ? "Saving changes..." : "Save Profile Changes"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
