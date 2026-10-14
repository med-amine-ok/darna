"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "@/navigation";
import { Listing } from "@/types";
import { toast } from "react-toastify";
import {
  BrandPlusIcon,
  BrandEyeIcon,
  BrandEditIcon,
  BrandTrashIcon,
  BrandPinIcon,
  BrandTrendingUpIcon,
} from "@/components/icons";
import ConfirmDialog from "@/components/common/ConfirmDialog";

interface PropertiesClientProps {
  initialListings: Listing[];
}

export default function PropertiesClient({ initialListings }: PropertiesClientProps) {
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>(initialListings);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const toggleStatus = (id: string) => {
    setListings((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          const nextStatus = l.status === "active" ? "pending" : "active";
          toast.info(
            nextStatus === "active"
              ? `Listing "${l.title}" is now active and public.`
              : `Listing "${l.title}" has been unlisted (draft).`
          );
          return { ...l, status: nextStatus };
        }
        return l;
      })
    );
  };

  const confirmDelete = () => {
    if (!deletingId) return;
    setListings((prev) => prev.filter((l) => l.id !== deletingId));
    toast.success("Listing permanently deleted.");
    setDeletingId(null);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-tertiary/50 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-primary font-serif">
            Your Listed Properties & Stays
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Manage your accommodations, desert experiences, and vehicle rentals on DARNA
          </p>
        </div>

        <Link
          href="/become-a-host/1"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/95 transition shadow-sm"
        >
          <BrandPlusIcon size={18} />
          <span>Create New Listing</span>
        </Link>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-tertiary/70 shadow-xs">
          <div className="text-xs font-semibold text-neutral-500">Total Listings</div>
          <div className="text-2xl font-bold text-primary mt-1 font-serif">
            {listings.length}
          </div>
        </div>
        <div className="p-5 bg-white rounded-2xl border border-tertiary/70 shadow-xs">
          <div className="text-xs font-semibold text-neutral-500">Active Online</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {listings.filter((l) => l.status === "active").length}
          </div>
        </div>
        <div className="p-5 bg-white rounded-2xl border border-tertiary/70 shadow-xs">
          <div className="text-xs font-semibold text-neutral-500">Total Views</div>
          <div className="text-2xl font-bold text-primary mt-1 flex items-center gap-1.5">
            <span>2,410</span>
            <BrandTrendingUpIcon size={18} className="text-emerald-600" />
          </div>
        </div>
        <div className="p-5 bg-white rounded-2xl border border-tertiary/70 shadow-xs">
          <div className="text-xs font-semibold text-neutral-500">Bookings Received</div>
          <div className="text-2xl font-bold text-primary mt-1">
            18
          </div>
        </div>
      </div>

      {/* Listing Cards Grid */}
      {listings.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-tertiary text-center max-w-md mx-auto my-6 shadow-xs">
          <h3 className="text-base font-bold text-primary">No listings yet</h3>
          <p className="text-xs text-neutral-500 mt-1 mb-6">
            Start earning by listing your spare room, villa, desert camp, or rental car on DARNA.
          </p>
          <Link
            href="/become-a-host/1"
            className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-semibold hover:bg-primary/95 transition"
          >
            List your first stay
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((item) => {
            const coverImage = item.imageSrc?.[0] || "/assets/placeholder.jpg";
            const isActive = item.status === "active";

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-tertiary overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Photo & Badge */}
                  <div className="relative aspect-video w-full overflow-hidden bg-neutral-100">
                    <Image
                      src={coverImage}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 pointer-events-none">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/90 backdrop-blur-md text-primary truncate max-w-[45%]">
                        {item.category}
                      </span>
                      <button
                        type="button"
                        onClick={() => toggleStatus(item.id)}
                        className={`pointer-events-auto px-3 py-1 rounded-full text-xs font-bold transition shadow-xs shrink-0 cursor-pointer ${
                          isActive
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"
                        }`}
                      >
                        {isActive ? "Active · Live" : "Unlisted · Draft"}
                      </button>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5 space-y-2">
                    <h3 className="font-bold text-primary text-base line-clamp-1 hover:text-accent transition">
                      <Link href={`/listings/${item.id}`}>{item.title}</Link>
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                      <BrandPinIcon size={15} className="text-secondary shrink-0" />
                      <span>{item.city}, Algeria</span>
                    </div>
                    <div className="pt-2 text-sm font-bold text-primary">
                      {item.price.toLocaleString()} DZD{" "}
                      <span className="text-xs font-normal text-neutral-500">
                        /{item.category === "vehicle" ? "day" : item.category === "experience" ? "person" : "night"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="px-5 py-3.5 bg-neutral-50 border-t border-tertiary/40 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/listings/${item.id}`}
                      className="p-2 bg-white border border-tertiary rounded-xl text-neutral-700 hover:bg-neutral-100 transition"
                      title="View Public Listing"
                    >
                      <BrandEyeIcon size={16} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => toast.info(`Editing interface for "${item.title}" will open.`)}
                      className="p-2 bg-white border border-tertiary rounded-xl text-neutral-700 hover:bg-neutral-100 transition"
                      title="Edit Listing"
                    >
                      <BrandEditIcon size={16} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDeletingId(item.id)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition"
                    title="Delete Listing"
                  >
                    <BrandTrashIcon size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!deletingId}
        title="Delete Listing"
        variant="destructive"
        confirmLabel="Delete listing"
        cancelLabel="Keep listing"
        onConfirm={confirmDelete}
        onCancel={() => setDeletingId(null)}
        message="Are you sure you want to permanently delete this listing? This action cannot be undone and will cancel any future reservations."
      />
    </div>
  );
}
