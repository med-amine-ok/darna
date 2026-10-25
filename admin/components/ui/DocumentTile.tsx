"use client";

import React from "react";
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

export const DocumentTile: React.FC<DocumentTileProps> = ({
  id = "doc",
  title,
  type = "document",
  fileName,
  fileSize,
  size,
  status = "valid",
  onView,
  onDownload,
  onApprove,
  onReject,
  className = "",
}) => {
  const isImage = type.toLowerCase().includes("image") || type.toLowerCase().includes("jpg") || type.toLowerCase().includes("png");
  const isValid = status === "valid";
  const isRejected = status === "rejected";

  return (
    <div
      className={`relative p-3 rounded-xl border bg-white flex flex-col justify-between transition-all group ${
        isValid
          ? "border-secondary/30 hover:border-secondary shadow-2xs"
          : isRejected
          ? "border-accent/40 bg-accent/5"
          : "border-tertiary-200 hover:border-tertiary-300"
      } ${className}`}
    >
      {/* Status indicator badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 text-neutral-600 group-hover:bg-primary-50 group-hover:text-primary transition">
          {isImage ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
        </div>
        {isValid ? (
          <span className="w-4 h-4 rounded-full bg-secondary text-white flex items-center justify-center">
            <CheckCircle className="w-3.5 h-3.5" />
          </span>
        ) : isRejected ? (
          <span className="w-4 h-4 rounded-full bg-accent text-white flex items-center justify-center">
            <XCircle className="w-3.5 h-3.5" />
          </span>
        ) : (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
            À vérifier
          </span>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0">
        <h4 className="text-xs font-bold text-primary truncate leading-tight">{title}</h4>
        <p className="text-[10px] text-neutral-400 mt-0.5 truncate">
          {type} {(fileSize || size) ? `· ${fileSize || size}` : ""}
        </p>
      </div>

      {/* Quick Action Icons */}
      <div className="mt-2.5 pt-2 border-t border-neutral-100 flex items-center justify-between text-neutral-500">
        <div className="flex items-center gap-1.5">
          {onView && (
            <button
              type="button"
              onClick={onView}
              className="p-1 rounded-md hover:bg-neutral-100 hover:text-primary transition"
              title="Aperçu"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}
          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="p-1 rounded-md hover:bg-neutral-100 hover:text-primary transition"
              title="Télécharger"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {(onApprove || onReject) && (
          <div className="flex items-center gap-1">
            {onApprove && (
              <button
                type="button"
                onClick={onApprove}
                className="px-2 py-0.5 rounded text-[10px] font-bold text-secondary hover:bg-secondary/10 transition"
              >
                Valider
              </button>
            )}
            {onReject && (
              <button
                type="button"
                onClick={onReject}
                className="px-2 py-0.5 rounded text-[10px] font-bold text-accent hover:bg-accent/10 transition"
              >
                Refuser
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
