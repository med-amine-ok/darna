import ScopedIntlProvider from "@/components/i18n/ScopedIntlProvider";

// Client components below get the global translations plus the "messages" namespaces.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <ScopedIntlProvider scope="messages">{children}</ScopedIntlProvider>;
}
