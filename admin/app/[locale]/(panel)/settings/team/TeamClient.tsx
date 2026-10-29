"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
  Users,
  Shield,
  UserPlus,
  CheckCircle,
  XCircle,
  Lock,
  Mail,
  ShieldAlert,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  listTeamMembers,
  updateMemberRole,
  toggleMemberActive,
} from "@/lib/data/team";
import { AdminUser, AdminRole } from "@/lib/types";
import { ROLE_PERMISSIONS } from "@/lib/permissions";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils/format";

interface Props {
  locale: string;
}

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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listTeamMembers();
      setMembers(list);
    } catch (err: any) {
      error("Failed to load staff team", err.message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRoleChange = async (userId: string, newRole: AdminRole) => {
    const actor = { id: "adm_01", name: "Amine Admin", role: "super_admin" as const };
    try {
      const updated = await updateMemberRole(userId, newRole, actor);
      success("Role Updated", `${updated.name} is now ${newRole}.`);
      loadData();
    } catch (err: any) {
      error("Cannot update role", err.message);
    }
  };

  const handleToggleActive = async (user: AdminUser) => {
    const actor = { id: "adm_01", name: "Amine Admin", role: "super_admin" as const };
    try {
      const updated = await toggleMemberActive(user.id, actor);
      success("Status Updated", `${user.name} is now ${updated.isActive ? "active" : "deactivated"}.`);
      loadData();
    } catch (err: any) {
      error("Action prohibited", err.message);
    }
  };

  const handleInvite = () => {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      error("Missing fields", "Please fill name and email.");
      return;
    }

    const newStaff: AdminUser = {
      id: `adm_${Date.now()}`,
      email: inviteEmail.trim().toLowerCase(),
      name: inviteName.trim(),
      role: inviteRole,
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      permissions: ROLE_PERMISSIONS[inviteRole],
    };

    setMembers([...members, newStaff]);
    success("Invitation Sent", `Staff invitation link generated for ${inviteEmail}.`);
    setInviteModalOpen(false);
    setInviteName("");
    setInviteEmail("");
  };

  const roles: { key: AdminRole; label: string; desc: string }[] = [
    { key: "super_admin", label: tRoles("super_admin"), desc: "Full authority over platform settings, team, and financial ledger." },
    { key: "moderator", label: tRoles("moderator"), desc: "Verifies hosts, listings, legal certificates, and reviews." },
    { key: "finance", label: tRoles("finance"), desc: "Disburses CCP payouts, recharges wallets, and updates commissions." },
    { key: "support", label: tRoles("support"), desc: "Resolves guest disputes, cancels bookings, and manages inquiries." },
    { key: "analyst", label: tRoles("analyst"), desc: "Read-only access to business intelligence, reports, and charts." },
  ];

  return (
    <div className="space-y-6 text-start">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary tracking-tight">{t("title")}</h1>
          <p className="text-xs text-neutral-500 mt-1">
            {t("subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPermissionModalOpen(true)}
            className="text-xs font-bold"
          >
            <Shield className="w-3.5 h-3.5 me-1.5 text-secondary" />
            {t("roleMatrix")}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setInviteModalOpen(true)}
            className="text-xs font-bold"
          >
            <UserPlus className="w-3.5 h-3.5 me-1.5" />
            {t("inviteMember")}
          </Button>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-tertiary/70 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead className="bg-darnaBg/60 border-b border-tertiary/60 text-neutral-600 text-xs font-semibold">
              <tr>
                <th className="py-3 px-4 text-start">{t("name")}</th>
                <th className="py-3 px-4 text-start">{t("email")}</th>
                <th className="py-3 px-4 text-start">{t("role")}</th>
                <th className="py-3 px-4 text-start">{t("lastLogin")}</th>
                <th className="py-3 px-4 text-start">{tCommon("status")}</th>
                <th className="py-3 px-4 text-end">{tCommon("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tertiary/40">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-neutral-400">
                    {tCommon("loading")}
                  </td>
                </tr>
              ) : (
                members.map((u) => (
                  <tr key={u.id} className="hover:bg-darnaBg/20 transition-colors">
                    <td className="py-3 px-4 font-bold text-primary">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-secondary/15 text-secondary flex items-center justify-center font-bold text-xs uppercase">
                          {u.name.slice(0, 2)}
                        </div>
                        <div>
                          <div>{u.name}</div>
                          <div className="text-[10px] text-neutral-400 font-mono font-normal">
                            {u.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-neutral-600">{u.email}</td>
                    <td className="py-3 px-4">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as AdminRole)}
                        className="py-1 px-2.5 rounded-lg border border-tertiary/80 text-xs font-semibold bg-white text-primary focus:outline-none focus:border-secondary"
                      >
                        {roles.map((r) => (
                          <option key={r.key} value={r.key}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-neutral-500">
                      {formatDate(u.lastLoginAt, locale)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          u.isActive
                            ? "bg-secondary/15 text-secondary"
                            : "bg-neutral-100 text-neutral-400"
                        }`}
                      >
                        {u.isActive ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-end">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(u)}
                        className="text-xs font-semibold text-neutral-500 hover:text-primary underline cursor-pointer"
                      >
                        {u.isActive ? "Deactivate" : "Activate"}
                      </button>
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
        title="Admin Roles & Permissions Matrix"
        size="lg"
      >
        <div className="space-y-4 text-start">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-tertiary/40">
            {roles.map((r) => (
              <button
                key={r.key}
                onClick={() => setSelectedRoleForMatrix(r.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  selectedRoleForMatrix === r.key
                    ? "bg-primary text-white"
                    : "text-neutral-500 hover:text-primary hover:bg-neutral-100"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <p className="text-xs text-neutral-600">
            {roles.find((r) => r.key === selectedRoleForMatrix)?.desc}
          </p>

          <div className="border border-tertiary/70 rounded-xl overflow-hidden bg-darnaBg/30 p-3 max-h-72 overflow-y-auto">
            <h4 className="text-xs font-bold text-primary mb-2">Granted Permission Scopes:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ROLE_PERMISSIONS[selectedRoleForMatrix].map((perm) => (
                <div
                  key={perm}
                  className="p-2 rounded-lg bg-white border border-tertiary/60 text-[11px] font-mono text-secondary flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{perm}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPermissionModalOpen(false)}
              className="text-xs"
            >
              Close
            </Button>
          </div>
        </div>
      </Dialog>

      {/* INVITE STAFF MODAL */}
      <Dialog
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title={t("inviteMember")}
        size="md"
      >
        <div className="space-y-4 text-start">
          <div>
            <label className="block text-xs font-bold text-primary mb-1">
              {t("name")}
            </label>
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="e.g. Yacine Brahimi"
              className="w-full p-2.5 rounded-xl border border-tertiary text-xs bg-white text-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-primary mb-1">
              {t("email")}
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="yacine@darna.dz"
              className="w-full p-2.5 rounded-xl border border-tertiary text-xs bg-white text-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-primary mb-1">
              {t("role")}
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as AdminRole)}
              className="w-full p-2.5 rounded-xl border border-tertiary text-xs bg-white text-primary"
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
              variant="outline"
              size="sm"
              onClick={() => setInviteModalOpen(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleInvite}
              className="font-bold text-xs"
            >
              {t("inviteMember")}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
