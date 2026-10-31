"use client";

/**
 * Sign-up lives in the shared auth dialog (components/models/LoginModal.tsx): it opens for
 * both the login and the register store, so the Log in / Sign up switch animates inside
 * one dialog instead of closing one modal and opening another. This component stays
 * mounted in the layout for compatibility and renders nothing.
 */
export default function RegisterModal() {
  return null;
}
