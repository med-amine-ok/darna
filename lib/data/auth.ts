import { SafeUser } from "@/types";
import { mockCurrentUserStore, mockUsersStore, updateMockStores } from "../mock-data";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Simulates slight network latency to test loading skeletons
const delay = (ms: number = 20) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Returns the currently authenticated user session.
 * Reads the NextAuth session cookie; if unauthenticated, returns null.
 */
export async function getCurrentUser(): Promise<SafeUser | null> {
  await delay();
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return null;
    }

    const user = mockUsersStore.find(
      (u) => u.email?.toLowerCase() === session.user?.email?.toLowerCase()
    );

    if (user) {
      updateMockStores.setCurrentUser(user);
      return user;
    }

    const newUser: SafeUser = {
      id: (session.user as any).id || `user-${Date.now()}`,
      name: session.user.name || "DARNA Guest",
      email: session.user.email,
      emailVerified: null,
      image: session.user.image || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      favoriteIds: [],
      role: "guest",
    };

    updateMockStores.addUser(newUser);
    updateMockStores.setCurrentUser(newUser);
    return newUser;
  } catch (error) {
    return null;
  }
}

/**
 * Returns all registered users for admin management.
 * // TODO: replace with Supabase query
 */
export async function getUsers(): Promise<SafeUser[]> {
  await delay();
  // TODO: replace with Supabase query
  // const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  return mockUsersStore;
}

/**
 * Fetches a single user by ID.
 * // TODO: replace with Supabase query
 */
export async function getUserById(id: string): Promise<SafeUser | null> {
  await delay();
  // TODO: replace with Supabase query
  // const { data } = await supabase.from('profiles').select('*').eq('id', id).single();
  const user = mockUsersStore.find((u) => u.id === id);
  return user || null;
}

/**
 * Updates a user's profile.
 * // TODO: replace with Supabase query
 */
export async function updateUser(id: string, updates: Partial<SafeUser>): Promise<SafeUser | null> {
  await delay();
  // TODO: replace with Supabase query
  // const { data } = await supabase.from('profiles').update(updates).eq('id', id).select().single();
  const user = mockUsersStore.find((u) => u.id === id);
  if (!user) return null;
  const updatedUser: SafeUser = {
    ...user,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  updateMockStores.setCurrentUser(updatedUser);
  return updatedUser;
}

/**
 * Deletes a user (Admin).
 * // TODO: replace with Supabase query
 */
export async function deleteUser(id: string): Promise<boolean> {
  await delay();
  // TODO: replace with Supabase query
  // const { error } = await supabase.from('profiles').delete().eq('id', id);
  updateMockStores.deleteUser(id);
  return true;
}
