"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "@/navigation";
import { useLocale } from "next-intl";
import { User } from "@/types";
import { toast } from "react-toastify";
import {
  BrandUserIcon,
  BrandShieldIcon,
  BrandEyeIcon,
  BrandBellIcon,
  BrandReceiptIcon,
  BrandCreditCardIcon,
  BrandGlobeIcon,
  BrandKeyIcon,
  BrandBriefcaseIcon,
  BrandFilterIcon,
  BrandPlusIcon,
  BrandTrashIcon,
} from "@/components/icons";
import ConfirmDialog from "@/components/models/ConfirmDialog";

interface SettingsClientProps {
  currentUser?: User | null;
}

export default function SettingsClient({ currentUser }: SettingsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();

  const [activeSection, setActiveSection] = useState<string>("personal");

  // Destructive confirmation dialog states
  const [isLogoutSessionOpen, setIsLogoutSessionOpen] = useState(false);
  const [isDeactivateAccountOpen, setIsDeactivateAccountOpen] = useState(false);
  const [cardToRemove, setCardToRemove] = useState<string | null>(null);

  // Personal Information State
  const [legalName, setLegalName] = useState(currentUser?.name || "Amina Benali");
  const [preferredName, setPreferredName] = useState("");
  const [email, setEmail] = useState(currentUser?.email || "amina.benali@darna.dz");
  const [phone, setPhone] = useState(currentUser?.phone || "+213 550 12 34 56");
  const [resAddress, setResAddress] = useState(currentUser?.address || "Tipaza Coastal Road, Algeria");
  const [mailingAddress, setMailingAddress] = useState("");

  // Editing flags
  const [editingField, setEditingField] = useState<string | null>(null);

  // Security State
  const [currPass, setCurrPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  // Currency State
  const [currency, setCurrency] = useState("DZD");

  // Notification Matrix State
  const [notifMatrix, setNotifMatrix] = useState({
    bookingEmail: true,
    bookingPush: true,
    bookingSms: true,
    messagesEmail: true,
    messagesPush: true,
    messagesSms: false,
    promoEmail: false,
    promoPush: true,
    promoSms: false,
    accountEmail: true,
    accountPush: true,
    accountSms: true,
  });

  // Booking permissions
  const [instantBook, setInstantBook] = useState(true);
  const [requireId, setRequireId] = useState(true);
  const [requireReviews, setRequireReviews] = useState(false);

  // Travel for work
  const [workTravelEnabled, setWorkTravelEnabled] = useState(false);

  const toggleNotif = (key: keyof typeof notifMatrix) => {
    setNotifMatrix((prev) => ({ ...prev, [key]: !prev[key] }));
    toast.success("Notification preferences updated.");
  };

  const navItems = [
    { id: "personal", label: "Personal information", icon: BrandUserIcon },
    { id: "security", label: "Login & security", icon: BrandShieldIcon },
    { id: "privacy", label: "Privacy & sharing", icon: BrandEyeIcon },
    { id: "notifications", label: "Notifications", icon: BrandBellIcon },
    { id: "taxes", label: "Taxes & invoices", icon: BrandReceiptIcon },
    { id: "payments", label: "Payments & payouts", icon: BrandCreditCardIcon },
    { id: "languages", label: "Languages & currency", icon: BrandGlobeIcon },
    { id: "booking_permissions", label: "Booking permissions", icon: BrandKeyIcon, badge: "New" },
    { id: "travel_for_work", label: "Travel for work", icon: BrandBriefcaseIcon },
  ];

  const maskEmail = (val: string) => {
    const parts = val.split("@");
    if (parts.length !== 2) return val;
    const name = parts[0];
    const masked = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : `${name}***`;
    return `${masked}@${parts[1]}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 py-6">
      {/* LEFT NAVIGATION COLUMN */}
      <div className="md:col-span-4 lg:col-span-3 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-primary font-serif mb-1">
            Account Settings
          </h2>
          <p className="text-xs text-neutral-500">
            {currentUser?.name || "Member"} · {currentUser?.email}
          </p>
        </div>

        {/* Group 1: General Settings */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveSection(item.id);
                  setEditingField(null);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition text-start ${
                  isActive
                    ? "bg-primary text-white shadow-xs"
                    : "text-neutral-700 hover:bg-tertiary/20"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon size={17} className={isActive ? "text-white" : "text-secondary"} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      isActive ? "bg-white/20 text-white" : "bg-accent/15 text-accent"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Separated Group: Professional Hosting Tools */}
        <div className="pt-4 border-t border-tertiary/50">
          <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2 px-3">
            Hosting Management
          </div>
          <button
            type="button"
            onClick={() => setActiveSection("pro_hosting")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition text-start ${
              activeSection === "pro_hosting"
                ? "bg-primary text-white shadow-xs"
                : "text-neutral-700 hover:bg-tertiary/20"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <BrandFilterIcon
                size={17}
                className={activeSection === "pro_hosting" ? "text-white" : "text-secondary"}
              />
              <span>Professional hosting tools</span>
            </div>
          </button>
        </div>
      </div>

      {/* RIGHT MAIN PANEL */}
      <div className="md:col-span-8 lg:col-span-9 bg-white rounded-3xl p-6 sm:p-10 border border-tertiary shadow-sm">
        {/* PANEL: Personal Information */}
        {activeSection === "personal" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-primary font-serif">
                Personal Information
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Your legal identity details and contact info used for bookings and Algerian tax receipts
              </p>
            </div>

            <div className="divide-y divide-tertiary/40">
              {/* Field: Legal name */}
              <div className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-neutral-500">Legal name</div>
                    <div className="text-sm font-medium text-primary mt-0.5">{legalName}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingField(editingField === "legalName" ? null : "legalName")}
                    className="text-xs font-semibold text-secondary hover:underline"
                  >
                    {editingField === "legalName" ? "Cancel" : "Edit"}
                  </button>
                </div>
                {editingField === "legalName" && (
                  <div className="mt-3 p-4 bg-neutral-50 rounded-2xl border border-tertiary/50 space-y-3">
                    <input
                      type="text"
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-tertiary/80 rounded-xl text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setEditingField(null);
                        toast.success("Legal name saved.");
                      }}
                      className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>

              {/* Field: Preferred name */}
              <div className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-neutral-500">Preferred first name</div>
                    <div className="text-sm text-neutral-400 mt-0.5">
                      {preferredName || "Not provided"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingField(editingField === "preferredName" ? null : "preferredName")}
                    className="text-xs font-semibold text-secondary hover:underline"
                  >
                    {editingField === "preferredName" ? "Cancel" : preferredName ? "Edit" : "Add"}
                  </button>
                </div>
                {editingField === "preferredName" && (
                  <div className="mt-3 p-4 bg-neutral-50 rounded-2xl border border-tertiary/50 space-y-3">
                    <input
                      type="text"
                      value={preferredName}
                      placeholder="e.g. Mina"
                      onChange={(e) => setPreferredName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-tertiary/80 rounded-xl text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setEditingField(null);
                        toast.success("Preferred name updated.");
                      }}
                      className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>

              {/* Field: Email address */}
              <div className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-neutral-500">Email address</div>
                    <div className="text-sm font-medium text-primary mt-0.5">
                      {maskEmail(email)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingField(editingField === "email" ? null : "email")}
                    className="text-xs font-semibold text-secondary hover:underline"
                  >
                    {editingField === "email" ? "Cancel" : "Edit"}
                  </button>
                </div>
                {editingField === "email" && (
                  <div className="mt-3 p-4 bg-neutral-50 rounded-2xl border border-tertiary/50 space-y-3">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-tertiary/80 rounded-xl text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setEditingField(null);
                        toast.success("Verification link sent to new email.");
                      }}
                      className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold"
                    >
                      Save & Verify
                    </button>
                  </div>
                )}
              </div>

              {/* Field: Phone number */}
              <div className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-neutral-500">Phone numbers</div>
                    <div className="text-sm font-medium text-primary mt-0.5">{phone}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingField(editingField === "phone" ? null : "phone")}
                    className="text-xs font-semibold text-secondary hover:underline"
                  >
                    {editingField === "phone" ? "Cancel" : "Edit"}
                  </button>
                </div>
                {editingField === "phone" && (
                  <div className="mt-3 p-4 bg-neutral-50 rounded-2xl border border-tertiary/50 space-y-3">
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-tertiary/80 rounded-xl text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setEditingField(null);
                        toast.success("Phone number saved.");
                      }}
                      className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>

              {/* Field: Identity verification */}
              <div className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-neutral-500">Identity verification</div>
                    <div className="text-sm font-semibold text-emerald-700 mt-0.5 flex items-center gap-1.5">
                      <BrandShieldIcon size={16} />
                      <span>Verified with Algerian Biometric National ID</span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-neutral-400">Completed</span>
                </div>
              </div>

              {/* Field: Residential address */}
              <div className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-neutral-500">Residential address</div>
                    <div className="text-sm font-medium text-primary mt-0.5">{resAddress}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingField(editingField === "resAddress" ? null : "resAddress")}
                    className="text-xs font-semibold text-secondary hover:underline"
                  >
                    {editingField === "resAddress" ? "Cancel" : "Edit"}
                  </button>
                </div>
                {editingField === "resAddress" && (
                  <div className="mt-3 p-4 bg-neutral-50 rounded-2xl border border-tertiary/50 space-y-3">
                    <input
                      type="text"
                      value={resAddress}
                      onChange={(e) => setResAddress(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-tertiary/80 rounded-xl text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setEditingField(null);
                        toast.success("Residential address updated.");
                      }}
                      className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>

              {/* Field: Mailing address */}
              <div className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-neutral-500">Mailing address</div>
                    <div className="text-sm text-neutral-400 mt-0.5">
                      {mailingAddress || "Not provided"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingField(editingField === "mailingAddress" ? null : "mailingAddress")}
                    className="text-xs font-semibold text-secondary hover:underline"
                  >
                    {editingField === "mailingAddress" ? "Cancel" : mailingAddress ? "Edit" : "Add"}
                  </button>
                </div>
                {editingField === "mailingAddress" && (
                  <div className="mt-3 p-4 bg-neutral-50 rounded-2xl border border-tertiary/50 space-y-3">
                    <input
                      type="text"
                      value={mailingAddress}
                      placeholder="P.O. Box or alternate postal address"
                      onChange={(e) => setMailingAddress(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-tertiary/80 rounded-xl text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setEditingField(null);
                        toast.success("Mailing address updated.");
                      }}
                      className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PANEL: Login & Security */}
        {activeSection === "security" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-primary font-serif">
                Login & Security
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Manage passwords, active devices, and session security
              </p>
            </div>

            {/* Change Password Form */}
            <div className="p-5 bg-neutral-50 rounded-2xl border border-tertiary/60 space-y-3">
              <h3 className="font-bold text-primary text-sm">Change Password</h3>
              <div className="space-y-2">
                <input
                  type="password"
                  value={currPass}
                  onChange={(e) => setCurrPass(e.target.value)}
                  placeholder="Current password"
                  className="w-full px-3.5 py-2 bg-white border border-tertiary/70 rounded-xl text-xs sm:text-sm"
                />
                <input
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="New password"
                  className="w-full px-3.5 py-2 bg-white border border-tertiary/70 rounded-xl text-xs sm:text-sm"
                />
                <input
                  type="password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-3.5 py-2 bg-white border border-tertiary/70 rounded-xl text-xs sm:text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!currPass || !newPass) {
                    toast.error("Please fill in password fields.");
                    return;
                  }
                  toast.success("Password changed successfully.");
                  setCurrPass("");
                  setNewPass("");
                  setConfirmPass("");
                }}
                className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-semibold"
              >
                Update password
              </button>
            </div>

            {/* Active Sessions */}
            <div className="space-y-3">
              <h3 className="font-bold text-primary text-sm">Active Device Sessions</h3>
              <div className="space-y-2">
                <div className="p-3.5 bg-white rounded-2xl border border-tertiary/60 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-primary">MacBook Pro · Algiers (Current)</div>
                    <div className="text-neutral-400 mt-0.5">Chrome on macOS · Active now</div>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold">
                    This Device
                  </span>
                </div>
                <div className="p-3.5 bg-white rounded-2xl border border-tertiary/60 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-primary">iPhone 15 · Oran</div>
                    <div className="text-neutral-400 mt-0.5">DARNA iOS App · 2 hours ago</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsLogoutSessionOpen(true)}
                    className="text-rose-600 hover:underline font-semibold"
                  >
                    Log out
                  </button>
                </div>
              </div>
            </div>

            {/* Deactivate Account */}
            <div className="pt-4 border-t border-tertiary/50 flex items-center justify-between">
              <div>
                <div className="font-bold text-primary text-sm">Deactivate your account</div>
                <div className="text-xs text-neutral-500">Temporarily hide your profile and active listings</div>
              </div>
              <button
                type="button"
                onClick={() => setIsDeactivateAccountOpen(true)}
                className="px-4 py-2 text-rose-600 border border-rose-200 rounded-xl text-xs font-semibold hover:bg-rose-50 transition"
              >
                Deactivate
              </button>
            </div>
          </div>
        )}

        {/* PANEL: Notifications Grid */}
        {activeSection === "notifications" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-primary font-serif">
                Notification Preferences
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Choose how you receive messages, itinerary reminders, and DARNA updates
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead>
                  <tr className="border-b border-tertiary/60 text-neutral-500">
                    <th className="py-3 text-start font-semibold">Notification Type</th>
                    <th className="py-3 text-center font-semibold">Email</th>
                    <th className="py-3 text-center font-semibold">Push</th>
                    <th className="py-3 text-center font-semibold">SMS / WhatsApp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tertiary/30">
                  <tr>
                    <td className="py-3 font-semibold text-primary">
                      Booking Updates & Confirmations
                    </td>
                    <td className="text-center py-3">
                      <input
                        type="checkbox"
                        checked={notifMatrix.bookingEmail}
                        onChange={() => toggleNotif("bookingEmail")}
                        className="rounded text-primary"
                      />
                    </td>
                    <td className="text-center py-3">
                      <input
                        type="checkbox"
                        checked={notifMatrix.bookingPush}
                        onChange={() => toggleNotif("bookingPush")}
                        className="rounded text-primary"
                      />
                    </td>
                    <td className="text-center py-3">
                      <input
                        type="checkbox"
                        checked={notifMatrix.bookingSms}
                        onChange={() => toggleNotif("bookingSms")}
                        className="rounded text-primary"
                      />
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 font-semibold text-primary">
                      Guest & Host Messages
                    </td>
                    <td className="text-center py-3">
                      <input
                        type="checkbox"
                        checked={notifMatrix.messagesEmail}
                        onChange={() => toggleNotif("messagesEmail")}
                        className="rounded text-primary"
                      />
                    </td>
                    <td className="text-center py-3">
                      <input
                        type="checkbox"
                        checked={notifMatrix.messagesPush}
                        onChange={() => toggleNotif("messagesPush")}
                        className="rounded text-primary"
                      />
                    </td>
                    <td className="text-center py-3">
                      <input
                        type="checkbox"
                        checked={notifMatrix.messagesSms}
                        onChange={() => toggleNotif("messagesSms")}
                        className="rounded text-primary"
                      />
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 font-semibold text-primary">
                      Promotions & Travel Inspiration
                    </td>
                    <td className="text-center py-3">
                      <input
                        type="checkbox"
                        checked={notifMatrix.promoEmail}
                        onChange={() => toggleNotif("promoEmail")}
                        className="rounded text-primary"
                      />
                    </td>
                    <td className="text-center py-3">
                      <input
                        type="checkbox"
                        checked={notifMatrix.promoPush}
                        onChange={() => toggleNotif("promoPush")}
                        className="rounded text-primary"
                      />
                    </td>
                    <td className="text-center py-3">
                      <input
                        type="checkbox"
                        checked={notifMatrix.promoSms}
                        onChange={() => toggleNotif("promoSms")}
                        className="rounded text-primary"
                      />
                    </td>
                  </tr>

                  <tr>
                    <td className="py-3 font-semibold text-primary">
                      Account & Security Alerts
                    </td>
                    <td className="text-center py-3">
                      <input
                        type="checkbox"
                        checked={notifMatrix.accountEmail}
                        onChange={() => toggleNotif("accountEmail")}
                        className="rounded text-primary"
                      />
                    </td>
                    <td className="text-center py-3">
                      <input
                        type="checkbox"
                        checked={notifMatrix.accountPush}
                        onChange={() => toggleNotif("accountPush")}
                        className="rounded text-primary"
                      />
                    </td>
                    <td className="text-center py-3">
                      <input
                        type="checkbox"
                        checked={notifMatrix.accountSms}
                        onChange={() => toggleNotif("accountSms")}
                        className="rounded text-primary"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PANEL: Payments & Payouts */}
        {activeSection === "payments" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-primary font-serif">
                Payments & Payouts
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Manage your Algerian CIB / Edahabia cards and host bank payout accounts
              </p>
            </div>

            {/* Saved Cards */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-primary text-sm">Saved Payment Methods</h3>
                <button
                  type="button"
                  onClick={() => toast.info("Add payment card modal.")}
                  className="text-xs font-semibold text-secondary flex items-center gap-1 hover:underline"
                >
                  <BrandPlusIcon size={16} />
                  <span>Add method</span>
                </button>
              </div>

              <div className="space-y-2">
                <div className="p-4 bg-neutral-50 rounded-2xl border border-tertiary/70 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-primary text-white rounded font-mono font-bold text-[10px]">
                      CIB
                    </span>
                    <div>
                      <div className="font-semibold text-primary">CIB Gold Card ·••• 4242</div>
                      <div className="text-neutral-400">Expires 09/28 · Default</div>
                    </div>
                  </div>
                  <span className="text-emerald-700 font-bold">Active</span>
                </div>

                <div className="p-4 bg-neutral-50 rounded-2xl border border-tertiary/70 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 bg-amber-600 text-white rounded font-mono font-bold text-[10px]">
                      EDAHABIA
                    </span>
                    <div>
                      <div className="font-semibold text-primary">Algérie Poste Edahabia ·••• 8890</div>
                      <div className="text-neutral-400">Expires 11/27</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCardToRemove("Algérie Poste Edahabia (•••• 8890)")}
                    className="text-neutral-400 hover:text-rose-600 transition"
                  >
                    <BrandTrashIcon size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Host Payout Account */}
            <div className="pt-4 border-t border-tertiary/50 space-y-3">
              <h3 className="font-bold text-primary text-sm">Host Payout Methods</h3>
              <div className="p-4 bg-neutral-50 rounded-2xl border border-tertiary/70 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-primary">BNA Bank Account (Banque Nationale d&apos;Algérie)</div>
                  <div className="text-neutral-500 mt-0.5 font-mono">
                    RIB: 001 00123 4567890123 45
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toast.info("Edit bank RIB")}
                  className="text-secondary font-semibold hover:underline"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PANEL: Languages & Currency */}
        {activeSection === "languages" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-primary font-serif">
                Languages & Currency
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Customize your display language, direction (RTL/LTR), and currency units
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-2">
                  Display Language
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { code: "en", label: "English", sub: "English (US)" },
                    { code: "fr", label: "Français", sub: "Français (Algérie)" },
                    { code: "ar", label: "العربية", sub: "العربية (RTL)" },
                  ].map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() =>
                        router.replace(pathname, {
                          locale: l.code as "en" | "fr" | "ar",
                        })
                      }
                      className={`p-3.5 rounded-2xl border text-start transition ${
                        currentLocale === l.code
                          ? "bg-primary text-white border-primary shadow-xs"
                          : "bg-neutral-50 text-neutral-700 border-tertiary/70 hover:bg-neutral-100"
                      }`}
                    >
                      <div className="text-sm font-bold">{l.label}</div>
                      <div className={`text-[11px] mt-0.5 ${currentLocale === l.code ? "text-white/80" : "text-neutral-400"}`}>
                        {l.sub}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3">
                <label className="block text-xs font-semibold text-neutral-700 mb-2">
                  Preferred Currency
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { code: "DZD", label: "Algerian Dinar (DZD)", symbol: "د.ج" },
                    { code: "EUR", label: "Euro (€)", symbol: "€" },
                    { code: "USD", label: "US Dollar ($)", symbol: "$" },
                  ].map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setCurrency(c.code);
                        toast.success(`Currency set to ${c.code}`);
                      }}
                      className={`p-3.5 rounded-2xl border text-start transition ${
                        currency === c.code
                          ? "bg-primary text-white border-primary shadow-xs"
                          : "bg-neutral-50 text-neutral-700 border-tertiary/70 hover:bg-neutral-100"
                      }`}
                    >
                      <div className="text-sm font-bold">{c.code}</div>
                      <div className={`text-[11px] mt-0.5 ${currency === c.code ? "text-white/80" : "text-neutral-400"}`}>
                        {c.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PANEL: Booking Permissions */}
        {activeSection === "booking_permissions" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-primary font-serif">
                Booking Permissions
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Configure instant booking criteria and guest verification gates
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-neutral-50 rounded-2xl border border-tertiary/70 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-primary">Instant Booking</div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    Allow qualified guests to book your stay without waiting for manual approval
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={instantBook}
                  onChange={(e) => setInstantBook(e.target.checked)}
                  className="rounded text-primary w-4 h-4"
                />
              </div>

              <div className="p-4 bg-neutral-50 rounded-2xl border border-tertiary/70 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-primary">Require Verified National ID</div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    Only guests with verified Algerian ID or Passport can book
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={requireId}
                  onChange={(e) => setRequireId(e.target.checked)}
                  className="rounded text-primary w-4 h-4"
                />
              </div>

              <div className="p-4 bg-neutral-50 rounded-2xl border border-tertiary/70 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-primary">Require Positive Past Reviews</div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    Only guests with at least 1 positive review and no complaints can instant book
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={requireReviews}
                  onChange={(e) => setRequireReviews(e.target.checked)}
                  className="rounded text-primary w-4 h-4"
                />
              </div>
            </div>
          </div>
        )}

        {/* PANEL: Taxes & Invoices */}
        {activeSection === "taxes" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-primary font-serif">
                Taxes & Fiscal Information
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Algerian Tax Registration (NIF / NIS) for host compliance
              </p>
            </div>

            <div className="p-5 bg-neutral-50 rounded-2xl border border-tertiary/60 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Numéro d&apos;Identification Fiscale (NIF)
                </label>
                <input
                  type="text"
                  placeholder="001234567890123"
                  className="w-full px-3.5 py-2 bg-white border border-tertiary/80 rounded-xl"
                />
              </div>
              <button
                type="button"
                onClick={() => toast.success("Tax details recorded.")}
                className="px-4 py-2 bg-primary text-white rounded-xl font-semibold"
              >
                Save Tax Profile
              </button>
            </div>
          </div>
        )}

        {/* PANEL: Privacy */}
        {activeSection === "privacy" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-primary font-serif">
                Privacy & Data Sharing
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Control your public visibility and export your DARNA account history
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 bg-neutral-50 rounded-2xl border border-tertiary/60 flex items-center justify-between">
                <div>
                  <div className="font-bold text-primary">Search engine listing</div>
                  <div className="text-neutral-500">Allow Google to index your public host profile</div>
                </div>
                <input type="checkbox" defaultChecked className="rounded text-primary" />
              </div>
              <div className="p-4 bg-neutral-50 rounded-2xl border border-tertiary/60 flex items-center justify-between">
                <div>
                  <div className="font-bold text-primary">Download your personal data</div>
                  <div className="text-neutral-500">Get a copy of your bookings, reviews, and messages</div>
                </div>
                <button
                  type="button"
                  onClick={() => toast.info("Data export requested.")}
                  className="px-3 py-1.5 bg-white border border-tertiary rounded-xl font-semibold text-primary"
                >
                  Export ZIP
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PANEL: Travel for work */}
        {activeSection === "travel_for_work" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-primary font-serif">
                Travel for Work
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Add your company email for business trips and tax-compliant corporate invoicing
              </p>
            </div>

            <div className="p-4 bg-neutral-50 rounded-2xl border border-tertiary/60 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-primary">Enable Business Travel Mode</div>
                <div className="text-neutral-500 mt-0.5">
                  Allows splitting billing and attaching company VAT receipts
                </div>
              </div>
              <input
                type="checkbox"
                checked={workTravelEnabled}
                onChange={(e) => setWorkTravelEnabled(e.target.checked)}
                className="rounded text-primary w-4 h-4"
              />
            </div>
          </div>
        )}

        {/* PANEL: Professional Hosting Tools */}
        {activeSection === "pro_hosting" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-primary font-serif">
                Professional Hosting Tools
              </h2>
              <p className="text-xs text-neutral-500 mt-1">
                Advanced features for multi-property managers, tourism agencies, and rental fleets
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-5 bg-neutral-50 rounded-2xl border border-tertiary/60 space-y-2">
                <h3 className="font-bold text-primary text-sm">Automated Pricing Rules</h3>
                <p className="text-neutral-500">
                  Automatically adjust nightly rates during Algerian high season (Eid, Sahara winter festivals).
                </p>
                <button
                  type="button"
                  onClick={() => toast.info("Pricing rules editor")}
                  className="text-secondary font-semibold hover:underline"
                >
                  Configure rules →
                </button>
              </div>

              <div className="p-5 bg-neutral-50 rounded-2xl border border-tertiary/60 space-y-2">
                <h3 className="font-bold text-primary text-sm">iCal Multi-Calendar Sync</h3>
                <p className="text-neutral-500">
                  Export and import iCal feeds to sync availability with your external agency channels.
                </p>
                <button
                  type="button"
                  onClick={() => toast.info("iCal feeds manager")}
                  className="text-secondary font-semibold hover:underline"
                >
                  Manage sync feeds →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Revoke Session Dialog */}
      <ConfirmDialog
        isOpen={isLogoutSessionOpen}
        variant="destructive"
        title="Revoke Device Session"
        message="Are you sure you want to sign out of this device (iPhone 15 · Oran)? You will need to log in again on that device."
        confirmLabel="Log out device"
        cancelLabel="Keep signed in"
        onConfirm={() => {
          setIsLogoutSessionOpen(false);
          toast.success("Device session revoked successfully.");
        }}
        onCancel={() => setIsLogoutSessionOpen(false)}
      />

      {/* Deactivate Account Dialog */}
      <ConfirmDialog
        isOpen={isDeactivateAccountOpen}
        variant="destructive"
        title="Deactivate Account"
        message="Are you sure you want to deactivate your DARNA account? Your profile, reviews, and active listings will be temporarily hidden until you sign in again."
        confirmLabel="Deactivate account"
        cancelLabel="Keep account active"
        onConfirm={() => {
          setIsDeactivateAccountOpen(false);
          toast.info("Your account has been deactivated.");
        }}
        onCancel={() => setIsDeactivateAccountOpen(false)}
      />

      {/* Remove Card Dialog */}
      <ConfirmDialog
        isOpen={!!cardToRemove}
        variant="destructive"
        title="Remove Payment Card"
        message={
          cardToRemove
            ? `Are you sure you want to remove ${cardToRemove} from your DARNA account? You will need to re-enter your payment credentials for subsequent bookings.`
            : ""
        }
        confirmLabel="Remove card"
        cancelLabel="Keep card"
        onConfirm={() => {
          setCardToRemove(null);
          toast.success("Payment card removed from account.");
        }}
        onCancel={() => setCardToRemove(null)}
      />
    </div>
  );
}
