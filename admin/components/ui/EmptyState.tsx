"use client";

import React from "react";
import { FolderOpen, SearchX } from "lucide-react";
import { Button } from "./Button";

export interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => {
  return (
    <div
      className={`animate-pulse rounded-xl bg-tertiary/25 ${className}`}
    />
  );
};

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  type?: "filter" | "empty";
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  type = "empty",
  className = "",
}) => {
  return (
    <div
      className={`py-12 px-4 flex flex-col items-center justify-center text-center rounded-3xl border border-dashed border-tertiary/80 bg-white/60 p-8 ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-tertiary/30 border border-tertiary/50 flex items-center justify-center text-primary/70 mb-3.5">
        {type === "filter" ? (
          <SearchX className="w-6 h-6 stroke-[1.5]" />
        ) : (
          <FolderOpen className="w-6 h-6 stroke-[1.5]" />
        )}
      </div>
      <h3 className="text-base font-serif font-black text-primary">{title}</h3>
      <p className="text-xs text-neutral-500 max-w-sm mt-1.5 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
