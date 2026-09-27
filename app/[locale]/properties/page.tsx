import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import React from "react";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getListings from "@/app/actions/getListings";
import PropertiesClient from "./PropertiesClient";
import { getTranslations } from "next-intl/server";

type Props = {};

const PropertiesPage = async (props: Props) => {
  const currentUser = await getCurrentUser();
  const t = await getTranslations("properties");
  const tCommon = await getTranslations("common");

  if (!currentUser) {
    return (
      <ClientOnly>
        <EmptyState title={tCommon("unauthorized")} subtitle={tCommon("pleaseLogin")} />
      </ClientOnly>
    );
  }

  const listings = await getListings({
    userId: currentUser.id,
  });

  return (
    <ClientOnly>
      <PropertiesClient listings={listings} currentUser={currentUser} />
    </ClientOnly>
  );
};

export default PropertiesPage;
