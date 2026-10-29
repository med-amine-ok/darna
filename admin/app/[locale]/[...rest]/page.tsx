import { notFound } from "next/navigation";

/**
 * Catch-all for unknown paths under a locale, so they render the localized
 * app/[locale]/not-found.tsx instead of Next's default 404. Real routes in
 * (panel) and (auth) always take precedence over this segment.
 */
export default function CatchAllNotFound() {
  notFound();
}
