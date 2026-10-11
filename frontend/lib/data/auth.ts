// TODO: replace with Supabase query
import { User } from "@/types";
import { currentUserMock, mockUsers } from "@/lib/mock-data/users";

export async function getCurrentUser(): Promise<User | null> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 80));
  return currentUserMock;
}

export async function getUserById(userId: string): Promise<User | null> {
  await new Promise((resolve) => setTimeout(resolve, 60));
  return mockUsers.find((u) => u.id === userId) || null;
}
