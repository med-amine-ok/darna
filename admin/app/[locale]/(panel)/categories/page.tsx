import { guardPage } from "@/lib/auth/page-guard";
import CategoriesClient from "./CategoriesClient";
import { pageMetadata } from "@/lib/metadata";

export const generateMetadata = pageMetadata("categories");


interface Props {
  params: {
    locale: string;
  };
}

export default async function CategoriesPage({ params }: Props) {
  const denied = await guardPage("categories.manage");
  if (denied) return denied;

  return <CategoriesClient locale={params.locale} />;
}
