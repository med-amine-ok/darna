import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import React from "react";
import getCurrentUser from "@/app/actions/getCurrentUser";
import BecomeAHostClient from "@/components/host/BecomeAHostClient";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function BecomeAHostPage() {
  const currentUser = await getCurrentUser();
  const tCommon = await getTranslations("common");

  if (!currentUser) {
    return (
      <ClientOnly>
        <EmptyState
          title={tCommon("unauthorized")}
          subtitle={tCommon("pleaseLogin")}
        />
      </ClientOnly>
    );
  }

  return (
    <ClientOnly>
      <BecomeAHostClient currentUser={currentUser} />
    </ClientOnly>
  );
}
