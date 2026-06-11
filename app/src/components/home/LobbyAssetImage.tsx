"use client";

import Image, { type ImageProps } from "next/image";

/** 3D lobby PNG with black matte — screen blend hides leftover matte on dark UI */
export default function LobbyAssetImage({
  className = "",
  alt = "",
  ...props
}: Omit<ImageProps, "unoptimized" | "alt"> & { alt?: string }) {
  return (
    <Image
      alt={alt}
      unoptimized
      className={`lobby-asset-img ${className}`}
      {...props}
    />
  );
}
