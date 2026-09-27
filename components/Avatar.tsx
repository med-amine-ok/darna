"use client";

import Image from "next/image";
import React from "react";

type Props = {
  src: string | null | undefined;
  userName?: string | null | undefined;
  size?: number;
  className?: string;
};

function Avatar({ src, userName, size = 30, className = "" }: Props) {
  return (
    <div className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}>
      {src ? (
        <Image
          className="rounded-full object-cover"
          height={size}
          width={size}
          style={{ width: `${size}px`, height: `${size}px` }}
          alt={userName || "Avatar"}
          src={src}
        />
      ) : userName ? (
        <Image
          className="rounded-full object-cover"
          height={size}
          width={size}
          style={{ width: `${size}px`, height: `${size}px` }}
          alt={userName}
          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}`}
        />
      ) : (
        <Image
          className="rounded-full object-cover"
          height={size}
          width={size}
          style={{ width: `${size}px`, height: `${size}px` }}
          alt="noUser"
          src="/assets/avatar.png"
        />
      )}
    </div>
  );
}

export default Avatar;
