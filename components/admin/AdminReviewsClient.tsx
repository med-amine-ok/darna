"use client";

import React, { useState, useMemo } from "react";
import { SafeReview } from "@/types";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  MdStar,
  MdCheckCircle,
  MdFlag,
  MdDeleteOutline,
  MdSearch,
} from "react-icons/md";
import { toast } from "react-toastify";

interface Props {
  initialReviews: SafeReview[];
}

export default function AdminReviewsClient({ initialReviews }: Props) {
  const t = useTranslations("admin");
  const [reviews, setReviews] = useState<SafeReview[]>(initialReviews);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const matchSearch =
        r.comment.toLowerCase().includes(search.toLowerCase()) ||
        (r.user?.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (r.listing?.title || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        statusFilter === "all" || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [reviews, search, statusFilter]);

  const handleUpdateStatus = (
    id: string,
    newStatus: "published" | "pending" | "flagged"
  ) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
    toast.success(t("reviewUpdated"));
  };

  const handleDelete = (id: string) => {
    if (!confirm(t("confirmDeleteReview"))) return;
    setReviews((prev) => prev.filter((r) => r.id !== id));
    toast.info(t("reviewDeleted"));
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <MdSearch
            size={20}
            className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full ps-10 pe-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm outline-none focus:border-neutral-900 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {["all", "published", "pending", "flagged"].map((status) => {
            const label =
              status === "all"
                ? t("statusAll")
                : status === "published"
                ? t("statusPublished")
                : status === "pending"
                ? t("statusPending")
                : t("statusFlagged");

            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition cursor-pointer whitespace-nowrap ${
                  statusFilter === status
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Reviews Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredReviews.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-2xl border border-neutral-200 text-center text-neutral-400">
            {t("noData")}
          </div>
        ) : (
          filteredReviews.map((review) => {
            const statusBadgeColor =
              review.status === "published"
                ? "bg-status-success/15 text-status-success border-status-success/20"
                : review.status === "flagged"
                ? "bg-status-error/15 text-status-error border-status-error/20"
                : "bg-status-warning/15 text-status-warning border-status-warning/20";

            const localizedStatus =
              review.status === "published"
                ? t("statusPublished")
                : review.status === "flagged"
                ? t("statusFlagged")
                : t("statusPending");

            return (
              <div
                key={review.id}
                className="bg-white p-5 rounded-2xl border border-tertiary shadow-2xs flex flex-col justify-between space-y-4 hover:shadow-xs transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-neutral-100">
                        <Image
                          src={
                            review.user?.image ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              review.user?.name || "Guest"
                            )}`
                          }
                          alt={review.user?.name || "Reviewer"}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-900 text-sm">
                          {review.user?.name || "Guest Reviewer"}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {review.listing?.title || "Listing"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${statusBadgeColor}`}
                    >
                      {localizedStatus}
                    </span>
                  </div>

                  {/* Rating Stars */}
                  <div className="flex items-center gap-1 mt-3 text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <MdStar
                        key={i}
                        size={16}
                        className={
                          i < review.rating ? "text-amber-400" : "text-neutral-200"
                        }
                      />
                    ))}
                    <span className="text-xs font-bold text-neutral-700 ms-1.5">
                      {review.rating}.0
                    </span>
                  </div>

                  <p className="text-sm text-neutral-600 mt-2.5 leading-relaxed line-clamp-3">
                    &ldquo;{review.comment}&rdquo;
                  </p>
                </div>

                {/* Moderation Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-neutral-100 text-xs">
                  <span className="text-neutral-400">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    {review.status !== "published" && (
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateStatus(review.id, "published")
                        }
                        className="flex items-center gap-1 px-2.5 py-1 font-semibold text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                      >
                        <MdCheckCircle size={15} />
                        <span>{t("approve")}</span>
                      </button>
                    )}
                    {review.status !== "flagged" && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(review.id, "flagged")}
                        className="flex items-center gap-1 px-2.5 py-1 font-semibold text-status-warning hover:bg-status-warning/10 rounded-lg transition cursor-pointer"
                      >
                        <MdFlag size={15} />
                        <span>{t("flag")}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(review.id)}
                      className="flex items-center gap-1 px-2.5 py-1 font-semibold text-status-error hover:bg-status-error/10 rounded-lg transition cursor-pointer"
                    >
                      <MdDeleteOutline size={15} />
                      <span>{t("delete")}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
