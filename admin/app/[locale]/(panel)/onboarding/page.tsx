import { Metadata } from "next";
import OnboardingClient from "./OnboardingClient";

export const metadata: Metadata = {
  title: "Onboarding Flow Configurator",
};

interface Props {
  params: {
    locale: string;
  };
}

export default function OnboardingPage({ params }: Props) {
  return <OnboardingClient locale={params.locale} />;
}
