/**
 * Test mode: lets anyone sign in to the demo site with one click, even on a
 * production build served over plain http with no DARNA_SESSION_SECRET set.
 *
 * ON by default while BLADUS runs on mock data. Turn it OFF before real users
 * or real data exist by setting NEXT_PUBLIC_BLADUS_TEST_MODE=0 at build time.
 *
 * When ON:
 *  - a built-in development secret is used if DARNA_SESSION_SECRET is missing
 *    (session cookies can then be forged by anyone who reads this repo),
 *  - the session cookie is not marked Secure (works on http://IP:port),
 *  - the same-origin check on the JSON auth routes is skipped (works behind
 *    proxies that rewrite the Host header),
 *  - the one-click demo accounts are shown in the sign-in dialog.
 *
 * Safe to import from client and server code (NEXT_PUBLIC_ is inlined at build).
 */
export const TEST_MODE = process.env.NEXT_PUBLIC_BLADUS_TEST_MODE !== "0";
