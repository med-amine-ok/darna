"use client";

import React, { useState, useEffect, useCallback, useId } from "react";
import { useTranslations } from "next-intl";
import { Shield, UserPlus, CheckCircle } from "lucide-react";
import {
  listTeamMembers,
  updateMemberRole,
  toggleMemberActive,
  inviteMember,
} from "@/lib/actions/team";
import { unwrap } from "@/lib/actions/result";
import { useCan, useCurrentAdmin } from "@/components/auth/AdminSessionProvider";
import { AdminUser, AdminRole } from "@/lib/types";
import { ROLE_PERMISSIONS } from "@/lib/permissions";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils/format";

interface Props {
  locale: string;
}

const ROLE_KEYS: AdminRole[] = ["super_admin", "moderator", "finance", "support", "analyst"];

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

const FIELD_CLASS =
  "w-full p-2.5 rounded-xl border border-primary/[0.12] text-xs bg-white text-primary focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary/[0.08] shadow-2xs hover:border-primary/25";

export default function TeamClient({ locale }: Props) {
  const t = useTranslations("team");
  const tRoles = useTranslations("roles");
  const tCommon = useTranslations("common");
  const [members, setMembers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [selectedRoleForMatrix, setSelectedRoleForMatrix] = useState<AdminRole>("moderator");

  // Invite modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AdminRole>("support");

  const { success, error, warning } = useToast();
  const can = useCan();
  const canManageTeam = can("team.manage");
  const currentAdminId = useCurrentAdmin()?.id;
  const inviteNameId = useId();
  const inviteEmailId = useId();
  const inviteRoleId = useId();
  const inviteErrorId = useId();
  const [inviteError, setInviteError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const list = unwrap(await listTeamMembers());
      setMembers(list);
    } catch (err) {
      error(t("toasts.loadFailed"), errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [error, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRoleChange = async (userId: string, newRole: AdminRole) => {
    try {
      const updated = unwrap(await updateMemberRole(userId, newRole));
      success(t("toasts.roleUpdated"), t("toasts.roleUpdatedBody", { name: updated.name, role: tRoles(newRole) }));
      loadData();
    } catch (err) {
      error(t("toasts.roleUpdateFailed"), errorMessage(err));
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    try {
      const updated = unwrap(await toggleMemberActive(user.id));
      success(
        t("toasts.statusUpdated"),
        updated.isActive
          ? t("toasts.nowActive", { name: user.name })
          : t("toasts.nowDeactivated", { name: user.name })
      );
      loadData();
    } catch (err) {
      error(t("toasts.actionProhibited"), errorMessage(err));
    }
  };

  /** Creates a real (mock) INVITED account on the server: inactive, no password until accepted. */
  const handleInvite = async () => {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setInviteError(t("inviteMissingFields"));
      error(t("inviteMissingFields"));
      return;
    }
    setInviteError(null);
    try {
      const created = unwrap(
        await inviteMember({ name: inviteName.trim(), email: inviteEmail.trim(), role: inviteRole })
      );
      setMembers((prev) => [...prev, created]);
      success(t("inviteSent"), t("inviteSentHint", { email: created.email }));
      setInviteModalOpen(false);
      setInviteName("");
      setInviteEmail("");
    } catch (err) {
      error(t("inviteFailed"), errorMessage(err));
    }
  };

  const roles = ROLE_KEYS.map((key) => ({
    key,
    label: tRoles(key),
    desc: t(`roleDescriptions.${key}`),
  }));

  const closeInvite = () => {
    setInviteModalOpen(false);
    setInviteError(null);
  };

  return (
    <div className="space-y-6 text-start">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-heading text-primary-900">{t("title")}</h1>
          <p className="text-meta text-primary-600 mt-1">
            {t("subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPermissionModalOpen(true)}
            className="text-xs font-semibold"
          >
            <Shield className="w-3.5 h-3.5 me-1.5 text-secondary" aria-hidden="true" />
            {t("roleMatrix")}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setInviteModalOpen(true)}
            disabled={!canManageTeam}
            className="text-xs font-semibold" leftIcon={<UserPlus className="w-3.5 h-3.5" aria-hidden="true" />}>
            {t("inviteMember")}
          </Button>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-e1">
        <div className="relative overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-darnaBg-100 border-b border-primary/[0.08] text-primary-600 [&_th]:whitespace-nowrap text-xs font-semibold">
              <tr>
                <th scope="col" className="py-3 px-4 text-start">{t("name")}</th>
                <th scope="col" className="py-3 px-4 text-start">{t("email")}</th>
                <th scope="col" className="py-3 px-4 text-start">{t("role")}</th>
                <th scope="col" className="py-3 px-4 text-start">{t("lastLogin")}</th>
                <th scope="col" className="py-3 px-4 text-start">{tCommon("status")}</th>
                <th scope="col" className="py-3 px-4 text-end">{tCommon("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/[0.06]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-4 px-4">
                    <span className="sr-only">{tCommon("loading")}</span>
                    <div aria-hidden="true" className="space-y-3">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="skeleton h-4 rounded-md" style={{ width: `${90 - i * 12}%` }} />
                      ))}
                    </div>
                  </td>
                </tr>
              ) : (
                members.map((u) => (
                  <tr key={u.id} className="hover:bg-darnaBg-100 transition-colors">
                    <td className="py-3 px-4 font-semibold text-primary">
                      <div className="flex items-center gap-2">
                        <div
                          aria-hidden="true"
                          className="w-7 h-7 rounded-full bg-secondary/15 text-secondary-700 flex items-center justify-center font-semibold text-xs uppercase"
                        >
                          {u.name.slice(0, 2)}
                        </div>
                        <div>
                          <div>{u.name}</div>
                          <div className="text-[11px] text-neutral-500 font-mono font-normal">
                            {u.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-neutral-600">{u.email}</td>
                    <td className="py-3 px-4">
                      <select
                        aria-label={t("roleFor", { name: u.name })}
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as AdminRole)}
                        disabled={!canManageTeam || u.id === currentAdminId}
                        className="py-1 px-2.5 rounded-lg border border-primary/[0.12] text-xs font-semibold bg-white text-primary focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary/[0.08] disabled:opacity-60 shadow-2xs hover:border-primary/25"
                      >
                        {roles.map((r) => (
                          <option key={r.key} value={r.key}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-neutral-500">
                      {u.lastLoginAt ? formatDate(u.lastLoginAt, locale) : t("never")}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          u.isActive
                            ? "bg-secondary/15 text-secondary-700"
                            : "bg-neutral-100 text-neutral-600"
                        }`}
                      >
                        {u.status === "invited" ? t("statusInvited") : u.isActive ? t("statusActive") : t("statusDeactivated")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-end">
                      {canManageTeam && u.id !== currentAdminId && u.status !== "invited" && (
                      <button
                        type="button"
                        onClick={() => handleToggleActive(u)}
                        aria-label={u.isActive ? t("deactivateLabel", { name: u.name }) : t("activateLabel", { name: u.name })}
                        className="text-xs font-semibold text-neutral-600 hover:text-primary underline cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
                      >
                        {u.isActive ? t("deactivate") : t("activate")}
                      </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PERMISSION MATRIX VIEWER MODAL */}
      <Dialog
        isOpen={permissionModalOpen}
        onClose={() => setPermissionModalOpen(false)}
        title={t("matrix.title")}
        size="lg"
      >
        <div className="space-y-4 text-start">
          <div
            className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-primary/[0.08]"
            role="group"
            aria-label={t("matrix.pickRole")}
          >
            {roles.map((r) => (
              <button
                key={r.key}
                type="button"
                aria-pressed={selectedRoleForMatrix === r.key}
                onClick={() => setSelectedRoleForMatrix(r.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 ${
                  selectedRoleForMatrix === r.key
                    ? "bg-primary text-white"
                    : "text-neutral-600 hover:text-primary hover:bg-neutral-100"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <p className="text-xs text-neutral-600">
            {roles.find((r) => r.key === selectedRoleForMatrix)?.desc}
          </p>

          <div className="  rounded-xl overflow-hidden bg-darnaBg-100 p-3 max-h-72 overflow-y-auto">
            <h3 className="text-xs font-semibold text-primary mb-2">{t("matrix.granted")}</h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ROLE_PERMISSIONS[selectedRoleForMatrix].map((perm) => (
                <li
                  key={perm}
                  dir="ltr"
                  className="p-2 rounded-lg bg-darnaBg-100 text-[11px] font-mono text-secondary-700 flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{perm}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPermissionModalOpen(false)}
              className="text-xs"
            >
              {tCommon("close")}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* INVITE STAFF MODAL */}
      <Dialog
        isOpen={inviteModalOpen}
        onClose={closeInvite}
        title={t("inviteMember")}
        size="md"
      >
        <form
          className="space-y-4 text-start"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            handleInvite();
          }}
        >
          {inviteError && (
            <p
              id={inviteErrorId}
              role="alert"
              className="p-2.5 rounded-xl bg-accent/10 ring-1 ring-inset ring-accent/30 text-xs font-medium text-accent-700"
            >
              {inviteError}
            </p>
          )}
          <div>
            <label htmlFor={inviteNameId} className="block text-xs font-semibold text-primary mb-1">
              {t("name")}
            </label>
            <input
              id={inviteNameId}
              type="text"
              required
              autoComplete="off"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder={t("invitePlaceholderName")}
              aria-invalid={inviteError && !inviteName.trim() ? true : undefined}
              aria-describedby={inviteError && !inviteName.trim() ? inviteErrorId : undefined}
              className={FIELD_CLASS}
            />
          </div>

          <div>
            <label htmlFor={inviteEmailId} className="block text-xs font-semibold text-primary mb-1">
              {t("email")}
            </label>
            <input
              id={inviteEmailId}
              type="email"
              required
              autoComplete="off"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="yacine@bladus.dz"
              aria-invalid={inviteError && !inviteEmail.trim() ? true : undefined}
              aria-describedby={inviteError && !inviteEmail.trim() ? inviteErrorId : undefined}
              className={FIELD_CLASS}
            />
          </div>

          <div>
            <label htmlFor={inviteRoleId} className="block text-xs font-semibold text-primary mb-1">
              {t("role")}
            </label>
            <select
              id={inviteRoleId}
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as AdminRole)}
              className={FIELD_CLASS}
            >
              {roles.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeInvite}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="font-semibold text-xs"
            >
              {t("inviteMember")}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
