import { Metadata } from "next";
import TeamClient from "./TeamClient";

export const metadata: Metadata = {
  title: "Staff Team & Roles",
};

interface Props {
  params: {
    locale: string;
  };
}

export default function TeamPage({ params }: Props) {
  return <TeamClient locale={params.locale} />;
}
