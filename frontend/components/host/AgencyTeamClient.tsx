"use client";

import React, { useId, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/navigation";
import { Organization, Membership, MembershipRole, User } from "@/types";
import { orgPermissions } from "@/lib/host-types";
import {
  inviteMemberAction,
  changeMemberRoleAction,
  removeMemberAction,
  transferOwnershipAction,
} from "@/app/actions/organizations";
import {
  BrandUserAddIcon,
  BrandTrashIcon,
  BrandRefreshIcon,
  BrandBadgeCheckIcon,
  BrandClockIcon,
  BrandArrowLeftIcon,
  BrandCrossIcon,
} from "@/components/icons";
import { toast } from "react-toastify";
import ConfirmDialog from "@/components/models/ConfirmDialog";
import Dialog from "@/components/ui/Dialog";
import { formatDate, formatNumber } from "@/lib/i18n/date-locale";
import { useActionError } from "@/hook/useActionError";

interface AgencyTeamClientProps {
  organization: Organization;
  initialMembers: Membership[];
  currentUser?: User | null;
  /** Viewer's role in the organization; controls which actions are offered. */
  currentRole?: MembershipRole | null;
}

const FIELD_CLASS =
  "w-full px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2";

export default function AgencyTeamClient({
  organization,
  initialMembers,
  currentRole = null,
}: AgencyTeamClientProps) {
  const t = useTranslations("agencyTeam");
  const errorText = useActionError();
  const locale = useLocale();
  const baseId = useId();
  const canInvite = orgPermissions.canInviteMembers(currentRole);
  const canChangeRoles = orgPermissions.canChangeRoles(currentRole);
  const canTransfer = orgPermissions.canTransferOwnership(currentRole);
  const [members, setMembers] = useState<Membership[]>(initialMembers);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "manager">("manager");
  const [inviteEmailError, setInviteEmailError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<Membership | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [memberToPromote, setMemberToPromote] = useState<Membership | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  // Stats
  const activeCount = members.filter((m) => m.status === "active").length;
  const pendingCount = members.filter((m) => m.status === "invited").length;

  const ids = {
    inviteEmail: `${baseId}-invite-email`,
    inviteEmailError: `${baseId}-invite-email-error`,
    inviteName: `${baseId}-invite-name`,
    inviteRoleLabel: `${baseId}-invite-role`,
    readOnlyInvite: `${baseId}-invite-readonly`,
  };

  const displayName = (m: Membership) => m.name || m.email.split("@")[0];
  const roleLabel = (role: MembershipRole) =>
    role === "owner" ? t("roleOwner") : role === "admin" ? t("roleAdmin") : t("roleManager");

  const closeInvite = () => {
    setIsInviteOpen(false);
    setInviteEmailError(null);
  };

  // Invite handler
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setInviteEmailError(t("invite.emailRequired"));
      return;
    }
    setInviteEmailError(null);

    setIsSubmitting(true);
    try {
      const result = await inviteMemberAction({
        name: inviteName || inviteEmail.split("@")[0],
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }

      setMembers((prev) => [result.data, ...prev]);
      toast.success(t("toasts.inviteSent", { email: inviteEmail.trim() }));
      closeInvite();
      setInviteEmail("");
      setInviteName("");
      setInviteRole("manager");
    } catch {
      toast.error(t("toasts.inviteFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Change role
  const handleChangeRole = async (memberId: string, role: "admin" | "manager") => {
    try {
      const result = await changeMemberRoleAction(memberId, role);
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      setMembers((prev) => prev.map((m) => (m.id === memberId ? result.data : m)));
      toast.info(t("toasts.roleUpdated", { role: roleLabel(role) }));
    } catch {
      toast.error(t("toasts.roleFailed"));
    }
  };

  // Remove member
  const handleRemove = (member: Membership) => {
    if (member.role === "owner") {
      toast.error(t("toasts.ownerCannotBeRemoved"));
      return;
    }
    setMemberToRemove(member);
  };

  const executeRemoveMember = async () => {
    if (!memberToRemove) return;
    setIsRemoving(true);
    try {
      const result = await removeMemberAction(memberToRemove.id);
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      setMembers((prev) => prev.filter((m) => m.id !== memberToRemove.id));
      toast.success(t("toasts.memberRemoved"));
    } catch {
      toast.error(t("toasts.removeFailed"));
    } finally {
      setIsRemoving(false);
      setMemberToRemove(null);
    }
  };

  // Resend invite (no email delivery in the mock backend yet)
  const handleResend = (email: string) => {
    toast.info(t("toasts.resendComingSoon", { email }));
  };

  const executeTransferOwnership = async () => {
    if (!memberToPromote) return;
    setIsTransferring(true);
    try {
      const result = await transferOwnershipAction(memberToPromote.id);
      if (!result.ok) {
        toast.error(errorText(result));
        return;
      }
      setMembers(result.data);
      toast.success(t("toasts.ownershipTransferred"));
      window.location.reload();
    } finally {
      setIsTransferring(false);
      setMemberToPromote(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href="/host"
          className={`inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-primary transition rounded ${FOCUS_RING}`}
        >
          <BrandArrowLeftIcon size={16} className="rtl:rotate-180" aria-hidden="true" />
          <span>{t("backToHost")}</span>
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-tertiary/70 p-6 sm:p-8 shadow-2xs mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-neutral-100 border border-tertiary/60 shrink-0">
            <Image
              src={organization.logo || "/assets/logo-vertical.png"}
              alt={t("logoAlt", { name: organization.name })}
              fill
              sizes="64px"
              className="object-contain p-2"
            />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-serif text-2xl font-black text-primary">{organization.name}</h1>
              {organization.verificationStatus === "verified" ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <BrandBadgeCheckIcon size={14} aria-hidden="true" />
                  {t("verifiedAgency")}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  {t("verificationPending")}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-600 mt-1">
              {t("rcLabel")}{" "}
              <bdi dir="ltr" className="font-mono font-semibold">
                {organization.businessRegistrationNumber}
              </bdi>{" "}
              • <bdi dir="ltr">{organization.businessEmail}</bdi>
            </p>
          </div>
        </div>

        {/* Invite CTA */}
        <div className="flex flex-col items-start md:items-end gap-1 self-start md:self-auto">
          <button
            type="button"
            disabled={!canInvite}
            aria-haspopup="dialog"
            aria-describedby={canInvite ? undefined : ids.readOnlyInvite}
            onClick={() => setIsInviteOpen(true)}
            className={`px-5 py-2.5 bg-primary text-white rounded-2xl text-xs sm:text-sm font-bold hover:bg-primary/95 transition flex items-center gap-2 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed ${FOCUS_RING}`}
          >
            <BrandUserAddIcon size={18} className="text-tertiary" aria-hidden="true" />
            <span>{t("inviteTeammate")}</span>
          </button>
          {!canInvite && (
            <span id={ids.readOnlyInvite} className="text-[11px] text-neutral-600">
              {t("inviteNotAllowed")}
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-tertiary/70 p-4 shadow-2xs">
          <span className="block text-xs font-bold text-neutral-600 uppercase tracking-wider">
            {t("kpi.totalRoster")}
          </span>
          <span className="text-2xl font-black text-primary">{formatNumber(members.length, locale)}</span>
        </div>
        <div className="bg-white rounded-2xl border border-tertiary/70 p-4 shadow-2xs">
          <span className="block text-xs font-bold text-emerald-700 uppercase tracking-wider">
            {t("activeMembers")}
          </span>
          <span className="text-2xl font-black text-emerald-700">{formatNumber(activeCount, locale)}</span>
        </div>
        <div className="bg-white rounded-2xl border border-tertiary/70 p-4 shadow-2xs">
          <span className="block text-xs font-bold text-amber-700 uppercase tracking-wider">
            {t("pendingInvites")}
          </span>
          <span className="text-2xl font-black text-amber-700">{formatNumber(pendingCount, locale)}</span>
        </div>
        <div className="bg-white rounded-2xl border border-tertiary/70 p-4 shadow-2xs">
          <span className="block text-xs font-bold text-secondary uppercase tracking-wider">
            {t("kpi.permissionModel")}
          </span>
          <span className="text-sm font-black text-secondary flex items-center gap-1 mt-1">
            {t("kpi.threeTier")}
          </span>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-3xl border border-tertiary/70 shadow-2xs overflow-hidden mb-8">
        <div className="p-5 border-b border-tertiary/60 bg-neutral-50/60 flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-serif text-lg font-bold text-primary">{t("table.title")}</h2>
          <span className="text-xs text-neutral-600">{t("table.count", { count: members.length })}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <caption className="sr-only">{t("table.title")}</caption>
            <thead className="bg-neutral-50 border-b border-tertiary/60 text-neutral-600 font-bold uppercase tracking-wider">
              <tr>
                <th scope="col" className="py-3 px-4 text-start">{t("table.colMember")}</th>
                <th scope="col" className="py-3 px-4 text-start">{t("table.colRole")}</th>
                <th scope="col" className="py-3 px-4 text-start">{t("table.colStatus")}</th>
                <th scope="col" className="py-3 px-4 text-start">{t("table.colDate")}</th>
                <th scope="col" className="py-3 px-4 text-end">{t("table.colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tertiary/40">
              {members.map((member) => {
                const name = displayName(member);
                return (
                  <tr key={member.id} className="hover:bg-neutral-50/50 transition">
                    {/* Name & Avatar */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-9 h-9 rounded-full overflow-hidden bg-neutral-200 shrink-0">
                          <Image
                            src={member.avatar || "/assets/avatar.png"}
                            alt=""
                            fill
                            sizes="36px"
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-bold text-primary flex items-center gap-1.5">
                            <span>{name}</span>
                            {member.role === "owner" && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary text-white">
                                {t("roleOwner")}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-neutral-600 font-mono">
                            <bdi dir="ltr">{member.email}</bdi>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      {member.role === "owner" ? (
                        <span className="font-bold text-primary">{t("organizationOwner")}</span>
                      ) : (
                        <select
                          value={member.role}
                          disabled={!canChangeRoles}
                          aria-label={t("table.roleFor", { name })}
                          title={canChangeRoles ? undefined : t("table.rolesOwnerOnly")}
                          onChange={(e) => handleChangeRole(member.id, e.target.value as "admin" | "manager")}
                          className="px-2.5 py-1 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs font-semibold text-primary focus:outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
                        >
                          <option value="admin">{t("roleAdmin")}</option>
                          <option value="manager">{t("roleManagerStaff")}</option>
                        </select>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {member.status === "active" ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {t("status.active")}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 w-fit">
                          <BrandClockIcon size={12} aria-hidden="true" />
                          {t("status.pending")}
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-neutral-600">
                      {member.joinedAt
                        ? formatDate(member.joinedAt, locale)
                        : t("invitedOn", {
                            date: formatDate(member.createdAt, locale, { day: "numeric", month: "short" }),
                          })}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-end">
                      <div className="flex items-center justify-end gap-2">
                        {member.status === "invited" && (
                          <button
                            type="button"
                            onClick={() => handleResend(member.email)}
                            aria-label={t("actions.resendFor", { name })}
                            className={`px-2.5 py-1 border border-tertiary/80 hover:bg-neutral-100 text-neutral-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${FOCUS_RING}`}
                          >
                            <BrandRefreshIcon size={13} aria-hidden="true" />
                            <span>{t("resend")}</span>
                          </button>
                        )}

                        {canTransfer && member.role !== "owner" && member.status === "active" && member.userId && (
                          <button
                            type="button"
                            aria-haspopup="dialog"
                            onClick={() => setMemberToPromote(member)}
                            aria-label={t("actions.makeOwnerFor", { name })}
                            className={`px-2.5 py-1 border border-tertiary/80 hover:bg-neutral-100 text-neutral-700 rounded-lg text-xs font-semibold transition ${FOCUS_RING}`}
                          >
                            {t("actions.makeOwner")}
                          </button>
                        )}

                        {orgPermissions.canRemoveMember(currentRole, member.role) && (
                          <button
                            type="button"
                            aria-haspopup="dialog"
                            onClick={() => handleRemove(member)}
                            aria-label={t("actions.revokeFor", { name })}
                            title={t("actions.revoke")}
                            className={`p-1.5 hover:bg-rose-50 text-rose-700 rounded-lg transition ${FOCUS_RING}`}
                          >
                            <BrandTrashIcon size={16} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permission Matrix Guide */}
      <section aria-labelledby={`${baseId}-matrix-title`} className="bg-white rounded-3xl border border-tertiary/70 p-6 shadow-2xs">
        <h2 id={`${baseId}-matrix-title`} className="font-serif font-bold text-primary text-base mb-3">
          {t("matrix.title")}
        </h2>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {(["owner", "admin", "manager"] as const).map((role) => (
            <li key={role} className="bg-neutral-50 p-4 rounded-2xl border border-tertiary/40">
              <h3 className="font-bold text-primary text-sm mb-1">{t(`matrix.${role}.title`)}</h3>
              <p className="text-neutral-600 leading-relaxed">{t(`matrix.${role}.description`)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Invite Member Modal */}
      <Dialog
        isOpen={isInviteOpen}
        onClose={closeInvite}
        busy={isSubmitting}
        title={t("invite.title")}
        titleClassName="font-serif text-lg font-black text-primary pe-10 pb-3 border-b border-tertiary/60 mb-4"
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl border border-tertiary shadow-2xl p-6 sm:p-8 max-h-[92dvh] overflow-y-auto animate-in fade-in zoom-in-95"
      >
        <button
          type="button"
          onClick={closeInvite}
          disabled={isSubmitting}
          aria-label={t("invite.close")}
          className={`absolute top-6 end-6 sm:top-8 sm:end-8 w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition ${FOCUS_RING}`}
        >
          <BrandCrossIcon size={14} aria-hidden="true" />
        </button>

        <form onSubmit={handleInvite} noValidate className="space-y-4">
          <div>
            <label htmlFor={ids.inviteEmail} className="text-xs font-bold text-neutral-600 block mb-1">
              {t("invite.emailLabel")}
            </label>
            <input
              id={ids.inviteEmail}
              type="email"
              dir="ltr"
              autoComplete="off"
              placeholder={t("invite.emailPlaceholder")}
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              aria-required="true"
              aria-invalid={inviteEmailError ? true : undefined}
              aria-describedby={inviteEmailError ? ids.inviteEmailError : undefined}
              className={`${FIELD_CLASS} text-start`}
            />
            {inviteEmailError && (
              <p id={ids.inviteEmailError} role="alert" className="mt-1 text-xs font-semibold text-status-error">
                {inviteEmailError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={ids.inviteName} className="text-xs font-bold text-neutral-600 block mb-1">
              {t("invite.nameLabel")}
            </label>
            <input
              id={ids.inviteName}
              type="text"
              autoComplete="off"
              placeholder={t("invite.namePlaceholder")}
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className={FIELD_CLASS}
            />
          </div>

          <div role="group" aria-labelledby={ids.inviteRoleLabel}>
            <span id={ids.inviteRoleLabel} className="text-xs font-bold text-neutral-600 block mb-1">
              {t("invite.roleLabel")}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {(["manager", "admin"] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  aria-pressed={inviteRole === role}
                  onClick={() => setInviteRole(role)}
                  className={`p-3 rounded-xl border text-start transition ${FOCUS_RING} ${
                    inviteRole === role
                      ? "bg-primary/5 border-primary text-primary"
                      : "border-tertiary/80 text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  <span className="block font-bold text-xs">
                    {role === "manager" ? t("roleManagerStaff") : t("roleAdmin")}
                  </span>
                  <span className="text-[10px] text-neutral-600">{t(`invite.${role}Hint`)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={closeInvite}
              disabled={isSubmitting}
              className={`px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition ${FOCUS_RING}`}
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting || undefined}
              className={`px-5 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition shadow-2xs disabled:opacity-50 ${FOCUS_RING}`}
            >
              {isSubmitting ? t("invite.sending") : t("invite.send")}
            </button>
          </div>
        </form>
      </Dialog>

      {/* Revoke Member Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!memberToRemove}
        variant="destructive"
        title={t("removeDialog.title")}
        message={
          memberToRemove
            ? t("removeDialog.message", { name: displayName(memberToRemove), organization: organization.name })
            : ""
        }
        confirmLabel={t("remove")}
        cancelLabel={t("removeDialog.cancel")}
        isLoading={isRemoving}
        onConfirm={executeRemoveMember}
        onCancel={() => setMemberToRemove(null)}
      />

      {/* Transfer Ownership Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!memberToPromote}
        variant="neutral"
        title={t("transferDialog.title")}
        message={
          memberToPromote
            ? t("transferDialog.message", { name: displayName(memberToPromote), organization: organization.name })
            : ""
        }
        confirmLabel={t("transferDialog.confirm")}
        cancelLabel={t("transferDialog.cancel")}
        autoFocusButton="cancel"
        isLoading={isTransferring}
        onConfirm={executeTransferOwnership}
        onCancel={() => setMemberToPromote(null)}
      />
    </div>
  );
}
