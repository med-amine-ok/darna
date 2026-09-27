"use client";

import React, { useState, useMemo } from "react";
import { SafeUser } from "@/types";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { MdSearch, MdAdminPanelSettings, MdPerson } from "react-icons/md";

interface Props {
  initialUsers: SafeUser[];
}

export default function AdminUsersClient({ initialUsers }: Props) {
  const t = useTranslations("admin");
  const tFav = useTranslations("favorites");
  const [users, setUsers] = useState<SafeUser[]>(initialUsers);
  const [search, setSearch] = useState("");

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        (u.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [users, search]);

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <MdSearch
            size={20}
            className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full ps-10 pe-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm outline-none focus:border-neutral-900 transition"
          />
        </div>
        <span className="text-xs font-semibold text-neutral-500">
          {t("totalCount", { count: filteredUsers.length })}
        </span>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-tertiary shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead className="bg-tertiary/20 text-xs text-primary uppercase border-b border-tertiary">
              <tr>
                <th className="py-3.5 px-4 text-start font-semibold">{t("user")}</th>
                <th className="py-3.5 px-4 text-start font-semibold">{t("role")}</th>
                <th className="py-3.5 px-4 text-start font-semibold">{t("favorites")}</th>
                <th className="py-3.5 px-4 text-start font-semibold">{t("memberSince")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-neutral-400">
                    {t("noData")}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, idx) => {
                  const isAdmin = idx === 0;
                  return (
                    <tr key={user.id} className="hover:bg-neutral-50/70 transition">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-neutral-100 border border-tertiary">
                            <Image
                              src={
                                user.image ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                  user.name || "User"
                                )}`
                              }
                              alt={user.name || "User Avatar"}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          </div>
                          <div>
                            <p className="font-semibold text-primary">
                              {user.name || "User"}
                            </p>
                            <p className="text-xs text-neutral-400">
                              {user.email || "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-accent/15 text-accent border border-accent/25">
                            <MdAdminPanelSettings size={14} />
                            <span>{t("roleAdmin")}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-neutral-100 text-neutral-600">
                            <MdPerson size={14} />
                            <span>{t("roleUser")}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-600 text-xs">
                        {tFav("savedPlaces", { count: user.favoriteIds?.length || 0 })}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-500 text-xs">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
