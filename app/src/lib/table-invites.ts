import { APP_URL } from "@/lib/constants";

/** Shareable URL for a private (or any) table room. */
export function tableInviteUrl(roomPubkey: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/table/${roomPubkey}`;
  }
  return `${APP_URL.replace(/\/$/, "")}/table/${roomPubkey}`;
}
