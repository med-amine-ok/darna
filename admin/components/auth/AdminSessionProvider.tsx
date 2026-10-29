"use client";

import React, { createContext, useCallback, useContext, useMemo } from "react";
import type { AdminRole, Permission } from "@/lib/types";

/**
 * The signed-in admin as computed on the server by (panel)/layout.tsx
 * (verified session + current store record). UI hints only: every server
 * action re-checks permissions on its own.
 */
export interface AdminSessionValue {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  avatar?: string;
  permissions: Permission[];
}

const AdminSessionContext = createContext<AdminSessionValue | null>(null);

export function AdminSessionProvider({
  admin,
  children,
}: {
  admin: AdminSessionValue;
  children: React.ReactNode;
}) {
  return <AdminSessionContext.Provider value={admin}>{children}</AdminSessionContext.Provider>;
}

export function useCurrentAdmin(): AdminSessionValue | null {
  return useContext(AdminSessionContext);
}

/** Returns a stable `can(permission)` checker for the current admin. */
export function useCan(): (permission: Permission) => boolean {
  const admin = useContext(AdminSessionContext);
  const perms = useMemo(() => new Set(admin?.permissions ?? []), [admin]);
  return useCallback((permission: Permission) => perms.has(permission), [perms]);
}

/** Renders children only when the current admin holds `permission`. */
export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const can = useCan();
  return <>{can(permission) ? children : fallback}</>;
}
