export function walletExpiryCountdown(
  expiresAt: string,
  nowMs: number,
): string {
  const expiresAtMs = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiresAtMs) || !Number.isFinite(nowMs)) return '—';

  const remainingSeconds = Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000));
  if (remainingSeconds === 0) return 'Expired';

  const days = Math.floor(remainingSeconds / 86_400);
  const hours = Math.floor((remainingSeconds % 86_400) / 3_600);
  const minutes = Math.floor((remainingSeconds % 3_600) / 60);
  const seconds = remainingSeconds % 60;
  return [
    days > 0 ? `${days}d` : null,
    days > 0 || hours > 0 ? `${hours}h` : null,
    `${minutes}m`,
    `${seconds}s`,
  ]
    .filter((part): part is string => part !== null)
    .join(' ');
}
