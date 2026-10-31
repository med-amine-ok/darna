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
  BrandUsersIcon,
  BrandCheckCircleIcon,
  BrandShieldIcon,
  BrandMoreIcon,
  BrandMailIcon,
} from "@/components/icons";
import { toast } from "react-toastify";
import ConfirmDialog from "@/components/models/ConfirmDialog";
import {
  Avatar,
  AvatarStack,
  Badge,
  Button,
  Card,
  Dialog,
  DialogFooter,
  DropdownMenu,
  IconButton,
  Input,
  RadioGroup,
  Select,
  StatCard,
  cn,
  focusRing,
} from "@/components/ui";
import type { DropdownItem } from "@/components/ui";
import { formatDate, formatNumber } from "@/lib/i18n/date-locale";
import { useActionError } from "@/hook/useActionError";

interface AgencyTeamClientProps {
  organization: Organization;
  initialMembers: Membership[];
  currentUser?: User | null;
  /** Viewer's role in the organization; controls which actions are offered. */
  currentRole?: MembershipRole | null;
}

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
    inviteName: `${baseId}-invite-name`,
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

  const activeMembers = members.filter((m) => m.status === "active");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href="/host"
        className={cn(
          "mb-6 inline-flex min-h-[44px] items-center gap-1.5 rounded-full text-meta font-semibold text-primary-600 transition-colors duration-fast ease-standard hover:text-primary-900",
          focusRing
        )}
      >
        <BrandArrowLeftIcon size={16} className="rtl:rotate-180" aria-hidden="true" />
        <span>{t("backToHost")}</span>
      </Link>

      {/* Header */}
      <header className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="enter-up flex min-w-0 items-center gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-white shadow-e1">
            <Image
              src={organization.logo || "/assets/logo-vertical.png"}
              alt={t("logoAlt", { name: organization.name })}
              fill
              sizes="64px"
              className="object-contain p-2"
            />
          </div>
          <div className="min-w-0">
            <p className="text-eyebrow uppercase text-secondary-700">{t("eyebrow")}</p>
            <h1 className="mt-1 font-serif text-display-md text-primary-900 [text-wrap:balance]">{organization.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-meta text-primary-600">
              {organization.verificationStatus === "verified" ? (
                <Badge tone="success" icon={<BrandBadgeCheckIcon size={13} aria-hidden="true" />}>
                  {t("verifiedAgency")}
                </Badge>
              ) : (
                <Badge tone="warning" dot>
                  {t("verificationPending")}
                </Badge>
              )}
              <span>
                {t("rcLabel")}{" "}
                <bdi dir="ltr" className="font-semibold tabular-nums text-primary-800">
                  {organization.businessRegistrationNumber}
                </bdi>
              </span>
              <bdi dir="ltr" className="truncate">
                {organization.businessEmail}
              </bdi>
            </div>
          </div>
        </div>

        <div className="enter-up flex flex-col items-start gap-2 md:items-end" style={{ animationDelay: "80ms" }}>
          <div className="flex items-center gap-3">
            {activeMembers.length > 0 && (
              <AvatarStack
                people={activeMembers.map((m) => ({ name: displayName(m), src: m.avatar }))}
                max={4}
                size="sm"
              />
            )}
            <Button
              variant="primary"
              size="md"
              disabled={!canInvite}
              aria-haspopup="dialog"
              aria-describedby={canInvite ? undefined : ids.readOnlyInvite}
              onClick={() => setIsInviteOpen(true)}
              leadingIcon={<BrandUserAddIcon size={18} aria-hidden="true" />}
            >
              {t("inviteTeammate")}
            </Button>
          </div>
          {!canInvite && (
            <span id={ids.readOnlyInvite} className="text-meta text-primary-600">
              {t("inviteNotAllowed")}
            </span>
          )}
        </div>
      </header>

      {/* KPIs */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("kpi.totalRoster")} value={members.length} icon={<BrandUsersIcon size={18} aria-hidden="true" />} />
        <StatCard label={t("activeMembers")} value={activeCount} icon={<BrandCheckCircleIcon size={18} aria-hidden="true" />} />
        <StatCard label={t("pendingInvites")} value={pendingCount} icon={<BrandClockIcon size={18} aria-hidden="true" />} />
        <Card padding="md" className="flex flex-col justify-between gap-2">
          <p className="flex items-center gap-2 text-meta text-primary-600">
            <BrandShieldIcon size={18} aria-hidden="true" className="text-secondary-700" />
            {t("kpi.permissionModel")}
          </p>
          <p className="font-serif text-heading text-primary-900">{t("kpi.threeTier")}</p>
        </Card>
      </div>

      {/* Members */}
      <Card as="section" padding="none" radius="3xl" className="mb-8 overflow-hidden" aria-labelledby={`${baseId}-members-title`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/[0.08] px-5 py-4 sm:px-6">
          <h2 id={`${baseId}-members-title`} className="font-serif text-heading text-primary-900">
            {t("table.title")}
          </h2>
          <span className="text-meta text-primary-600">{t("table.count", { count: members.length })}</span>
        </div>

        <div
          aria-hidden="true"
          className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 bg-darnaBg-300/50 px-6 py-2.5 text-meta font-semibold text-primary-600 md:grid"
        >
          <span>{t("table.colMember")}</span>
          <span>{t("table.colRole")}</span>
          <span>{t("table.colStatus")}</span>
          <span>{t("table.colDate")}</span>
          <span className="w-24 text-end">{t("table.colActions")}</span>
        </div>

        <ul className="divide-y divide-primary/[0.06]">
          {members.map((member) => {
            const name = displayName(member);
            const canRemove = orgPermissions.canRemoveMember(currentRole, member.role);
            const canPromote = canTransfer && member.role !== "owner" && member.status === "active" && !!member.userId;
            const menuItems: DropdownItem[] = [
              ...(canPromote
                ? [
                    {
                      label: t("actions.makeOwner"),
                      icon: <BrandBadgeCheckIcon size={16} aria-hidden="true" />,
                      onSelect: () => setMemberToPromote(member),
                    } as DropdownItem,
                  ]
                : []),
              ...(canRemove
                ? [
                    {
                      label: t("actions.revoke"),
                      icon: <BrandTrashIcon size={16} aria-hidden="true" />,
                      destructive: true,
                      onSelect: () => handleRemove(member),
                    } as DropdownItem,
                  ]
                : []),
            ];
            return (
              <li
                key={member.id}
                className="grid grid-cols-1 gap-3 px-5 py-4 transition-colors duration-fast ease-standard hover:bg-darnaBg/60 sm:px-6 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center md:gap-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={name} src={member.avatar} size="md" decorative />
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 text-body font-semibold text-primary-900">
                      <span className="truncate">{name}</span>
                      {member.role === "owner" && <Badge tone="ink">{t("roleOwner")}</Badge>}
                    </p>
                    <p className="truncate text-meta text-primary-600">
                      <bdi dir="ltr">{member.email}</bdi>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:block">
                  <span className="text-meta text-primary-600 md:hidden">{t("table.colRole")}</span>
                  {member.role === "owner" ? (
                    <Badge tone="ink" size="md">
                      {t("organizationOwner")}
                    </Badge>
                  ) : canChangeRoles ? (
                    <Select
                      label={t("table.roleFor", { name })}
                      hideLabel
                      value={member.role}
                      onChange={(e) => handleChangeRole(member.id, e.target.value as "admin" | "manager")}
                      containerClassName="min-w-[10rem] flex-1 md:flex-none"
                    >
                      <option value="admin">{t("roleAdmin")}</option>
                      <option value="manager">{t("roleManagerStaff")}</option>
                    </Select>
                  ) : (
                    <Badge tone={member.role === "admin" ? "olive" : "sand"} size="md" title={t("table.rolesOwnerOnly")}>
                      {member.role === "admin" ? t("roleAdmin") : t("roleManagerStaff")}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 md:block">
                  <span className="text-meta text-primary-600 md:hidden">{t("table.colStatus")}</span>
                  {member.status === "active" ? (
                    <Badge tone="success" dot>
                      {t("status.active")}
                    </Badge>
                  ) : (
                    <Badge tone="warning" icon={<BrandClockIcon size={12} aria-hidden="true" />}>
                      {t("status.pending")}
                    </Badge>
                  )}
                </div>

                <p className="text-meta tabular-nums text-primary-600">
                  {member.joinedAt
                    ? formatDate(member.joinedAt, locale)
                    : t("invitedOn", {
                        date: formatDate(member.createdAt, locale, { day: "numeric", month: "short" }),
                      })}
                </p>

                <div className="flex items-center gap-1 md:w-24 md:justify-end">
                  {member.status === "invited" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResend(member.email)}
                      aria-label={t("actions.resendFor", { name })}
                      leadingIcon={<BrandRefreshIcon size={14} aria-hidden="true" />}
                    >
                      {t("resend")}
                    </Button>
                  )}
                  {menuItems.length > 0 && (
                    <DropdownMenu
                      ariaLabel={t("actions.menuFor", { name })}
                      trigger={
                        <IconButton
                          label={t("actions.menuFor", { name })}
                          icon={<BrandMoreIcon size={18} aria-hidden="true" />}
                          variant="ghost"
                        />
                      }
                      items={menuItems}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Roles guide */}
      <section aria-labelledby={`${baseId}-matrix-title`}>
        <h2 id={`${baseId}-matrix-title`} className="mb-4 font-serif text-heading text-primary-900">
          {t("matrix.title")}
        </h2>
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(["owner", "admin", "manager"] as const).map((role, i) => (
            <li key={role} className="rounded-2xl bg-white p-5 shadow-e1">
              <div className="mb-2 flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary-100 text-meta font-semibold tabular-nums text-secondary-800"
                >
                  {formatNumber(i + 1, locale)}
                </span>
                <h3 className="text-title text-primary-900">{t(`matrix.${role}.title`)}</h3>
              </div>
              <p className="text-meta leading-relaxed text-primary-700">{t(`matrix.${role}.description`)}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Invite dialog */}
      <Dialog
        isOpen={isInviteOpen}
        onClose={closeInvite}
        busy={isSubmitting}
        title={t("invite.title")}
        description={t("invite.description")}
        showClose
        size="sm"
      >
        <form onSubmit={handleInvite} noValidate className="mt-6 space-y-4">
          <Input
            id={ids.inviteEmail}
            type="email"
            dir="ltr"
            autoComplete="off"
            label={t("invite.emailLabel")}
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            aria-required="true"
            error={inviteEmailError ?? undefined}
            helper={t("invite.emailPlaceholder")}
            prefix={<BrandMailIcon size={16} aria-hidden="true" />}
          />
          <Input
            id={ids.inviteName}
            type="text"
            autoComplete="off"
            label={t("invite.nameLabel")}
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
          />
          <RadioGroup
            legend={t("invite.roleLabel")}
            name={`${baseId}-invite-role`}
            value={inviteRole}
            onChange={(v) => setInviteRole(v as "admin" | "manager")}
            appearance="card"
            options={(["manager", "admin"] as const).map((role) => ({
              value: role,
              label: role === "manager" ? t("roleManagerStaff") : t("roleAdmin"),
              description: t(`invite.${role}Hint`),
            }))}
          />
          <DialogFooter>
            <Button type="button" variant="tertiary" size="md" onClick={closeInvite} disabled={isSubmitting}>
              {t("cancel")}
            </Button>
            <Button type="submit" variant="primary" size="md" loading={isSubmitting}>
              {isSubmitting ? t("invite.sending") : t("invite.send")}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Revoke member */}
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

      {/* Transfer ownership */}
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
