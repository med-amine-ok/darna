"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Link } from "@/navigation";
import { Organization, Membership, Listing } from "@/types";
import ListingCard from "@/components/listing/ListingCard";
import Avatar from "@/components/Avatar";
import { toast } from "react-toastify";
import {
  BrandClockIcon,
  BrandShieldIcon,
  BrandPinIcon,
  BrandPlusIcon,
  BrandUsersIcon,
  BrandMailIcon,
  BrandPhoneIcon,
  BrandStarIcon,
} from "@/components/icons";

interface AgencyProfileClientProps {
  organization: Organization;
  members: Membership[];
  listings: Listing[];
}

export default function AgencyProfileClient({
  organization,
  members,
  listings,
}: AgencyProfileClientProps) {
  const isPending = organization.verificationStatus === "pending";

  return (
    <div className="space-y-8">
      {/* Top Banner & Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-tertiary shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-tertiary bg-neutral-50 shrink-0">
              <Image
                src={organization.logo || "/assets/logo-vertical.png"}
                alt={organization.name}
                fill
                className="object-contain p-2"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-3xl font-bold text-primary font-serif">
                  {organization.name}
                </h1>
                {isPending ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold border border-amber-200">
                    <BrandClockIcon size={14} /> Pending Verification
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold border border-emerald-200">
                    <BrandShieldIcon size={14} /> Verified Agency
                  </span>
                )}
              </div>

              <div className="text-xs text-neutral-500 flex flex-wrap items-center gap-3">
                <span className="font-semibold text-primary">{organization.businessType}</span>
                <span>·</span>
                <span className="font-mono text-neutral-400">{organization.businessRegistrationNumber}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <BrandPinIcon size={14} className="text-secondary" />
                  {organization.address}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/become-a-host/1"
              className="px-4 py-2.5 bg-primary text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-primary/95 transition shadow-xs flex items-center gap-1.5"
            >
              <BrandPlusIcon size={16} />
              <span>Add Listing to Fleet</span>
            </Link>
          </div>
        </div>

        {/* Verification Alert if Pending */}
        {isPending && (
          <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
            <BrandClockIcon size={18} className="shrink-0 mt-0.5 text-amber-700" />
            <div>
              <div className="font-bold">Compliance Review in Progress</div>
              <div className="text-amber-800 mt-0.5">
                DARNA compliance is verifying your commercial registry. Your listings can be prepared in draft mode and will be published once approved.
              </div>
            </div>
          </div>
        )}

        {/* Bio */}
        {organization.description && (
          <p className="mt-6 text-xs sm:text-sm text-neutral-600 leading-relaxed max-w-3xl">
            {organization.description}
          </p>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-tertiary/40">
          <div>
            <div className="text-xs text-neutral-400 font-medium">Listings Managed</div>
            <div className="text-2xl font-bold text-primary font-serif mt-0.5">
              {listings.length}
            </div>
          </div>
          <div>
            <div className="text-xs text-neutral-400 font-medium">Team Members</div>
            <div className="text-2xl font-bold text-primary font-serif mt-0.5">
              {members.length}
            </div>
          </div>
          <div>
            <div className="text-xs text-neutral-400 font-medium">Agency Rating</div>
            <div className="text-2xl font-bold text-primary font-serif mt-0.5 flex items-center gap-1.5">
              <BrandStarIcon size={20} className="text-accent fill-accent" />
              <span>{organization.rating || 4.9}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-neutral-400 font-medium">Reviews Received</div>
            <div className="text-2xl font-bold text-primary font-serif mt-0.5">
              {organization.reviewCount || 76}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Team & Contact */}
        <div className="lg:col-span-4 space-y-6">
          {/* Team Members Card */}
          <div className="bg-white rounded-3xl p-6 border border-tertiary shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-primary text-base font-serif flex items-center gap-2">
                <BrandUsersIcon size={18} className="text-secondary" />
                <span>Hospitality Team</span>
              </h3>
              <span className="text-xs text-neutral-400 font-medium">{members.length} members</span>
            </div>

            <div className="divide-y divide-tertiary/40">
              {members.map((mem) => (
                <div key={mem.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <Avatar src={mem.avatar} size={36} />
                    <div>
                      <div className="font-bold text-primary">{mem.name}</div>
                      <div className="text-[11px] text-neutral-400">{mem.email}</div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-tertiary/30 text-primary">
                    {mem.role}
                  </span>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => toast.info("Invite teammate modal opened.")}
              className="w-full py-2 bg-neutral-50 hover:bg-neutral-100 border border-tertiary/70 rounded-xl text-xs font-semibold text-neutral-700 transition flex items-center justify-center gap-1.5"
            >
              <BrandPlusIcon size={14} />
              <span>Invite Teammate</span>
            </button>
          </div>

          {/* Contact Agency Card */}
          <div className="bg-white rounded-3xl p-6 border border-tertiary shadow-sm space-y-3.5 text-xs text-neutral-700">
            <h3 className="font-bold text-primary text-base font-serif">Contact Information</h3>
            <div className="flex items-center gap-2.5">
              <BrandMailIcon size={16} className="text-secondary shrink-0" />
              <span>{organization.businessEmail}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <BrandPhoneIcon size={16} className="text-secondary shrink-0" />
              <span>{organization.businessPhone}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <BrandPinIcon size={16} className="text-secondary shrink-0" />
              <span>{organization.address}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Managed Fleet & Properties */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-primary font-serif">
              Properties & Fleet by {organization.name}
            </h2>
            <span className="text-xs text-neutral-400">{listings.length} listings</span>
          </div>

          {listings.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-tertiary text-center text-xs text-neutral-500 shadow-xs">
              No listings currently published by this agency.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {listings.map((item) => (
                <ListingCard key={item.id} data={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
