import "server-only";

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password hashing for the mock credential store. Stored format:
 *   scrypt$<saltHex>$<hashHex>
 * Same shape a real DB column would hold, so swapping the store for a table
 * does not change the verification code.
 */

const KEY_LEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LEN);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// Used when the email is unknown so the response time does not reveal
// whether an account exists.
let dummyHash: string | null = null;
export function burnPasswordCheck(password: string): void {
  if (!dummyHash) dummyHash = hashPassword(randomBytes(16).toString("hex"));
  verifyPassword(password, dummyHash);
}
