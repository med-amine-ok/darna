import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import React from "react";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getFavoriteListings from "@/app/actions/getFavoriteListings";
import FavoritesClient from "./FavoritesClient";
import { getTranslations } from "next-intl/server";

type Props = {};

const FavoritesPage = async (props: Props) => {
  const listings = await getFavoriteListings();
  const currentUser = await getCurrentUser();
  const t = await getTranslations("favorites");
  const tCommon = await getTranslations("common");

  if (!currentUser) {
    return (
      <ClientOnly>
        <EmptyState title={tCommon("unauthorized")} subtitle={tCommon("pleaseLogin")} />
      </ClientOnly>
    );
  }

  return (
    <ClientOnly>
      <FavoritesClient listings={listings} currentUser={currentUser} />
    </ClientOnly>
  );
};

export default FavoritesPage;
