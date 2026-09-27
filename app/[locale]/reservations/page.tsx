import ClientOnly from "@/components/ClientOnly";
import EmptyState from "@/components/EmptyState";
import React from "react";
import getCurrentUser from "@/app/actions/getCurrentUser";
import getReservation from "@/app/actions/getReservations";
import ReservationsClient from "./ReservationsClient";
import { getTranslations } from "next-intl/server";

type Props = {};

const ReservationsPage = async (props: Props) => {
  const currentUser = await getCurrentUser();
  const t = await getTranslations("reservations");
  const tCommon = await getTranslations("common");

  if (!currentUser) {
    return (
      <ClientOnly>
        <EmptyState title={tCommon("unauthorized")} subtitle={tCommon("pleaseLogin")} />
      </ClientOnly>
    );
  }

  const reservations = await getReservation({
    authorId: currentUser.id,
  });

  return (
    <ClientOnly>
      <ReservationsClient
        reservations={reservations}
        currentUser={currentUser}
      />
    </ClientOnly>
  );
};

export default ReservationsPage;
