"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { User, Listing, Reservation } from "@/types";
import { logAdminAction } from "@/lib/data/admin";
import {
  HiOutlineSearch,
  HiOutlineUsers,
  HiOutlineShieldCheck,
  HiOutlineBan,
  HiOutlineEye,
  HiOutlineMail,
  HiOutlinePhone,
  HiOutlineHome,
  HiOutlineCalendar,
  HiOutlineCheckCircle,
} from "react-icons/hi";
import { FaCheckCircle } from "react-icons/fa";
import { toast } from "react-toastify";
import ConfirmDialog from "@/components/models/ConfirmDialog";
import { getWallets } from "@/lib/data/wallet";
import { Wallet } from "@/types";
import Link from "next/link";
import { HiOutlineCreditCard } from "react-icons/hi";

interface AdminUsersClientProps {
  initialUsers: User[];
  allListings: Listing[];
  allReservations: Reservation[];
}

export default function AdminUsersClient({
  initialUsers,
  allListings,
  allReservations,
}: AdminUsersClientProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);

  React.useEffect(() => {
    getWallets().then(setWallets).catch(console.error);
  }, []);

  // Suspended state tracking
  const [suspendedUsers, setSuspendedUsers] = useState<Record<string, boolean>>({});

  // Internal admin notes
  const [userNotes, setUserNotes] = useState<Record<string, string[]>>({
    usr_karim: ["Trade Register RC verified and cross-checked against CNRC directory."],
  });
  const [newNote, setNewNote] = useState("");
  const [suspendingUser, setSuspendingUser] = useState<{ id: string; name: string } | null>(null);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !u.name.toLowerCase().includes(q) &&
          !u.email.toLowerCase().includes(q) &&
          !(u.phone || "").toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [users, roleFilter, searchQuery]);

  const handleRoleChange = (userId: string, newRole: "guest" | "host" | "admin") => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
    );
    logAdminAction("CHANGE_USER_ROLE", "user", userId, `Changed role of user ${userId} to ${newRole}`);
    toast.success(`Role updated to ${newRole}.`);
  };

  const handleToggleSuspend = (userId: string, userName: string) => {
    const isCurrentlySuspended = !!suspendedUsers[userId];
    if (isCurrentlySuspended) {
      // Reactivate directly
      executeToggleSuspend(userId, userName, false);
    } else {
      // Prompt confirmation before suspending
      setSuspendingUser({ id: userId, name: userName });
    }
  };

  const executeToggleSuspend = (userId: string, userName: string, suspend: boolean) => {
    setSuspendedUsers((prev) => ({ ...prev, [userId]: suspend }));
    logAdminAction(
      suspend ? "SUSPEND_USER" : "REACTIVATE_USER",
      "user",
      userId,
      `${suspend ? "Suspended" : "Reactivated"} user account ${userName}`
    );
    toast.info(suspend ? `${userName} has been suspended.` : `${userName} reactivated.`);
    setSuspendingUser(null);
  };

  const handleAddNote = (userId: string) => {
    if (!newNote.trim()) return;
    setUserNotes((prev) => ({
      ...prev,
      [userId]: [...(prev[userId] || []), `${new Date().toLocaleDateString("fr-DZ")}: ${newNote}`],
    }));
    toast.success("Admin note appended.");
    setNewNote("");
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">
            Users & Hosts Control
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1">
            Manage user permissions, identity verification badges, and account status.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-tertiary/70 shadow-2xs">
          <span className="text-xs font-bold text-neutral-500 uppercase">Registered:</span>
          <span className="font-bold text-primary">{users.length} accounts</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-3xl border border-tertiary/70 p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <HiOutlineSearch size={18} className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, or Algerian phone..."
            className="w-full ps-10 pe-4 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <label htmlFor="admin-role-filter" className="sr-only">Role Filter</label>
          <select
            id="admin-role-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full md:w-48 px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs font-semibold text-primary focus:outline-none focus:border-primary"
          >
            <option value="all">All Roles</option>
            <option value="guest">Travelers (Guests)</option>
            <option value="host">Hosts & Agencies</option>
            <option value="admin">Administrators</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-tertiary/70 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-neutral-50 border-b border-tertiary/60 text-neutral-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 text-start">User Profile</th>
                <th className="py-3 px-4 text-start">Contact</th>
                <th className="py-3 px-4 text-start">Role</th>
                <th className="py-3 px-4 text-start">Host Type</th>
                <th className="py-3 px-4 text-center">ID Verified</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-end">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tertiary/40">
              {filtered.map((user) => {
                const isSuspended = !!suspendedUsers[user.id];

                return (
                  <tr key={user.id} className="hover:bg-neutral-50/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-9 h-9 rounded-full overflow-hidden bg-neutral-200 shrink-0">
                          <Image src={user.image || "/assets/avatar.png"} alt={user.name} fill className="object-cover" />
                        </div>
                        <div>
                          <div className="font-bold text-primary">{user.name}</div>
                          <div className="text-[11px] text-neutral-400 font-mono">{user.id}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-neutral-600 whitespace-nowrap">
                      <div>{user.email}</div>
                      <div className="font-mono text-[11px] text-neutral-400">{user.phone || "—"}</div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as any)}
                        className="px-2.5 py-1 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs font-semibold text-primary capitalize focus:outline-none"
                      >
                        <option value="guest">Guest</option>
                        <option value="host">Host</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>

                    <td className="py-3.5 px-4 capitalize text-neutral-600 font-medium whitespace-nowrap">
                      {user.hostType || "—"}
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {user.isIdentityVerified ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                          <FaCheckCircle className="text-secondary" /> Verified
                        </span>
                      ) : (
                        <span className="text-neutral-400">Unverified</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isSuspended
                            ? "bg-rose-100 text-rose-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {isSuspended ? "Suspended" : "Active"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-end whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleSuspend(user.id, user.name)}
                          className={`p-1.5 rounded-lg transition ${
                            isSuspended
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                              : "hover:bg-rose-50 text-rose-600"
                          }`}
                          title={isSuspended ? "Reactivate user" : "Suspend user"}
                        >
                          <HiOutlineBan size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedUser(user)}
                          className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-primary rounded-xl text-xs font-bold transition flex items-center gap-1"
                        >
                          <HiOutlineEye size={14} />
                          <span>Dossier</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Dossier Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-tertiary shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-tertiary/60 mb-6">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-neutral-200 shrink-0">
                  <Image src={selectedUser.image || "/assets/avatar.png"} alt={selectedUser.name} fill className="object-cover" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-black text-primary">{selectedUser.name}</h3>
                  <div className="text-xs text-neutral-500 font-mono">{selectedUser.email} • {selectedUser.role.toUpperCase()}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Profile Data */}
            <div className="grid grid-cols-2 gap-3 text-xs mb-6 bg-neutral-50 p-4 rounded-2xl border border-tertiary/60">
              <div>
                <span className="text-neutral-400 block font-bold">Phone Number:</span>
                <span className="font-mono text-primary font-semibold">{selectedUser.phone || "Not provided"}</span>
              </div>
              <div>
                <span className="text-neutral-400 block font-bold">Identity Verification:</span>
                <span className="text-primary font-semibold">{selectedUser.isIdentityVerified ? "Algerian CNI / Passport Verified" : "Pending Document Upload"}</span>
              </div>
              <div>
                <span className="text-neutral-400 block font-bold">Host Category:</span>
                <span className="capitalize text-primary font-semibold">{selectedUser.hostType || "None (Guest)"}</span>
              </div>
              <div>
                <span className="text-neutral-400 block font-bold">Member Since:</span>
                <span className="text-primary font-semibold">{new Date(selectedUser.createdAt).toLocaleDateString("fr-DZ")}</span>
              </div>
            </div>

            {/* Host Financial Snapshot if user is a host */}
            {(() => {
              const userWallet = wallets.find(
                (w) => w.ownerId === selectedUser.id || (selectedUser.organizationId && w.ownerId === selectedUser.organizationId)
              );
              if (!userWallet) return null;

              const isNegative = userWallet.balance < 0;

              return (
                <div className="mb-6 p-4 rounded-2xl bg-neutral-50/90 border border-tertiary/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HiOutlineCreditCard className="text-primary" size={18} />
                      <span className="font-bold text-xs text-primary">Prepaid Host Wallet & Solvency</span>
                    </div>
                    <Link
                      href="/admin/wallets"
                      className="text-[11px] text-primary font-bold hover:underline flex items-center gap-1"
                    >
                      <span>Manage in Wallets &rarr;</span>
                    </Link>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-tertiary/60">
                    <div>
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">
                        Current Deposit Balance
                      </span>
                      <span className={`text-base font-serif font-black ${isNegative ? "text-rose-700" : "text-primary"}`}>
                        {userWallet.balance < 0 ? "-" : ""}
                        {Math.abs(userWallet.balance).toLocaleString("fr-DZ")} DZD
                      </span>
                    </div>

                    <div>
                      {isNegative ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                          ⚠️ Negative Balance
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ✓ Solvent
                        </span>
                      )}
                    </div>
                  </div>

                  {isNegative && (
                    <p className="text-[11px] text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                      Commission deductions have exceeded this host's prepaid deposit. Listing booking privileges are subject to suspension until an offline recharge is confirmed.
                    </p>
                  )}

                  {/* Recent 2 transactions preview */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider block">
                      Recent Activity
                    </span>
                    {userWallet.transactions.slice(0, 2).map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between text-[11px] py-1 border-b border-tertiary/30 last:border-none">
                        <span className="text-neutral-600 truncate max-w-[280px]">
                          {tx.type === "recharge" ? "Deposit Recharge" : "Commission"} • {tx.note || tx.id}
                        </span>
                        <span className={`font-mono font-bold shrink-0 ${tx.amount > 0 ? "text-emerald-700" : "text-rose-700"}`}>
                          {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString("fr-DZ")} DZD
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* User Notes */}
            <div className="mb-4">
              <label className="text-xs font-bold text-neutral-600 block mb-1">
                Internal Administrative Notes & Compliance Remarks
              </label>
              {(userNotes[selectedUser.id] || []).map((n, i) => (
                <div key={i} className="text-xs bg-neutral-50 p-2 rounded-lg mb-1.5 border border-tertiary/40 text-neutral-700">
                  {n}
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  placeholder="Append compliance or audit note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 px-3 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs text-primary focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => handleAddNote(selectedUser.id)}
                  className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 transition"
                >
                  Save Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Suspend User Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!suspendingUser}
        variant="destructive"
        title="Suspend User Account"
        message={
          suspendingUser
            ? `Are you sure you want to suspend ${suspendingUser.name}'s account? This will immediately revoke their active sessions and prevent them from booking or hosting on DARNA.`
            : ""
        }
        confirmLabel="Suspend account"
        cancelLabel="Keep active"
        onConfirm={() => {
          if (suspendingUser) executeToggleSuspend(suspendingUser.id, suspendingUser.name, true);
        }}
        onCancel={() => setSuspendingUser(null)}
      />
    </div>
  );
}
