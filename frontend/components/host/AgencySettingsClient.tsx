"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "@/navigation";
import { Organization, User } from "@/types";
import { updateOrganization, deleteOrganization } from "@/lib/data/organizations";
import {
  BrandBadgeCheckIcon,
  BrandExternalLinkIcon,
  BrandExclamationIcon,
  BrandArrowLeftIcon,
  BrandMailIcon,
  BrandPhoneIcon,
  BrandPinIcon,
  BrandLightningIcon,
  BrandClockIcon,
} from "@/components/icons";
import { toast } from "react-toastify";
import ConfirmDialog from "@/components/models/ConfirmDialog";
import HostWalletWidget from "@/components/host/HostWalletWidget";

interface AgencySettingsClientProps {
  organization: Organization;
  currentUser?: User | null;
}

export default function AgencySettingsClient({
  organization: initialOrg,
  currentUser,
}: AgencySettingsClientProps) {
  const router = useRouter();
  const [org, setOrg] = useState<Organization>(initialOrg);
  const [name, setName] = useState(org.name);
  const [businessEmail, setBusinessEmail] = useState(org.businessEmail);
  const [businessPhone, setBusinessPhone] = useState(org.businessPhone);
  const [address, setAddress] = useState(org.address || "");
  const [description, setDescription] = useState(org.description || "");
  const [rcNumber, setRcNumber] = useState(org.businessRegistrationNumber);
  const [teamSize, setTeamSize] = useState(org.teamSizeEstimate || "2-10");
  const [bookingApprovalMode, setBookingApprovalMode] = useState<"instant" | "request">(
    org.bookingApprovalMode || "instant"
  );
  const [isSaving, setIsSaving] = useState(false);

  // Danger zone
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await updateOrganization(org.id, {
        name,
        businessEmail,
        businessPhone,
        address,
        description,
        businessRegistrationNumber: rcNumber,
        teamSizeEstimate: teamSize as any,
        bookingApprovalMode,
      });
      if (updated) {
        setOrg(updated);
        toast.success("Agency profile updated successfully!");
      }
    } catch {
      toast.error("Failed to update agency profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmInput !== org.name) {
      toast.error("Please type the exact organization name to confirm deletion.");
      return;
    }

    setIsDeleting(true);
    try {
      const success = await deleteOrganization(org.id);
      if (success) {
        toast.info("Agency workspace deactivated.");
        router.push("/host");
      }
    } catch {
      toast.error("Failed to delete agency.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href="/host"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-primary transition"
        >
          <BrandArrowLeftIcon size={16} className="rtl:rotate-180" />
          <span>Back to Host Overview</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">
            Agency Settings & Profile
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Configure legal entity details, official Algerian Trade Register credentials, and public agency profile.
          </p>
        </div>

        {/* Public profile button */}
        <Link
          href={`/agencies/${org.id}`}
          target="_blank"
          className="px-4 py-2 border border-tertiary/80 hover:bg-neutral-50 rounded-xl text-xs font-bold text-neutral-700 transition flex items-center gap-1.5 shadow-2xs self-start sm:self-auto"
        >
          <BrandExternalLinkIcon size={16} />
          <span>View Public Profile</span>
        </Link>
      </div>

      {/* Verification Badge Re-surfaced */}
      <div className="bg-white rounded-3xl border border-tertiary/70 p-6 shadow-2xs mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-secondary/15 text-secondary flex items-center justify-center shrink-0">
            <BrandBadgeCheckIcon size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-primary text-base">
                Compliance & Verification Status:
              </span>
              {org.verificationStatus === "verified" ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Verified Tourism Agency (SARL)
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  Under Ministry Compliance Review
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Verified agencies receive the DARNA Partner Seal and enhanced booking visibility for diaspora travelers.
            </p>
          </div>
        </div>
      </div>

      {/* Host Prepaid Wallet & Solvency Widget */}
      <HostWalletWidget
        ownerId={org.id}
        ownerType="organization"
        hostType={org.businessCategory}
        className="mb-8"
      />

      {/* Edit Form */}
      <form onSubmit={handleSave} className="bg-white rounded-3xl border border-tertiary/70 p-6 sm:p-8 shadow-2xs space-y-6 mb-8">
        <h3 className="font-serif text-lg font-bold text-primary pb-3 border-b border-tertiary/60">
          Organization Information
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-neutral-600 block mb-1">
              Agency Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary focus:outline-none focus:border-primary font-semibold"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-600 block mb-1">
              Registre de Commerce (RC Number)
            </label>
            <input
              type="text"
              value={rcNumber}
              onChange={(e) => setRcNumber(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary focus:outline-none focus:border-primary font-mono"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-neutral-600 block mb-1">
              Business Email
            </label>
            <div className="relative">
              <BrandMailIcon size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="email"
                value={businessEmail}
                onChange={(e) => setBusinessEmail(e.target.value)}
                className="w-full ps-9 pe-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary focus:outline-none focus:border-primary"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-600 block mb-1">
              Business Phone (+213)
            </label>
            <div className="relative">
              <BrandPhoneIcon size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="tel"
                value={businessPhone}
                onChange={(e) => setBusinessPhone(e.target.value)}
                className="w-full ps-9 pe-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary focus:outline-none focus:border-primary"
                required
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-neutral-600 block mb-1">
              Headquarters Address
            </label>
            <div className="relative">
              <BrandPinIcon size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full ps-9 pe-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-600 block mb-1">
              Team Size
            </label>
            <select
              value={teamSize}
              onChange={(e) => setTeamSize(e.target.value as any)}
              className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary focus:outline-none focus:border-primary"
            >
              <option value="1">1 Person (Sole Proprietorship)</option>
              <option value="2-10">2–10 Employees</option>
              <option value="11-50">11–50 Employees</option>
              <option value="50+">50+ Employees</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-neutral-600 block mb-1">
            Agency Bio & Public Description
          </label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary focus:outline-none focus:border-primary leading-relaxed"
          />
        </div>

        {/* Default Booking Approval Mode */}
        <div className="space-y-2 pt-2 border-t border-tertiary/40">
          <label className="text-xs font-bold text-neutral-700 block">
            Agency Booking Policy (Approval Mode)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setBookingApprovalMode("instant")}
              className={`p-3.5 rounded-2xl border text-start transition flex items-start gap-3 cursor-pointer ${
                bookingApprovalMode === "instant"
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-tertiary/70 bg-neutral-50 hover:bg-neutral-100/60"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                  bookingApprovalMode === "instant"
                    ? "bg-primary text-white"
                    : "bg-neutral-200 text-neutral-600"
                }`}
              >
                <BrandLightningIcon size={16} />
              </div>
              <div>
                <span className="font-bold text-xs text-primary block">Instant Booking</span>
                <span className="text-[10px] text-neutral-500 leading-snug block">
                  Fleet & stays confirm instantly without manual review.
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setBookingApprovalMode("request")}
              className={`p-3.5 rounded-2xl border text-start transition flex items-start gap-3 cursor-pointer ${
                bookingApprovalMode === "request"
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-tertiary/70 bg-neutral-50 hover:bg-neutral-100/60"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                  bookingApprovalMode === "request"
                    ? "bg-amber-600 text-white"
                    : "bg-neutral-200 text-neutral-600"
                }`}
              >
                <BrandClockIcon size={16} />
              </div>
              <div>
                <span className="font-bold text-xs text-primary block">Agency Review (24h)</span>
                <span className="text-[10px] text-neutral-500 leading-snug block">
                  Staff reviews license & deposit credentials before accepting.
                </span>
              </div>
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-tertiary/40">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition shadow-2xs disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Agency Profile"}
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="bg-rose-50/50 rounded-3xl border border-rose-200 p-6 sm:p-8">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0 mt-0.5">
            <BrandExclamationIcon size={20} />
          </div>
          <div>
            <h4 className="font-serif font-bold text-rose-900 text-base">
              Danger Zone: Organization Deactivation
            </h4>
            <p className="text-xs text-rose-700 mt-1 leading-relaxed">
              Deactivating this agency workspace revokes access for all team members and unpublishes
              all listings tagged under {org.name}. Individual host listings are preserved.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsDeleteModalOpen(true)}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-2xs"
        >
          Deactivate Agency Workspace
        </button>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteModalOpen}
        variant="destructive"
        title="Confirm Agency Deactivation"
        message="Deactivating your agency will unpublish all associated properties and fleet vehicles, revoke sub-host team credentials, and disband your DARNA business workspace."
        callout={
          <span>
            To confirm, please type the exact organization name:{" "}
            <strong className="text-primary font-bold">{org.name}</strong>
          </span>
        }
        confirmLabel="Deactivate agency"
        cancelLabel="Keep workspace"
        disabled={deleteConfirmInput !== org.name}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setDeleteConfirmInput("");
        }}
      >
        <input
          type="text"
          value={deleteConfirmInput}
          onChange={(e) => setDeleteConfirmInput(e.target.value)}
          placeholder={org.name}
          className="w-full px-3.5 py-2.5 bg-neutral-50 border border-tertiary/80 rounded-2xl text-xs text-primary focus:outline-none focus:border-rose-600 font-semibold"
        />
      </ConfirmDialog>
    </div>
  );
}
