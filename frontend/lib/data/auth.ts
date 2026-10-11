// TODO: replace with Supabase query
import { User, HostType } from "@/types";
import { mockUsers } from "@/lib/mock-data/users";

let usersStore: User[] = mockUsers.map((u) => ({ ...u }));

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
  data: { hostType: HostType; organizationId?: string }
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
      hostType: data.hostType,
      createdAt: new Date().toISOString(),
      favoriteIds: [],
      isIdentityVerified: true,
    };
    usersStore.push(user);
  } else {
    user.role = "host";
    user.hostType = data.hostType;
  }

  if (data.organizationId) {
    user.organizationId = data.organizationId;
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
}
