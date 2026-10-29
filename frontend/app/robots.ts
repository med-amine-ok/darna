import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const PRIVATE = [
  "host",
  "become-a-host",
  "settings",
  "messages",
  "notifications",
  "reservations",
  "favorites",
  "profile",
  "login",
  "trips$",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", ...PRIVATE.map((p) => `/*/${p}`)],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
