import { notFound, redirect } from "next/navigation";
import ScopedIntlProvider from "@/components/i18n/ScopedIntlProvider";
import { loadPublicProfile } from "@/lib/api/people";

/**
 * Every public profile has one shareable address: /users/<handle> (ACC-06).
 * Old id links (and other spellings) are redirected here, in the layout,
 * because the page itself streams behind a loading screen and could no
 * longer answer with a real HTTP redirect.
 */
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { userId: string; locale: string };
}) {
  const key = decodeURIComponent(params.userId);
  if (key !== "me" && key !== "current") {
    const user = await loadPublicProfile(key);
    // A real 404 status for unknown or hidden profiles (the page streams, so it cannot set one).
    if (!user) notFound();
    if (user.handle && key !== user.handle) {
      redirect(`/${params.locale}/users/${encodeURIComponent(user.handle)}`);
    }
  }
  // Client components below get the global translations plus the "profile" namespaces.
  return <ScopedIntlProvider scope="profile">{children}</ScopedIntlProvider>;
}
