// TODO: replace with Supabase query
import { User, HostType } from "@/types";
import { mockUsers } from "@/lib/mock-data/users";

const g = globalThis as unknown as { __darna_users__?: User[] };
if (!g.__darna_users__) {
  g.__darna_users__ = mockUsers.map((u) => ({ ...u }));
}
let usersStore: User[] = g.__darna_users__;

export async function getCurrentUser(userIdOverride?: string): Promise<User | null> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 30));

  let targetId = userIdOverride;

  // If in browser and no ID passed, check document.cookie
  if (!targetId && typeof window !== "undefined") {
    const match = document.cookie.match(/(?:^|;\s*)darna_user_id=([^;]+)/);
    if (match && match[1]) {
      targetId = match[1];
    }
  }

  if (!targetId) {
    return null; // By default: strictly NOT logged in without cookie
  }

  let user = usersStore.find((u) => u.id === targetId);
  if (!user) {
    user = {
      id: targetId,
      name: "Traveler",
      email: `${targetId}@darna.dz`,
      image: "/assets/avatar.png",
      role: "guest",
      hostType: null,
      createdAt: new Date().toISOString(),
      favoriteIds: [],
      isIdentityVerified: false,
    };
    usersStore.push(user);
  }
  return { ...user };
}

export async function getUserById(userId: string): Promise<User | null> {
  await new Promise((resolve) => setTimeout(resolve, 30));
  return usersStore.find((u) => u.id === userId) || null;
}

export async function authenticateUser(email: string, name?: string): Promise<User> {
  await new Promise((resolve) => setTimeout(resolve, 40));
  const normalized = email.toLowerCase().trim();

  // Check existing mock users first
  if (normalized.includes("amina")) {
    return { ...usersStore.find((u) => u.id === "usr_amina")! };
  }
  if (normalized.includes("karim")) {
    return { ...usersStore.find((u) => u.id === "usr_karim")! };
  }
  if (normalized.includes("yacine")) {
    return { ...usersStore.find((u) => u.id === "usr_yacine")! };
  }

  let user = usersStore.find((u) => u.email.toLowerCase() === normalized);
  if (!user) {
    user = {
      id: `usr_${Date.now()}`,
      name: name || normalized.split("@")[0] || "Traveler",
      email: normalized,
      image: "/assets/avatar.png",
      role: "guest",
      hostType: null,
      createdAt: new Date().toISOString(),
      favoriteIds: [],
      isIdentityVerified: false,
    };
    usersStore.push(user);
  }
  return { ...user };
}

export async function updateUserHostStatus(
  userId: string,
  data: { hostType?: HostType; organizationId?: string; bookingApprovalMode?: "instant" | "request" }
): Promise<User | null> {
  await new Promise((resolve) => setTimeout(resolve, 40));
  let user = usersStore.find((u) => u.id === userId);
  if (!user) {
    user = {
      id: userId,
      name: "Host User",
      email: `${userId}@darna.dz`,
      image: "/assets/avatar.png",
      role: "host",
      hostType: data.hostType || "individual",
      bookingApprovalMode: data.bookingApprovalMode,
      createdAt: new Date().toISOString(),
      favoriteIds: [],
      isIdentityVerified: true,
    };
    usersStore.push(user);
  } else {
    user.role = "host";
    if (data.hostType) user.hostType = data.hostType;
    if (data.bookingApprovalMode) user.bookingApprovalMode = data.bookingApprovalMode;
  }

  if (data.organizationId) {
    user.organizationId = data.organizationId;
  }
  g.__darna_users__ = usersStore;

  const mockUser = mockUsers.find((u) => u.id === userId);
  if (mockUser) {
    mockUser.role = "host";
    if (data.hostType) mockUser.hostType = data.hostType;
    if (data.bookingApprovalMode) mockUser.bookingApprovalMode = data.bookingApprovalMode;
    if (data.organizationId) {
      mockUser.organizationId = data.organizationId;
    }
  }

  return { ...user };
}

export async function switchUser(userId: string | null): Promise<User | null> {
  return userId ? getUserById(userId) : null;
}

export async function logoutUser(): Promise<void> {
  // Session is cookie-based, no shared server mutation needed
}

export async function resetUserToGuest(userId: string = "usr_yacine"): Promise<void> {
  const user = usersStore.find((u) => u.id === userId);
  if (user) {
    user.role = "guest";
    user.hostType = null;
    user.organizationId = null;
  }
  const mockUser = mockUsers.find((u) => u.id === userId);
  if (mockUser) {
    mockUser.role = "guest";
    mockUser.hostType = null;
    mockUser.organizationId = null;
  }
}
