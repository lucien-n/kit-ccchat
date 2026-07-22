export const isMuted = (user: { mutedUntil: number | null }) =>
  user.mutedUntil != null && user.mutedUntil > Date.now();
