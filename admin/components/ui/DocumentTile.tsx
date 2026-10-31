"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { FileText, Image as ImageIcon, CheckCircle, Eye, Download, XCircle } from "lucide-react";

export interface DocumentTileProps {
  id?: string;
  title: string;
  type?: string;
  fileName?: string;
  fileSize?: string;
  size?: string;
  status?: "valid" | "to_check" | "missing" | "rejected";
  onView?: () => void;
  onDownload?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  className?: string;
}

const iconButtonClass =
  "w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-primary/[0.06] hover:text-primary-900 transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600";

export const DocumentTile: React.FC<DocumentTileProps> = ({
  title,
  type = "document",
  fileSize,
  size,
  status = "valid",
  onView,
  onDownload,
  onApprove,
  onReject,
  className = "",
}) => {
  const t = useTranslations("uiKit.document");
  const isImage = type.toLowerCase().includes("image") || type.toLowerCase().includes("jpg") || type.toLowerCase().includes("png");
  const isValid = status === "valid";
  const isRejected = status === "rejected";
  const displaySize = fileSize || size;

  return (
    <div
      className={`relative p-3 rounded-xl flex flex-col justify-between transition-shadow duration-fast ease-standard group ${
        isRejected ? "bg-accent-50 ring-1 ring-inset ring-accent-200" : "bg-white shadow-e1 hover:shadow-e2"
      } ${className}`}
    >
      {/* Status indicator badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-primary/[0.05] flex items-center justify-center shrink-0 text-primary-600 group-hover:bg-darnaBg-300 group-hover:text-primary-900 transition-colors duration-fast">
          {isImage ? <ImageIcon className="w-4 h-4" aria-hidden="true" /> : <FileText className="w-4 h-4" aria-hidden="true" />}
        </div>
        {isValid ? (
          <span className="w-5 h-5 rounded-full bg-secondary-700 text-white flex items-center justify-center">
            <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="sr-only">{t("valid")}</span>
          </span>
        ) : isRejected ? (
          <span className="w-5 h-5 rounded-full bg-accent-600 text-white flex items-center justify-center">
            <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="sr-only">{t("rejected")}</span>
          </span>
        ) : (
          <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
            {status === "missing" ? t("missing") : t("toCheck")}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0">
        <h4 className="text-xs font-semibold text-primary-900 truncate leading-tight">{title}</h4>
        <p className="text-[11px] text-primary-600 mt-0.5 truncate">
          {type} {displaySize ? `· ${displaySize}` : ""}
        </p>
      </div>

      {/* Quick Action Icons */}
      <div className="mt-2.5 pt-2 border-t border-primary/[0.06] flex items-center justify-between text-primary-600">
        <div className="flex items-center gap-1.5">
          {onView && (
            <button
              type="button"
              onClick={onView}
              className={iconButtonClass}
              title={t("preview", { title })}
              aria-label={t("preview", { title })}
            >
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className={iconButtonClass}
              title={t("download", { title })}
              aria-label={t("download", { title })}
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>

        {(onApprove || onReject) && (
          <div className="flex items-center gap-1">
            {onApprove && (
              <button
                type="button"
                onClick={onApprove}
                className="px-2 py-0.5 rounded text-[11px] font-semibold text-secondary-800 hover:bg-secondary/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
              >
                {t("approve")}
              </button>
            )}
            {onReject && (
              <button
                type="button"
                onClick={onReject}
                className="px-2 py-0.5 rounded text-[11px] font-semibold text-accent-700 hover:bg-accent/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-600"
              >
                {t("reject")}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
