"use client";

import React from "react";
import Image from "next/image";
import { Conversation, SafeUser } from "@/types";
import Avatar from "../Avatar";

interface Props {
  conversation: Conversation;
  currentUser?: SafeUser | null;
  isSelected?: boolean;
  onClick: () => void;
}

export default function ConversationListItem({
  conversation,
  currentUser,
  isSelected = false,
  onClick,
}: Props) {
  // Determine the other party
  const otherUser =
    conversation.participants.find((p) => p.id !== currentUser?.id) ||
    conversation.participants[0] || {
      name: "DARNA Host",
      image: null,
    };

  const isUnread = (conversation.unreadCount || 0) > 0;

  // Format relative timestamp
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const lastPreview = conversation.lastMessage?.content || "No messages yet";

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className={`w-full px-4 py-3.5 flex items-center gap-3 cursor-pointer transition-colors duration-150 border-b border-neutral-100/90 select-none ${
        isSelected
          ? "bg-neutral-100/90 hover:bg-neutral-100"
          : isUnread
          ? "bg-neutral-50/70 hover:bg-neutral-100/60"
          : "hover:bg-neutral-50"
      }`}
    >
      {/* 1. Leading Avatar (~48px) */}
      <div className="relative flex-shrink-0">
        <Avatar
          src={otherUser.image}
          userName={otherUser.name}
          size={48}
          className="rounded-full ring-1 ring-black/5"
        />
        {/* Support Badge / Online indicator if applicable */}
        {conversation.category === "support" && (
          <span className="absolute -bottom-1 -end-1 w-4 h-4 bg-accent text-white rounded-full flex items-center justify-center text-[9px] font-bold shadow-xs">
            ★
          </span>
        )}
      </div>

      {/* 2. Middle: Name, Last Message, Thumbnail Chip */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
        {/* First Line: Name + Timestamp */}
        <div className="flex items-center justify-between gap-1">
          <span
            className={`truncate text-sm ${
              isUnread ? "font-bold text-neutral-900" : "font-semibold text-neutral-800"
            }`}
          >
            {otherUser.name}
          </span>
          <span
            className={`text-xs flex-shrink-0 ${
              isUnread ? "font-bold text-accent" : "text-neutral-500 font-normal"
            }`}
          >
            {formatTime(conversation.lastMessageAt || conversation.lastMessage?.createdAt)}
          </span>
        </div>

        {/* Second Line: Preview Text & Attached Listing Thumbnail Chip */}
        <div className="flex items-center justify-between gap-2">
          <p
            className={`text-xs truncate flex-1 ${
              isUnread ? "font-semibold text-neutral-900" : "text-neutral-500 font-normal"
            }`}
          >
            {lastPreview}
          </p>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Listing Thumbnail Chip */}
            {conversation.listing && (
              <div
                title={conversation.listing.title}
                className="w-6 h-6 rounded-md overflow-hidden bg-neutral-200 border border-neutral-200/80 relative"
              >
                <Image
                  src={conversation.listing.imageSrc}
                  alt={conversation.listing.title}
                  fill
                  className="object-cover"
                  sizes="24px"
                />
              </div>
            )}

            {/* Unread indicator dot */}
            {isUnread && (
              <span className="w-2.5 h-2.5 rounded-full bg-accent flex-shrink-0 animate-in zoom-in duration-200" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
