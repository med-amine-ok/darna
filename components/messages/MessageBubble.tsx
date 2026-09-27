"use client";

import React, { useState } from "react";
import { ChatMessage, SafeUser } from "@/types";
import Avatar from "../Avatar";

interface Props {
  message: ChatMessage;
  isSentByMe: boolean;
  sender?: SafeUser | null;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  showTimeGapHeader?: boolean;
}

export default function MessageBubble({
  message,
  isSentByMe,
  sender,
  isFirstInGroup = true,
  isLastInGroup = true,
  showTimeGapHeader = false,
}: Props) {
  const [showTimestamp, setShowTimestamp] = useState(false);

  // Format timestamp
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const formatDateHeader = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return `Today ${formatTime(dateStr)}`;
    return d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="w-full flex flex-col">
      {/* Optional Natural Time Gap Header */}
      {showTimeGapHeader && (
        <div className="flex justify-center my-3 select-none">
          <span className="text-[11px] font-medium text-neutral-400 bg-neutral-100/80 px-2.5 py-0.5 rounded-full">
            {formatDateHeader(message.createdAt)}
          </span>
        </div>
      )}

      {/* Bubble Row */}
      <div
        className={`flex items-end gap-2 w-full ${
          isSentByMe ? "justify-end" : "justify-start"
        } ${isLastInGroup ? "mb-2" : "mb-1"}`}
        onMouseEnter={() => setShowTimestamp(true)}
        onMouseLeave={() => setShowTimestamp(false)}
      >
        {/* Leading Avatar for Received Messages (only on last in consecutive group or first) */}
        {!isSentByMe && (
          <div className="w-7 h-7 flex-shrink-0">
            {isLastInGroup ? (
              <Avatar
                src={sender?.image}
                userName={sender?.name}
                size={28}
                className="rounded-full ring-1 ring-black/5"
              />
            ) : (
              <div className="w-7 h-7" />
            )}
          </div>
        )}

        {/* Message Bubble Container */}
        <div className="flex flex-col max-w-[78%] sm:max-w-[440px]">
          <div
            className={`px-4 py-2.5 text-sm leading-relaxed break-words shadow-2xs transition-all duration-150 ${
              isSentByMe
                ? "bg-neutral-900 text-white rounded-2xl rounded-br-xs self-end"
                : "bg-neutral-100 text-neutral-900 rounded-2xl rounded-bl-xs self-start"
            }`}
          >
            {message.content}
          </div>

          {/* Micro Timestamp on Hover */}
          {showTimestamp && (
            <span
              className={`text-[10px] text-neutral-400 mt-1 select-none animate-in fade-in duration-150 ${
                isSentByMe ? "text-end pe-1" : "text-start ps-1"
              }`}
            >
              {formatTime(message.createdAt)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
