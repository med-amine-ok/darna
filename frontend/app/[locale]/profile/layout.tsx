import ScopedIntlProvider from "@/components/i18n/ScopedIntlProvider";

// Client components below get the global translations plus the "profile" namespaces.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ScopedIntlProvider scope="profile">{children}</ScopedIntlProvider>;
}
