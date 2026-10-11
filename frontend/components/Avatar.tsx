"use client";

import Image from "next/image";

interface AvatarProps {
  src?: string | null;
  size?: number;
}

export default function Avatar({ src, size = 30 }: AvatarProps) {
  return (
    <div
      style={{ width: `${size}px`, height: `${size}px` }}
      className="relative rounded-full overflow-hidden border border-tertiary bg-neutral-100 shrink-0"
    >
      <Image
        className="object-cover"
        src={src || "/assets/avatar.png"}
        alt="Avatar"
        fill
      />
    </div>
  );
}
