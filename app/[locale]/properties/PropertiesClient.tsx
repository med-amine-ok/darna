"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import axios from "axios";
import { toast } from "react-toastify";
import { MdClose, MdAdd } from "react-icons/md";
import Container from "@/components/Container";
import Heading from "@/components/Heading";
import useRentModal from "@/hook/useRentModal";
import { SafeUser, safeListing } from "@/types";

type Props = {
  listings: safeListing[];
  currentUser?: SafeUser | null;
};

export default function PropertiesClient({ listings, currentUser }: Props) {
  const router = useRouter();
  const rentModal = useRentModal();
  const t = useTranslations("properties");
  const tListing = useTranslations("listing");
  const tCommon = useTranslations("common");

  const [localListings, setLocalListings] = useState<safeListing[]>(listings);
  const [selectedForDelete, setSelectedForDelete] = useState<safeListing | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const onConfirmDelete = useCallback(() => {
    if (!selectedForDelete) return;

    setIsDeleting(true);
    axios
      .delete(`/api/listings/${selectedForDelete.id}`)
      .then(() => {
        toast.info(tListing("listingDeleted"));
        setLocalListings((prev) => prev.filter((l) => l.id !== selectedForDelete.id));
        setSelectedForDelete(null);
        router.refresh();
      })
      .catch((error) => {
        toast.error(error?.response?.data?.error || tCommon("error"));
      })
      .finally(() => {
        setIsDeleting(false);
      });
  }, [selectedForDelete, router, tListing, tCommon]);

  return (
    <Container>
      <div className="max-w-7xl mx-auto pb-20">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <Heading title={t("title")} subtitle={t("subtitle")} />
          <button
            type="button"
            onClick={() => router.push("/become-a-host")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-sm font-semibold transition cursor-pointer self-start sm:self-auto shadow-sm"
          >
            <MdAdd size={18} />
            <span>{t("airbnbYourHome")}</span>
          </button>
        </div>

        {localListings.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-full bg-tertiary/20 flex items-center justify-center mb-4 p-3 border border-tertiary/40">
              <Image
                src="/assets/house.png"
                alt="House"
                width={36}
                height={36}
                className="w-9 h-9 object-contain"
              />
            </div>
            <h3 className="text-xl font-bold text-neutral-900">{t("emptyTitle")}</h3>
            <p className="text-sm text-neutral-500 mt-1 max-w-md">{t("noPropertiesDesc")}</p>
            <button
              type="button"
              onClick={rentModal.onOpen}
              className="mt-6 px-6 py-3 rounded-xl bg-neutral-900 hover:bg-black text-white text-sm font-semibold transition cursor-pointer shadow-sm"
            >
              {t("airbnbYourHome")}
            </button>
          </div>
        ) : (
          <div className="mt-8 sm:mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {localListings.map((listing) => (
              <div
                key={listing.id}
                className="border border-neutral-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col bg-white"
              >
                {/* Thumbnail */}
                <div
                  className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-100 cursor-pointer group"
                  onClick={() => router.push(`/listings/${listing.id}`)}
                >
                  <Image
                    fill
                    src={listing.imageSrc}
                    alt={listing.title}
                    className="object-cover group-hover:scale-105 transition duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 300px"
                  />
                  <div className="absolute top-3 start-3 z-10 bg-black/60 text-white text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-xs">
                    {listing.category}
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <h4
                      onClick={() => router.push(`/listings/${listing.id}`)}
                      className="text-base font-bold text-neutral-900 line-clamp-1 hover:underline cursor-pointer"
                    >
                      {listing.title}
                    </h4>
                    <p className="text-xs text-neutral-500 mt-1">
                      {listing.guestCount} {listing.guestCount === 1 ? tCommon("guest") : tCommon("guests")} ·{" "}
                      {listing.roomCount} {listing.roomCount === 1 ? tCommon("room") : tCommon("rooms")} ·{" "}
                      {listing.bathroomCount} {listing.bathroomCount === 1 ? tCommon("bathroom") : tCommon("bathrooms")}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-neutral-100 flex items-baseline gap-1">
                    <span className="text-base font-bold text-neutral-900">${listing.price}</span>
                    <span className="text-xs text-neutral-500">/ {tCommon("night")}</span>
                  </div>

                  {/* Actions */}
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/listings/${listing.id}`)}
                      className="flex-1 py-2 px-3 rounded-xl border border-neutral-300 hover:border-neutral-900 text-xs font-semibold text-neutral-800 transition cursor-pointer text-center"
                    >
                      {t("viewProperty")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedForDelete(listing)}
                      className="py-2 px-3 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition cursor-pointer"
                    >
                      {t("deleteAction")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {selectedForDelete && (
          <div
            onClick={() => setSelectedForDelete(null)}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 cursor-default"
            >
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                <h3 className="font-bold text-base text-neutral-900">{t("deleteModalTitle")}</h3>
                <button
                  type="button"
                  onClick={() => setSelectedForDelete(null)}
                  className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
                >
                  <MdClose size={20} />
                </button>
              </div>

              <div className="py-4">
                <p className="text-sm text-neutral-600 leading-relaxed">
                  {t("deleteModalDesc", { title: selectedForDelete.title })}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setSelectedForDelete(null)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
                >
                  {t("keepListing")}
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={onConfirmDelete}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? tCommon("loading") : t("confirmDelete")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}
