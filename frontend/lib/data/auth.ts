// TODO: replace with Supabase query (auth.users + public.profiles)
import "server-only";
import { randomBytes, scrypt as scryptCb, scryptSync, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { User, HostType } from "@/types";
import { mockUsers } from "@/lib/mock-data/users";
import { newId } from "@/lib/ids";
import { clone, delay, globalStore } from "./_store";
import { usersTable as usersStore } from "./_tables";

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

/** Password every seeded demo account accepts (documented in README.md). */
export const DEMO_PASSWORD = "darna-demo-2026";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-rules";
export { MIN_PASSWORD_LENGTH };

const KEY_LENGTH = 64;

function encodeHash(salt: Buffer, hash: Buffer): string {
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH);
  return encodeHash(salt, hash);
}

async function verifyPasswordHash(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** userId -> scrypt hash. Kept apart from User so it can never leak into props. */
const credentialsStore = globalStore<Map<string, string>>("__darna_credentials__", () => {
  // Seeded accounts share one demo password; hash it once at boot.
  const salt = randomBytes(16);
  const demoHash = encodeHash(salt, scryptSync(DEMO_PASSWORD, salt, KEY_LENGTH));
  return new Map(mockUsers.map((u) => [u.id, demoHash]));
});

// Used to keep login timing similar whether or not the email exists.
const DUMMY_HASH = encodeHash(Buffer.alloc(16), Buffer.alloc(KEY_LENGTH));

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function getUserById(userId: string): Promise<User | null> {
  await delay(20);
  const user = usersStore.find((u) => u.id === userId);
  return user ? clone(user) : null;
}

export async function getUsersByIds(userIds: string[]): Promise<User[]> {
  return clone(usersStore.filter((u) => userIds.includes(u.id)));
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const normalized = normalizeEmail(email);
  const user = usersStore.find((u) => u.email.toLowerCase() === normalized);
  return user ? clone(user) : null;
}

/** Exact (case-insensitive) email match + password check. Returns null on any failure. */
export async function verifyCredentials(email: string, password: string): Promise<User | null> {
  await delay(40);
  const normalized = normalizeEmail(email);
  const user = usersStore.find((u) => u.email.toLowerCase() === normalized);
  const stored = user ? credentialsStore.get(user.id) : undefined;

  const ok = await verifyPasswordHash(password, stored || DUMMY_HASH);
  if (!user || !stored || !ok) return null;
  return clone(user);
}

export type RegisterResult =
  | { ok: true; user: User }
  | { ok: false; reason: "EMAIL_TAKEN" | "WEAK_PASSWORD" | "INVALID" };

export async function registerUser(data: {
  name: string;
  email: string;
  password: string;
}): Promise<RegisterResult> {
  await delay(40);
  const email = normalizeEmail(data.email);
  const name = data.name.trim().slice(0, 80);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name) {
    return { ok: false, reason: "INVALID" };
  }
  if (data.password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, reason: "WEAK_PASSWORD" };
  }
  if (usersStore.some((u) => u.email.toLowerCase() === email)) {
    return { ok: false, reason: "EMAIL_TAKEN" };
  }

  const user: User = {
    id: newId("usr"),
    name,
    email,
    image: "/assets/avatar.png",
    role: "guest",
    hostType: null,
    organizationId: null,
    createdAt: new Date().toISOString(),
    favoriteIds: [],
    isIdentityVerified: false,
  };
  credentialsStore.set(user.id, await hashPassword(data.password));
  usersStore.push(user);
  return { ok: true, user: clone(user) };
}

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; reason: "WRONG_PASSWORD" | "WEAK_PASSWORD" | "NOT_FOUND" };

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<ChangePasswordResult> {
  await delay(40);
  const stored = credentialsStore.get(userId);
  if (!stored) return { ok: false, reason: "NOT_FOUND" };
  if (!(await verifyPasswordHash(currentPassword, stored))) {
    return { ok: false, reason: "WRONG_PASSWORD" };
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, reason: "WEAK_PASSWORD" };
  }
  credentialsStore.set(userId, await hashPassword(newPassword));
  return { ok: true };
}

/** Never creates users: returns null when the id is unknown. */
export async function updateUserHostStatus(
  userId: string,
  data: { hostType?: HostType; organizationId?: string | null; bookingApprovalMode?: "instant" | "request" }
): Promise<User | null> {
  await delay(30);
  const user = usersStore.find((u) => u.id === userId);
  if (!user) return null;

  if (data.hostType) {
    user.role = user.role === "admin" ? "admin" : "host";
    user.hostType = data.hostType;
  }
  if (data.bookingApprovalMode) user.bookingApprovalMode = data.bookingApprovalMode;
  if (data.organizationId !== undefined) user.organizationId = data.organizationId;

  return clone(user);
}

/** Whitelisted self-service profile fields. */
export async function updateUserProfile(
  userId: string,
  data: { name?: string; bio?: string; phone?: string; address?: string; languages?: string[]; image?: string }
): Promise<User | null> {
  await delay(30);
  const user = usersStore.find((u) => u.id === userId);
  if (!user) return null;

  if (typeof data.name === "string" && data.name.trim()) user.name = data.name.trim().slice(0, 80);
  if (typeof data.bio === "string") user.bio = data.bio.slice(0, 1000);
  if (typeof data.phone === "string") user.phone = data.phone.slice(0, 40);
  if (typeof data.address === "string") user.address = data.address.slice(0, 200);
  if (Array.isArray(data.languages)) {
    user.languages = data.languages.filter((l) => typeof l === "string").slice(0, 10);
  }
  if (typeof data.image === "string" && data.image.startsWith("/")) user.image = data.image;

  return clone(user);
}

export async function setUserFavorite(
  userId: string,
  listingId: string,
  favorite: boolean
): Promise<string[] | null> {
  const user = usersStore.find((u) => u.id === userId);
  if (!user) return null;
  const set = new Set(user.favoriteIds || []);
  if (favorite) set.add(listingId);
  else set.delete(listingId);
  user.favoriteIds = Array.from(set);
  return [...user.favoriteIds];
}
