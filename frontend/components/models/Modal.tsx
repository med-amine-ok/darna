"use client";

import React, { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import Button from "@/components/Button";

interface ModalProps {
  isOpen?: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title?: string;
  body?: React.ReactElement;
  footer?: React.ReactElement;
  actionLabel: string;
  disabled?: boolean;
  secondaryAction?: () => void;
  secondaryActionLabel?: string;
}

export default function Modal({
  isOpen,
  onClose,
  onSubmit,
  title,
  body,
  actionLabel,
  footer,
  disabled,
  secondaryAction,
  secondaryActionLabel,
}: ModalProps) {
  const [showModal, setShowModal] = useState(isOpen);

  useEffect(() => {
    setShowModal(isOpen);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    if (disabled) return;
    setShowModal(false);
    setTimeout(() => {
      onClose();
    }, 300);
  }, [disabled, onClose]);

  const handleSubmit = useCallback(() => {
    if (disabled) return;
    onSubmit();
  }, [onSubmit, disabled]);

  const handleSecondAction = useCallback(() => {
    if (disabled || !secondaryAction) return;
    secondaryAction();
  }, [disabled, secondaryAction]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || "Dialog"}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
      className="justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 z-[60] outline-none focus:outline-none bg-neutral-900/60 backdrop-blur-xs transition-opacity cursor-pointer p-0 sm:p-4"
    >
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleClose();
          }
        }}
        className="relative w-full sm:w-11/12 md:w-4/5 lg:w-3/5 xl:max-w-2xl my-0 sm:my-6 mx-auto h-full sm:h-auto flex flex-col justify-end sm:justify-center cursor-default"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className={`transition-all duration-300 h-full sm:h-auto flex flex-col justify-end sm:justify-center ${
            showModal
              ? "translate-y-0 opacity-100 scale-100"
              : "translate-y-full sm:translate-y-4 opacity-0 scale-95"
          }`}
        >
          <div className="h-full sm:h-auto border border-tertiary/40 sm:rounded-3xl shadow-darna-modal relative flex flex-col w-full bg-white outline-none focus:outline-none overflow-hidden max-h-[100dvh] sm:max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center px-6 py-4 rounded-t justify-center relative border-b border-tertiary/40 flex-shrink-0 bg-white">
              <button
                type="button"
                aria-label="Close"
                className="w-9 h-9 flex items-center justify-center border-0 hover:bg-neutral-100 rounded-full transition absolute start-4 text-neutral-600 hover:text-primary cursor-pointer touch-manipulation btn-press z-10"
                onClick={handleClose}
              >
                <X size={18} strokeWidth={2.2} />
              </button>
              <div className="text-base sm:text-lg font-bold text-primary px-10 text-center truncate max-w-full">{title}</div>
            </div>

            {/* Body */}
            <div className="relative p-5 sm:p-6 flex-1 overflow-y-auto max-h-[calc(100dvh-130px)] sm:max-h-[65vh]">
              {body}
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-2 p-5 sm:p-6 border-t border-tertiary/40 flex-shrink-0 bg-white">
              <div className="flex flex-row items-center gap-3 w-full">
                {secondaryAction && secondaryActionLabel && (
                  <Button
                    outline
                    disabled={disabled}
                    label={secondaryActionLabel}
                    onClick={handleSecondAction}
                  />
                )}
                <Button
                  disabled={disabled}
                  label={actionLabel}
                  onClick={handleSubmit}
                />
              </div>
              {footer}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
