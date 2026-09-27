"use client";

import React, { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { FiSend, FiPaperclip, FiSmile } from "react-icons/fi";

interface Props {
  onSendMessage: (text: string) => void;
  disabled?: boolean;
  initialValue?: string;
}

export default function MessageComposer({
  onSendMessage,
  disabled = false,
  initialValue = "",
}: Props) {
  const t = useTranslations("messages");
  const [content, setContent] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync initialValue if changed from parent
  useEffect(() => {
    if (initialValue) {
      setContent(initialValue);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  }, [initialValue]);

  // Auto-resize textarea height (up to max 120px)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [content]);

  const handleSend = () => {
    if (!content.trim() || disabled) return;
    onSendMessage(content.trim());
    setContent("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = Boolean(content.trim()) && !disabled;

  return (
    <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-md border-t border-neutral-200 p-3 sm:p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
      <div className="flex items-end gap-2 bg-neutral-100/90 hover:bg-neutral-100 focus-within:bg-white focus-within:ring-2 focus-within:ring-neutral-900 border border-neutral-200 rounded-3xl p-1.5 sm:p-2 transition-all">
        {/* Mock Attachment Icon Button */}
        <button
          type="button"
          aria-label={t("attach")}
          title={t("attach")}
          className="w-8 h-8 rounded-full text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/60 flex items-center justify-center transition cursor-pointer flex-shrink-0 mb-0.5"
        >
          <FiPaperclip size={17} />
        </button>

        {/* Auto-expanding Textarea */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("typeMessage")}
          className="flex-1 bg-transparent text-sm text-neutral-900 placeholder-neutral-500 focus:outline-none resize-none py-1.5 px-1 max-h-[120px] overflow-y-auto leading-normal"
        />

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label={t("send")}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 flex-shrink-0 cursor-pointer ${
            canSend
              ? "bg-accent hover:bg-accent-600 active:bg-accent-700 text-white shadow-xs hover:scale-105 active:scale-95"
              : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
          }`}
        >
          <FiSend size={16} className="rtl:rotate-180 -me-0.5" />
        </button>
      </div>
    </div>
  );
}
