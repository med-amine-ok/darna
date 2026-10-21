import { Metadata } from "next";
import CategoriesClient from "./CategoriesClient";

export const metadata: Metadata = {
  title: "Taxonomy & Categories",
};

interface Props {
  params: {
    locale: string;
  };
}

export default function CategoriesPage({ params }: Props) {
  return <CategoriesClient locale={params.locale} />;
}
