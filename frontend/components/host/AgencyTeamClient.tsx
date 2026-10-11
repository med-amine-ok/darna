"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Organization, Membership, User } from "@/types";
import {
  addOrganizationMember,
  updateOrganizationMemberRole,
  removeOrganizationMember,
} from "@/lib/data/organizations";
import {
  HiOutlineUserGroup,
  HiOutlineUserAdd,
  HiOutlineMail,
  HiOutlineShieldCheck,
  HiOutlineTrash,
  HiOutlineRefresh,
  HiOutlineBadgeCheck,
  HiOutlineClock,
  HiOutlineArrowLeft,
} from "react-icons/hi";
import { toast } from "react-toastify";
import ConfirmDialog from "@/components/models/ConfirmDialog";

interface AgencyTeamClientProps {
  organization: Organization;
  initialMembers: Membership[];
  currentUser?: User | null;
}

export default function AgencyTeamClient({
  organization,
  initialMembers,
  currentUser,
}: AgencyTeamClientProps) {
  const [members, setMembers] = useState<Membership[]>(initialMembers);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "manager">("manager");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Membership | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Stats
  const activeCount = members.filter((m) => m.status === "active").length;
  const pendingCount = members.filter((m) => m.status === "invited").length;

  // Invite handler
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.error("Please provide a valid corporate email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const newMember = await addOrganizationMember({
        organizationId: organization.id,
        name: inviteName || inviteEmail.split("@")[0],
        email: inviteEmail.trim(),
        role: inviteRole,
        invitedBy: currentUser?.id || "usr_karim",
      });

      setMembers((prev) => [newMember, ...prev]);
      toast.success(`Invitation dispatched to ${inviteEmail}!`);
      setIsInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      setInviteRole("manager");
    } catch {
      toast.error("Failed to send invitation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Change role
  const handleChangeRole = async (memberId: string, role: "admin" | "manager") => {
    try {
      const updated = await updateOrganizationMemberRole(memberId, role);
      if (updated) {
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, role } : m))
        );
        toast.info(`Team member role updated to ${role}.`);
      }
    } catch {
      toast.error("Failed to update role.");
    }
  };

  // Remove member
  const handleRemove = (member: Membership) => {
    if (member.role === "owner") {
      toast.error("The organization owner cannot be removed.");
      return;
    }
    setMemberToRemove(member);
  };

  const executeRemoveMember = async () => {
    if (!memberToRemove) return;
    setIsRemoving(true);
    try {
      const success = await removeOrganizationMember(memberToRemove.id);
      if (success) {
        setMembers((prev) => prev.filter((m) => m.id !== memberToRemove.id));
        toast.success("Team member access revoked.");
      }
    } catch {
      toast.error("Failed to remove member.");
    } finally {
      setIsRemoving(false);
      setMemberToRemove(null);
    }
  };

  // Resend invite
  const handleResend = (email: string) => {
    toast.success(`Invite notification re-sent to ${email}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href="/host"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-primary transition"
        >
          <HiOutlineArrowLeft size={16} />
          <span>Back to Host Overview</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-tertiary/70 p-6 sm:p-8 shadow-2xs mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-neutral-100 border border-tertiary/60 shrink-0">
            <Image
              src={organization.logo || "/assets/logo-vertical.png"}
              alt={organization.name}
              fill
              className="object-contain p-2"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-serif text-2xl font-black text-primary">
                {organization.name}
              </h1>
              {organization.verificationStatus === "verified" ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <HiOutlineBadgeCheck size={14} />
                  Verified Algerian Tourism Agency
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  Verification Pending
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Registre de Commerce:{" "}
              <span className="font-mono font-semibold">{organization.businessRegistrationNumber}</span> •{" "}
              {organization.businessEmail}
            </p>
          </div>
        </div>

        {/* Invite CTA */}
        <button
          type="button"
          onClick={() => setIsInviteOpen(true)}
          className="px-5 py-2.5 bg-primary text-white rounded-2xl text-xs sm:text-sm font-bold hover:bg-primary/95 transition flex items-center gap-2 shadow-2xs self-start md:self-auto"
        >
          <HiOutlineUserAdd size={18} className="text-tertiary" />
          <span>Invite Team Member</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-tertiary/70 p-4 shadow-2xs">
          <span className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">
            Total Roster
          </span>
          <span className="text-2xl font-black text-primary">{members.length}</span>
        </div>
        <div className="bg-white rounded-2xl border border-tertiary/70 p-4 shadow-2xs">
          <span className="block text-xs font-bold text-emerald-600 uppercase tracking-wider">
            Active Members
          </span>
          <span className="text-2xl font-black text-emerald-700">{activeCount}</span>
        </div>
        <div className="bg-white rounded-2xl border border-tertiary/70 p-4 shadow-2xs">
          <span className="block text-xs font-bold text-amber-600 uppercase tracking-wider">
            Pending Invites
          </span>
          <span className="text-2xl font-black text-amber-700">{pendingCount}</span>
        </div>
        <div className="bg-white rounded-2xl border border-tertiary/70 p-4 shadow-2xs">
          <span className="block text-xs font-bold text-secondary uppercase tracking-wider">
            Permission Model
          </span>
          <span className="text-sm font-black text-secondary flex items-center gap-1 mt-1">
            3-Tier Architecture
          </span>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-3xl border border-tertiary/70 shadow-2xs overflow-hidden mb-8">
        <div className="p-5 border-b border-tertiary/60 bg-neutral-50/60 flex items-center justify-between">
          <h3 className="font-serif text-lg font-bold text-primary">
            Team Members & Access Levels
          </h3>
          <span className="text-xs text-neutral-500">
            {members.length} team members registered
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-neutral-50 border-b border-tertiary/60 text-neutral-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 text-start">Member</th>
                <th className="py-3 px-4 text-start">Role</th>
                <th className="py-3 px-4 text-start">Status</th>
                <th className="py-3 px-4 text-start">Joined / Invited</th>
                <th className="py-3 px-4 text-end">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tertiary/40">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-neutral-50/50 transition">
                  {/* Name & Avatar */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-9 h-9 rounded-full overflow-hidden bg-neutral-200 shrink-0">
                        <Image
                          src={member.avatar || "/assets/avatar.png"}
                          alt={member.name || "Member"}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <div className="font-bold text-primary flex items-center gap-1.5">
                          <span>{member.name || member.email.split("@")[0]}</span>
                          {member.role === "owner" && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary text-white">
                              Owner
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-400 font-mono">
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="py-3.5 px-4">
                    {member.role === "owner" ? (
                      <span className="font-bold text-primary capitalize">
                        Organization Owner
                      </span>
                    ) : (
                      <select
                        value={member.role}
                        onChange={(e) => handleChangeRole(member.id, e.target.value as any)}
                        className="px-2.5 py-1 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs font-semibold text-primary focus:outline-none focus:border-primary capitalize"
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager / Staff</option>
                      </select>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-4">
                    {member.status === "active" ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Active
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 w-fit">
                        <HiOutlineClock size={12} />
                        Pending Invite
                      </span>
                    )}
                  </td>

                  {/* Date */}
                  <td className="py-3.5 px-4 text-neutral-500">
                    {member.joinedAt
                      ? new Date(member.joinedAt).toLocaleDateString("fr-DZ", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "Invited on " +
                        new Date(member.createdAt).toLocaleDateString("fr-DZ", {
                          day: "numeric",
                          month: "short",
                        })}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-end">
                    <div className="flex items-center justify-end gap-2">
                      {member.status === "invited" && (
                        <button
                          type="button"
                          onClick={() => handleResend(member.email)}
                          className="px-2.5 py-1 border border-tertiary/80 hover:bg-neutral-100 text-neutral-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                          title="Resend invitation"
                        >
                          <HiOutlineRefresh size={13} />
                          <span>Resend</span>
                        </button>
                      )}

                      {member.role !== "owner" && (
                        <button
                          type="button"
                          onClick={() => handleRemove(member)}
                          className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition"
                          title="Revoke access"
                        >
                          <HiOutlineTrash size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permission Matrix Guide */}
      <div className="bg-white rounded-3xl border border-tertiary/70 p-6 shadow-2xs">
        <h4 className="font-serif font-bold text-primary text-base mb-3">
          3-Tier Permission Hierarchy Explained
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-neutral-50 p-4 rounded-2xl border border-tertiary/40">
            <span className="block font-bold text-primary text-sm mb-1">1. Owner</span>
            <p className="text-neutral-600 leading-relaxed">
              Full legal and financial control. Receives CCP / BNA bank payouts, can configure agency settings, and manage billing.
            </p>
          </div>
          <div className="bg-neutral-50 p-4 rounded-2xl border border-tertiary/40">
            <span className="block font-bold text-primary text-sm mb-1">2. Admin</span>
            <p className="text-neutral-600 leading-relaxed">
              Fleet management access. Can create and edit listings, adjust pricing, manage calendar, and invite team members.
            </p>
          </div>
          <div className="bg-neutral-50 p-4 rounded-2xl border border-tertiary/40">
            <span className="block font-bold text-primary text-sm mb-1">3. Manager / Staff</span>
            <p className="text-neutral-600 leading-relaxed">
              Operational access. Can view incoming guest reservations, send messages, coordinate check-in/out, and check calendar availability.
            </p>
          </div>
        </div>
      </div>

      {/* Invite Member Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-tertiary shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-tertiary/60 mb-4">
              <h3 className="font-serif text-lg font-black text-primary">
                Invite Team Member
              </h3>
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-bold text-neutral-600 block mb-1">
                  Corporate Email
                </label>
                <input
                  type="email"
                  placeholder="colleague@atlasescapes.dz"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-600 block mb-1">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Touati"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-600 block mb-1">
                  Assigned Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInviteRole("manager")}
                    className={`p-3 rounded-xl border text-start transition ${
                      inviteRole === "manager"
                        ? "bg-primary/5 border-primary text-primary"
                        : "border-tertiary/80 text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    <span className="block font-bold text-xs">Manager / Staff</span>
                    <span className="text-[10px] text-neutral-500">Bookings & guest messaging</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInviteRole("admin")}
                    className={`p-3 rounded-xl border text-start transition ${
                      inviteRole === "admin"
                        ? "bg-primary/5 border-primary text-primary"
                        : "border-tertiary/80 text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    <span className="block font-bold text-xs">Admin</span>
                    <span className="text-[10px] text-neutral-500">Fleet & team management</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition shadow-2xs disabled:opacity-50"
                >
                  {isSubmitting ? "Sending..." : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revoke Member Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!memberToRemove}
        variant="destructive"
        title="Revoke Team Access"
        message={
          memberToRemove
            ? `Are you sure you want to remove ${memberToRemove.name || memberToRemove.email} from ${organization.name}? They will immediately lose access to your agency dashboard, fleet calendar, and bookings.`
            : ""
        }
        confirmLabel="Remove member"
        cancelLabel="Keep member"
        isLoading={isRemoving}
        onConfirm={executeRemoveMember}
        onCancel={() => setMemberToRemove(null)}
      />
    </div>
  );
}
