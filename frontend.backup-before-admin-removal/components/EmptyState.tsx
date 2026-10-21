"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import Button from "./Button";

interface EmptyStateProps {
  title?: string;
  subtitle?: string;
  showReset?: boolean;
  resetLabel?: string;
  resetAction?: () => void;
}

export default function EmptyState({
  title = "No exact matches",
  subtitle = "Try changing or removing some of your filters.",
  showReset,
  resetLabel = "Clear all filters",
  resetAction,
}: EmptyStateProps) {
  const router = useRouter();

  return (
    <div className="h-[60vh] flex flex-col gap-4 justify-center items-center text-center p-6">
      <div className="relative w-44 h-44 mb-2">
        <Image
          src="/assets/404-illustration.png"
          alt="No results"
          fill
          className="object-contain"
        />
      </div>
      <h3 className="text-xl font-bold text-primary">{title}</h3>
      <p className="text-neutral-500 text-sm max-w-sm">{subtitle}</p>
      {showReset && (
        <div className="w-48 mt-4">
          <Button
            outline
            label={resetLabel}
            onClick={resetAction ? resetAction : () => router.push("/")}
          />
        </div>
      )}
    </div>
  );
}
