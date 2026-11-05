import "../styles/globals.css";
import type { Metadata, Viewport } from "next";
import { SITE_URL } from "@/lib/site";

// Locale-specific title/description live in app/[locale]/layout.tsx.
// Icons come from the file conventions (app/icon.png, app/apple-icon.png, app/favicon.ico).
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: "BLADUS",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0B57D0",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
