"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import { MdChevronLeft, MdMoreVert, MdCheckCircle } from "react-icons/md";
import { FiExternalLink, FiArchive, FiBellOff } from "react-icons/fi";
import { Conversation, SafeUser } from "@/types";
import Avatar from "../Avatar";

interface Props {
  conversation: Conversation;
  currentUser?: SafeUser | null;
  onBack?: () => void;
  showBackChevron?: boolean;
}

export default function MessageThreadHeader({
  conversation,
  currentUser,
  onBack,
  showBackChevron = false,
}: Props) {
  const router = useRouter();
  const t = useTranslations("messages");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const otherUser =
    conversation.participants.find((p) => p.id !== currentUser?.id) ||
    conversation.participants[0] || {
      id: "unknown",
      name: "Host",
      image: null,
    };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  return (
    <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-neutral-200 px-4 py-3 flex items-center justify-between gap-3 flex-shrink-0 select-none">
      {/* Left: Back button (on mobile) + Avatar & User info */}
      <div className="flex items-center gap-2.5 min-w-0">
        {showBackChevron && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to conversations"
            className="md:hidden w-8 h-8 -ms-1 rounded-full hover:bg-neutral-100 flex items-center justify-center text-neutral-800 transition cursor-pointer"
          >
            <MdChevronLeft size={24} className="rtl:rotate-180" />
          </button>
        )}

        <div className="relative">
          <Avatar
            src={otherUser.image}
            userName={otherUser.name}
            size={40}
            className="rounded-full ring-1 ring-black/5"
          />
          <span className="absolute bottom-0 end-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
        </div>

        <div className="min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-neutral-900 truncate flex items-center gap-1.5">
            <span>{otherUser.name}</span>
            {conversation.category === "support" && (
              <span className="text-[10px] bg-neutral-900 text-white font-semibold px-1.5 py-0.5 rounded-sm">
                Support
              </span>
            )}
          </h2>
          <p className="text-xs text-neutral-500 truncate">
            {conversation.reservationDetails?.status ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                <MdCheckCircle size={13} />
                <span>{conversation.reservationDetails.status}</span>
                {conversation.reservationDetails.startDate && (
                  <span className="text-neutral-500 font-normal">
                    · {conversation.reservationDetails.startDate}
                  </span>
                )}
              </span>
            ) : (
              <span>Host</span>
            )}
          </p>
        </div>
      </div>

      {/* Right: Pinned Related Listing Mini-Card & Menu */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Pinned Listing Mini-Card */}
        {conversation.listing && (
          <div
            onClick={() => router.push(`/listings/${conversation.listing?.id}`)}
            className="hidden sm:flex items-center gap-2.5 p-1.5 pe-3 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 rounded-xl transition cursor-pointer group"
          >
            <div className="relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-200">
              <Image
                src={conversation.listing.imageSrc}
                alt={conversation.listing.title}
                fill
                className="object-cover group-hover:scale-105 transition"
                sizes="36px"
              />
            </div>
            <div className="flex flex-col text-start">
              <span className="text-xs font-bold text-neutral-900 line-clamp-1 max-w-[140px] md:max-w-[180px]">
                {conversation.listing.title}
              </span>
              <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                <span>${conversation.listing.price}/night</span>
                <FiExternalLink size={10} className="text-neutral-400" />
              </span>
            </div>
          </div>
        )}

        {/* Options Dropdown Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label="Conversation options"
            className="w-9 h-9 rounded-full hover:bg-neutral-100 text-neutral-700 flex items-center justify-center transition cursor-pointer"
          >
            <MdMoreVert size={20} />
          </button>

          {isMenuOpen && (
            <div className="absolute top-full end-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-neutral-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs text-neutral-700">
              {conversation.listing && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    router.push(`/listings/${conversation.listing?.id}`);
                  }}
                  className="w-full text-start px-3.5 py-2 hover:bg-neutral-50 flex items-center gap-2 cursor-pointer"
                >
                  <FiExternalLink size={14} />
                  <span>{t("viewListing")}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="w-full text-start px-3.5 py-2 hover:bg-neutral-50 flex items-center gap-2 cursor-pointer"
              >
                <FiArchive size={14} />
                <span>{t("archive")}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsMenuOpen(false)}
                className="w-full text-start px-3.5 py-2 hover:bg-neutral-50 flex items-center gap-2 cursor-pointer"
              >
                <FiBellOff size={14} />
                <span>{t("mute")}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
