import ScopedIntlProvider from "@/components/i18n/ScopedIntlProvider";

// The profile steps get the global translations plus the "welcome" namespace.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ScopedIntlProvider scope="welcome">{children}</ScopedIntlProvider>;
}
