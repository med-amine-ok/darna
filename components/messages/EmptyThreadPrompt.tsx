"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { FiMessageSquare } from "react-icons/fi";
import { SafeUser } from "@/types";
import Avatar from "../Avatar";

interface Props {
  otherUser?: SafeUser | null;
  onSelectOpener: (opener: string) => void;
}

export default function EmptyThreadPrompt({ otherUser, onSelectOpener }: Props) {
  const t = useTranslations("messages");

  const openers = [
    t("openerStay"),
    t("openerCheckIn"),
    t("openerDirections"),
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center my-auto select-none">
      <div className="relative mb-3">
        <Avatar
          src={otherUser?.image}
          userName={otherUser?.name}
          size={64}
          className="rounded-full ring-2 ring-neutral-200"
        />
        <div className="absolute -bottom-1 -end-1 w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-xs">
          <FiMessageSquare size={13} />
        </div>
      </div>

      <h3 className="text-base sm:text-lg font-bold text-neutral-900">
        {t("emptyThreadTitle", { name: otherUser?.name || "Host" })}
      </h3>
      <p className="text-xs text-neutral-500 mt-1 max-w-xs">
        Send a message to start planning your stay or asking questions.
      </p>

      {/* Suggested Openers */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-5 max-w-md">
        {openers.map((opener, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectOpener(opener)}
            className="text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200/90 hover:text-neutral-900 px-3.5 py-2 rounded-full border border-neutral-200/70 transition-all cursor-pointer text-start"
          >
            &ldquo;{opener}&rdquo;
          </button>
        ))}
      </div>
    </div>
  );
}
