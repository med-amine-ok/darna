import { notFound } from "next/navigation";

// Unknown paths under a locale (e.g. /fr/xyz) render the localized [locale]/not-found.tsx
// instead of falling through to the English-only root not-found page.
export default function CatchAll() {
  notFound();
}
