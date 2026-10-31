import ScopedIntlProvider from "@/components/i18n/ScopedIntlProvider";

// Client components below get the global translations plus the "help" namespaces.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ScopedIntlProvider scope="help">{children}</ScopedIntlProvider>;
}
