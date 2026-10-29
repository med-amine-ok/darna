import WhereDidItGoClient from "./WhereDidItGoClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("wherediditgo");

export default function WhereDidItGoPage() {
  return <WhereDidItGoClient />;
}
