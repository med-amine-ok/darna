"use client";

import Image from "next/image";

interface ArchImageProps {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  /** Tailwind object-position, e.g. "object-[50%_70%]". */
  objectPosition?: string;
  /** Soft shadow that follows the arch silhouette (drop-shadow on the unmasked wrapper). */
  shadow?: boolean;
}

/**
 * Photograph clipped to the Moorish arch from the DARNA logo (public/brand/arch-mask.svg).
 * The wrapper keeps the aspect ratio (4:5 by default via className) so nothing shifts while
 * the image loads; a sand placeholder cross-fades into the photo.
 */
export default function ArchImage({
  src,
  alt,
  sizes,
  priority,
  className = "aspect-[4/5]",
  objectPosition = "object-center",
  shadow = true,
}: ArchImageProps) {
  return (
    <div
      className={`relative ${className}`}
      style={shadow ? { filter: "drop-shadow(0 18px 28px rgba(30,38,31,0.18)) drop-shadow(0 2px 4px rgba(30,38,31,0.08))" } : undefined}
    >
      <div className="absolute inset-0 mask-arch bg-tertiary-200 overflow-hidden">
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={`object-cover ${objectPosition}`}
        />
      </div>
    </div>
  );
}
