"use client";

import { playerAvatarUrl } from "@/lib/avatars";
import UserAvatar from "./UserAvatar";

export default function PlayerAvatar({
  image,
  seed,
  name,
  size = "md",
  online,
}: {
  image?: string | null;
  seed: string;
  name?: string | null;
  size?: "sm" | "md" | "lg";
  online?: boolean;
}) {
  const resolved = image ?? playerAvatarUrl(seed, size === "sm" ? 64 : size === "lg" ? 128 : 96);

  return <UserAvatar image={resolved} name={name ?? seed} size={size} online={online} />;
}
