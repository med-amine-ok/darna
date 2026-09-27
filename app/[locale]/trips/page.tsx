import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import React from "react";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getReservation from "@/app/actions/getReservations";
import TripsClient from "./TripsClient";
import { getTranslations } from "next-intl/server";

type Props = {};

const TripsPage = async (props: Props) => {
  const currentUser = await getCurrentUser();
  const t = await getTranslations("trips");
  const tCommon = await getTranslations("common");

  if (!currentUser) {
    return (
      <ClientOnly>
        <EmptyState title={tCommon("unauthorized")} subtitle={tCommon("pleaseLogin")} />
      </ClientOnly>
    );
  }

  const reservations = await getReservation({
    userId: currentUser.id,
  });

  return (
    <ClientOnly>
      <TripsClient reservations={reservations} currentUser={currentUser} />
    </ClientOnly>
  );
};

export default TripsPage;
