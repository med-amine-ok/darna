import * as fs from "fs";
import * as path from "path";
import { SignJWT } from "jose";

/**
 * Test helper: mints a session cookie value the running admin app accepts.
 * The secret is read from ADMIN_AUTH_SECRET (process env, else .env.local /
 * .env in the admin root), it is never hard-coded in the test suite.
 * Must stay in sync with lib/auth/config.ts (issuer / audience).
 */

const JWT_ISSUER = "urn:darna:admin";
const JWT_AUDIENCE = "urn:darna:admin-panel";

function readSecretFromEnvFiles(): string | undefined {
  for (const file of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf-8").split(/\r?\n/)) {
      const m = line.match(/^\s*ADMIN_AUTH_SECRET\s*=\s*(.*)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, "");
    }
  }
  return undefined;
}

export function getTestAuthSecret(): Uint8Array {
  const secret = process.env.ADMIN_AUTH_SECRET || readSecretFromEnvFiles();
  if (!secret) {
    throw new Error(
      "ADMIN_AUTH_SECRET is not set. Export it (same value as the running admin app) or add it to admin/.env.local.",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  claims: { userId: string; email: string; name: string; role: string } = {
    userId: "adm_01",
    email: "admin@bladus.dz",
    name: "Nadia Benkhaled",
    role: "super_admin",
  },
): Promise<string> {
  return await new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.userId)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getTestAuthSecret());
}
