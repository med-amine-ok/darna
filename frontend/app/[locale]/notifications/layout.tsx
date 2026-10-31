import ScopedIntlProvider from "@/components/i18n/ScopedIntlProvider";

// Client components below get the global translations plus the "notifications" namespaces.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ScopedIntlProvider scope="notifications">{children}</ScopedIntlProvider>;
}
