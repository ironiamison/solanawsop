/** Deterministic face-style avatar from any player id (username, wallet, session). */
export function playerAvatarUrl(seed: string, size = 96): string {
  const q = encodeURIComponent(seed.trim() || "player");
  return `https://api.dicebear.com/9.x/avataaars/png?seed=${q}&size=${size}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}
