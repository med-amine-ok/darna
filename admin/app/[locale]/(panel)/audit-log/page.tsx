import { Metadata } from "next";
import AuditLogClient from "./AuditLogClient";

export const metadata: Metadata = {
  title: "Security Audit Log",
};

interface Props {
  params: {
    locale: string;
  };
}

export default function AuditLogPage({ params }: Props) {
  return <AuditLogClient locale={params.locale} />;
}
