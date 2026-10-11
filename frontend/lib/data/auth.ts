// TODO: replace with Supabase query
import { User, HostType } from "@/types";
import { currentUserMock, mockUsers } from "@/lib/mock-data/users";

let usersStore: User[] = mockUsers.map((u) => ({ ...u }));
let activeUserId: string = currentUserMock.id;

export async function getCurrentUser(userIdOverride?: string): Promise<User | null> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 30));

  const targetId = userIdOverride || activeUserId || currentUserMock.id;
  const user = usersStore.find((u) => u.id === targetId);
  return user ? { ...user } : usersStore[2]; // fallback to Yacine (guest)
}

export async function getUserById(userId: string): Promise<User | null> {
  await new Promise((resolve) => setTimeout(resolve, 30));
  return usersStore.find((u) => u.id === userId) || null;
}

export async function updateUserHostStatus(
  userId: string,
  data: { hostType: HostType; organizationId?: string }
): Promise<User | null> {
  await new Promise((resolve) => setTimeout(resolve, 40));
  const user = usersStore.find((u) => u.id === userId);
  if (user) {
    user.role = "host";
    user.hostType = data.hostType;
    if (data.organizationId) {
      user.organizationId = data.organizationId;
    }
    return { ...user };
  }
  return null;
}

export async function switchUser(userId: string): Promise<User | null> {
  activeUserId = userId;
  return getUserById(userId);
}

export async function resetUserToGuest(userId: string = "usr_yacine"): Promise<void> {
  const user = usersStore.find((u) => u.id === userId);
  if (user) {
    user.role = "guest";
    user.hostType = null;
    user.organizationId = null;
  }
}
