import { OrgProfilePage, orgProfileMetadata, type OrgProfileParams } from "@/components/agency/orgProfilePage";

export const dynamic = "force-dynamic";

/** Public profile of a agency (see lib/host-profile.ts for the route of each host category). */
export function generateMetadata(props: OrgProfileParams) {
  return orgProfileMetadata(props, "agency");
}

export default function Page(props: OrgProfileParams) {
  return OrgProfilePage(props, "agency");
}
