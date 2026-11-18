import "server-only";

/**
 * Staff passwords and second factors live in the Django API only
 * (POST /admin/auth/login, /admin/auth/2fa/authenticate,
 * /admin/auth/authenticators/totp). This app never stores, hashes or reads
 * them, and has no demo accounts: staff accounts are created by the backend
 * seed or by an invitation (POST /admin/staff/invitations).
 */
export {};
