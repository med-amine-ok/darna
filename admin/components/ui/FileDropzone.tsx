"use client";

import React, { useRef } from "react";
import { UploadCloud, Image as ImageIcon, Plus, X } from "lucide-react";

export interface FileDropzoneProps {
  label?: string;
  sublabel?: string;
  hint?: string;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  files?: string[];
  onChange?: (files: string[]) => void;
  onFileSelect?: (file: File) => void;
  className?: string;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  label = "Téléverser des fichiers",
  sublabel,
  hint,
  accept = "image/*",
  multiple = true,
  maxFiles = 20,
  files = [],
  onChange,
  onFileSelect,
  className = "",
}) => {
  const displayHint = hint || sublabel || "PNG, JPG ou PDF jusqu'à 10 Mo";
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (onFileSelect) {
        onFileSelect(e.target.files[0]);
      }
      const newUrls = Array.from(e.target.files).map((f) => URL.createObjectURL(f));
      if (onChange) {
        onChange([...files, ...newUrls].slice(0, maxFiles));
      }
    }
  };

  const handleRemove = (idxToRemove: number) => {
    if (onChange) {
      onChange(files.filter((_, idx) => idx !== idxToRemove));
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Upload Zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="p-5 rounded-2xl border-2 border-dashed border-tertiary-300 hover:border-secondary bg-neutral-50/60 hover:bg-neutral-50 flex flex-col items-center justify-center text-center cursor-pointer transition group"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="w-10 h-10 rounded-xl bg-white border border-tertiary-200/80 flex items-center justify-center text-secondary group-hover:scale-105 transition shadow-2xs mb-2">
          <UploadCloud className="w-5 h-5" />
        </div>
        <span className="text-xs font-bold text-primary">{label}</span>
        <span className="text-[11px] text-neutral-400 mt-0.5">{displayHint}</span>
      </div>

      {/* Thumbnails preview strip */}
      {files.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {files.map((fileUrl, idx) => (
            <div
              key={idx}
              className="relative aspect-video rounded-xl overflow-hidden border border-tertiary-200 bg-neutral-100 group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fileUrl}
                alt={`Photo ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(idx);
                }}
                className="absolute top-1 end-1 w-5 h-5 rounded-full bg-black/60 text-white hover:bg-accent flex items-center justify-center transition cursor-pointer"
                aria-label="Supprimer la photo"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {/* Add more button */}
          {files.length < maxFiles && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="aspect-video rounded-xl border border-dashed border-tertiary-300 hover:border-secondary bg-white hover:bg-neutral-50 flex flex-col items-center justify-center text-neutral-500 hover:text-primary transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[10px] font-bold mt-1">Ajouter</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
