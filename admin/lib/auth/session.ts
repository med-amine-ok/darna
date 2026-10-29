import "server-only";

import { SignJWT, jwtVerify } from "jose";
import type { AdminRole } from "@/lib/types";
import {
  JWT_AUDIENCE,
  JWT_ISSUER,
  SESSION_TTL_SECONDS,
  getSessionSecretKey,
} from "./config";

export { SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from "./config";

/**
 * Claims carried by the session token. Only `userId` is authoritative: role,
 * name and active status are always re-read from the admin store on the server
 * (see lib/auth/current-admin.ts), so demotion/deactivation take effect
 * immediately instead of after the token expires.
 */
export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: AdminRole;
  avatar?: string;
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSessionSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecretKey(), {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    if (typeof payload.userId !== "string" || payload.sub !== payload.userId) return null;
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
