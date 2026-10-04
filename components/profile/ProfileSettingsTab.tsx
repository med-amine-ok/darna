"use client";

import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useTranslations } from "next-intl";
import {
  MdNotificationsActive,
  MdContactPhone,
  MdHomeWork,
  MdSecurity,
  MdFileDownload,
  MdDeleteOutline,
  MdCheck,
  MdSave,
} from "react-icons/md";
import { Link } from "@/navigation";
import { SafeUser } from "@/types";

interface ProfileSettingsTabProps {
  currentUser: SafeUser;
  onUserUpdated: (updatedUser: SafeUser) => void;
}

export default function ProfileSettingsTab({
  currentUser,
  onUserUpdated,
}: ProfileSettingsTabProps) {
  const t = useTranslations("profile.settings");

  // Notifications state
  const [emailNotifs, setEmailNotifs] = useState(
    currentUser.notificationPreferences?.email ?? true
  );
  const [smsNotifs, setSmsNotifs] = useState(
    currentUser.notificationPreferences?.sms ?? true
  );
  const [pushNotifs, setPushNotifs] = useState(
    currentUser.notificationPreferences?.push ?? true
  );
  const [marketingNotifs, setMarketingNotifs] = useState(
    currentUser.notificationPreferences?.marketing ?? false
  );

  // Emergency contact state
  const [emergencyName, setEmergencyName] = useState(
    currentUser.emergencyContact?.name || ""
  );
  const [emergencyPhone, setEmergencyPhone] = useState(
    currentUser.emergencyContact?.phone || ""
  );
  const [emergencyRelation, setEmergencyRelation] = useState(
    currentUser.emergencyContact?.relationship || ""
  );

  const [isSavingContact, setIsSavingContact] = useState(false);

  // Toggle notification
  const handleToggleNotification = async (
    key: "email" | "sms" | "push" | "marketing",
    currentVal: boolean
  ) => {
    const newVal = !currentVal;
    if (key === "email") setEmailNotifs(newVal);
    if (key === "sms") setSmsNotifs(newVal);
    if (key === "push") setPushNotifs(newVal);
    if (key === "marketing") setMarketingNotifs(newVal);

    try {
      const updatedPrefs = {
        email: key === "email" ? newVal : emailNotifs,
        sms: key === "sms" ? newVal : smsNotifs,
        push: key === "push" ? newVal : pushNotifs,
        marketing: key === "marketing" ? newVal : marketingNotifs,
      };

      await axios.patch("/api/profile", {
        notificationPreferences: updatedPrefs,
      });

      toast.success("Notification preferences saved.");
    } catch {
      toast.error("Could not update preferences.");
    }
  };

  // Save emergency contact
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingContact(true);

    try {
      const emergencyContact = {
        name: emergencyName,
        phone: emergencyPhone,
        relationship: emergencyRelation,
      };

      const res = await axios.patch("/api/profile", { emergencyContact });
      onUserUpdated(res.data);
      toast.success("Emergency contact details saved.");
    } catch {
      toast.error("Failed to save emergency contact.");
    } finally {
      setIsSavingContact(false);
    }
  };

  // Export profile data
  const handleExportData = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(currentUser, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `darna-profile-${currentUser.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Profile data exported successfully.");
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-xl font-extrabold text-primary tracking-tight">
          {t("title")}
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">{t("subtitle")}</p>
      </div>

      {/* 1. Notification Preferences Card */}
      <div className="bg-surface p-6 sm:p-7 rounded-3xl border border-tertiary/40 shadow-xs space-y-5">
        <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
          <MdNotificationsActive className="text-accent" size={18} />
          <span>{t("notifications")}</span>
        </h3>

        <div className="divide-y divide-neutral-100 space-y-4">
          {/* Email */}
          <div className="flex items-center justify-between pt-2">
            <div className="pe-4">
              <p className="text-sm font-bold text-neutral-800">
                {t("emailNotifs")}
              </p>
              <p className="text-xs text-neutral-500">{t("emailNotifsDesc")}</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggleNotification("email", emailNotifs)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition cursor-pointer shrink-0 ${
                emailNotifs ? "bg-accent justify-end" : "bg-neutral-200 justify-start"
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
            </button>
          </div>

          {/* SMS */}
          <div className="flex items-center justify-between pt-4">
            <div className="pe-4">
              <p className="text-sm font-bold text-neutral-800">
                {t("smsNotifs")}
              </p>
              <p className="text-xs text-neutral-500">{t("smsNotifsDesc")}</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggleNotification("sms", smsNotifs)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition cursor-pointer shrink-0 ${
                smsNotifs ? "bg-accent justify-end" : "bg-neutral-200 justify-start"
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
            </button>
          </div>

          {/* Push */}
          <div className="flex items-center justify-between pt-4">
            <div className="pe-4">
              <p className="text-sm font-bold text-neutral-800">
                {t("pushNotifs")}
              </p>
              <p className="text-xs text-neutral-500">{t("pushNotifsDesc")}</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggleNotification("push", pushNotifs)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition cursor-pointer shrink-0 ${
                pushNotifs ? "bg-accent justify-end" : "bg-neutral-200 justify-start"
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
            </button>
          </div>

          {/* Marketing */}
          <div className="flex items-center justify-between pt-4">
            <div className="pe-4">
              <p className="text-sm font-bold text-neutral-800">
                {t("marketingNotifs")}
              </p>
              <p className="text-xs text-neutral-500">{t("marketingNotifsDesc")}</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggleNotification("marketing", marketingNotifs)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition cursor-pointer shrink-0 ${
                marketingNotifs ? "bg-accent justify-end" : "bg-neutral-200 justify-start"
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Emergency Contact Form */}
      <form
        onSubmit={handleSaveContact}
        className="bg-surface p-6 sm:p-7 rounded-3xl border border-tertiary/40 shadow-xs space-y-4"
      >
        <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
          <MdContactPhone className="text-accent" size={18} />
          <span>{t("emergency")}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              {t("emergencyName")}
            </label>
            <input
              type="text"
              value={emergencyName}
              onChange={(e) => setEmergencyName(e.target.value)}
              placeholder="e.g. Yasmine Morgan"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-hidden focus:border-accent bg-neutral-50/40"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              {t("emergencyPhone")}
            </label>
            <input
              type="tel"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              placeholder="+213 552 98 76 54"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-hidden focus:border-accent bg-neutral-50/40"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              {t("emergencyRelation")}
            </label>
            <input
              type="text"
              value={emergencyRelation}
              onChange={(e) => setEmergencyRelation(e.target.value)}
              placeholder="e.g. Sister, Spouse, Friend"
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-neutral-200 focus:outline-hidden focus:border-accent bg-neutral-50/40"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSavingContact}
            className="px-5 py-2 bg-primary hover:bg-primary-800 text-white text-xs font-bold rounded-xl shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <MdSave size={16} />
            <span>{isSavingContact ? "Saving..." : "Save Emergency Contact"}</span>
          </button>
        </div>
      </form>

      {/* 3. Host Mode Card */}
      <div className="bg-gradient-to-r from-primary to-primary-900 text-white p-6 sm:p-7 rounded-3xl shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-extrabold flex items-center gap-2">
            <MdHomeWork className="text-accent" size={20} />
            <span>{t("hostSectionTitle")}</span>
          </h3>
          <p className="text-xs text-neutral-300 max-w-lg">
            {t("hostSectionDesc")}
          </p>
        </div>
        <Link
          href="/become-a-host"
          className="px-5 py-2.5 bg-accent hover:bg-accent-600 text-white text-xs font-bold rounded-xl shadow-xs whitespace-nowrap self-start sm:self-auto transition cursor-pointer"
        >
          {t("becomeHost")}
        </Link>
      </div>

      {/* 4. Privacy & Data Export */}
      <div className="bg-surface p-6 sm:p-7 rounded-3xl border border-tertiary/40 shadow-xs space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
          <MdSecurity className="text-neutral-500" size={18} />
          <span>{t("dangerZone")}</span>
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div>
            <p className="text-xs font-semibold text-neutral-800">
              {t("downloadData")}
            </p>
            <p className="text-[11px] text-neutral-400">
              Download a copy of your bookings, verified credentials, and settings in JSON.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportData}
            className="px-4 py-2 border border-tertiary hover:bg-background text-primary text-xs font-semibold rounded-xl flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
          >
            <MdFileDownload size={16} />
            <span>Export Data</span>
          </button>
        </div>
      </div>
    </div>
  );
}
