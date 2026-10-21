"use client";

import React, { useState } from "react";
import Image from "next/image";
import { AdminReview, updateReviewStatus } from "@/lib/data/admin";
import { toast } from "react-toastify";
import ConfirmDialog from "@/components/models/ConfirmDialog";
import {
  BrandCheckCircleIcon,
  BrandFlagIcon,
  BrandTrashIcon,
  BrandExclamationIcon,
  BrandMoreIcon,
  BrandStarIcon,
} from "@/components/icons";

interface AdminReviewsClientProps {
  initialReviews: AdminReview[];
}

export default function AdminReviewsClient({ initialReviews }: AdminReviewsClientProps) {
  const [reviews, setReviews] = useState<AdminReview[]>(initialReviews);
  const [statusFilter, setStatusFilter] = useState("all");
  const [openKebabId, setOpenKebabId] = useState<string | null>(null);
  const [reviewToRemove, setReviewToRemove] = useState<AdminReview | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const filtered = reviews.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  });

  const handleUpdateStatus = async (id: string, newStatus: AdminReview["status"]) => {
    try {
      const updated = await updateReviewStatus(id, newStatus);
      if (updated) {
        setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
        toast.info(`Review marked as ${newStatus}.`);
      }
    } catch {
      toast.error("Failed to moderate review.");
    }
  };

  const executeRemoveReview = async () => {
    if (!reviewToRemove) return;
    setIsRemoving(true);
    try {
      const updated = await updateReviewStatus(reviewToRemove.id, "removed");
      if (updated) {
        setReviews((prev) => prev.map((r) => (r.id === reviewToRemove.id ? { ...r, status: "removed" } : r)));
        toast.info("Review removed from public marketplace.");
      }
    } catch {
      toast.error("Failed to remove review.");
    } finally {
      setIsRemoving(false);
      setReviewToRemove(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">
            Reviews & Feedback Moderation
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 mt-1">
            Ensure integrity and authentic traveler feedback across Algerian accommodations.
          </p>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-tertiary/70 shadow-2xs">
          {["all", "published", "flagged", "removed"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition ${
                statusFilter === s
                  ? "bg-primary text-white shadow-2xs"
                  : "text-neutral-600 hover:text-primary"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Reviews Table */}
      <div className="bg-white rounded-3xl border border-tertiary/70 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-neutral-50 border-b border-tertiary/60 text-neutral-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 text-start">Author & Date</th>
                <th className="py-3 px-4 text-start">Listing</th>
                <th className="py-3 px-4 text-start">Rating</th>
                <th className="py-3 px-4 text-start">Review Comment</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-end">Moderate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tertiary/40">
              {filtered.map((rev) => (
                <tr key={rev.id} className="hover:bg-neutral-50/60 transition">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="relative w-7 h-7 rounded-full overflow-hidden bg-neutral-200 shrink-0">
                        <Image src={rev.authorAvatar} alt={rev.authorName} fill className="object-cover" />
                      </div>
                      <div>
                        <div className="font-bold text-primary">{rev.authorName}</div>
                        <div className="text-[10px] text-neutral-400">
                          {new Date(rev.createdAt).toLocaleDateString("fr-DZ")}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-semibold text-primary truncate max-w-[180px]">
                    {rev.listingTitle}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1 font-bold text-neutral-800">
                      <BrandStarIcon size={13} className="text-accent fill-accent" />
                      <span>{rev.rating}.0</span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-neutral-700 max-w-xs">
                    <p className="line-clamp-2 leading-relaxed">{rev.comment}</p>
                    {rev.flagReason && (
                      <div className="mt-1 text-[10px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 flex items-center gap-1">
                        <BrandExclamationIcon size={12} />
                        <span>{rev.flagReason}</span>
                      </div>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        rev.status === "published"
                          ? "bg-emerald-100 text-emerald-800"
                          : rev.status === "flagged"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {rev.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-end">
                    <div className="flex items-center justify-end gap-1.5">
                      {rev.status !== "published" && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(rev.id, "published")}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
                          title="Approve & Publish"
                        >
                          <BrandCheckCircleIcon size={14} />
                          <span>Publish</span>
                        </button>
                      )}

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenKebabId(openKebabId === rev.id ? null : rev.id)}
                          className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-600 transition"
                          title="More actions"
                        >
                          <BrandMoreIcon size={16} />
                        </button>

                        {openKebabId === rev.id && (
                          <div className="absolute end-0 top-8 w-44 bg-white rounded-2xl shadow-darna-dropdown border border-tertiary/70 py-1.5 z-40 text-xs text-neutral-700 animate-in fade-in">
                            {rev.status !== "flagged" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenKebabId(null);
                                  handleUpdateStatus(rev.id, "flagged");
                                }}
                                className="w-full text-start px-3.5 py-2 hover:bg-neutral-50 flex items-center gap-2 font-semibold text-amber-700"
                              >
                                <BrandFlagIcon size={14} />
                                <span>Flag Review</span>
                              </button>
                            )}

                            {rev.status !== "removed" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenKebabId(null);
                                  setReviewToRemove(rev);
                                }}
                                className="w-full text-start px-3.5 py-2 hover:bg-rose-50 flex items-center gap-2 font-semibold text-rose-600"
                              >
                                <BrandTrashIcon size={14} />
                                <span>Remove Review</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Remove Review Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!reviewToRemove}
        variant="destructive"
        title="Remove Traveler Review"
        message={
          reviewToRemove
            ? `Are you sure you want to remove the review by ${reviewToRemove.authorName} ("${reviewToRemove.listingTitle}")? It will no longer be visible on public listing pages or count towards the host's overall rating.`
            : ""
        }
        confirmLabel="Remove review"
        cancelLabel="Keep review"
        isLoading={isRemoving}
        onConfirm={executeRemoveReview}
        onCancel={() => setReviewToRemove(null)}
      />
    </div>
  );
}
