import type { PolymarketMidpointComplement } from './api';

const STATUS_LABELS: Record<PolymarketMidpointComplement['status'], string> = {
  balanced: 'Equal to one',
  below_one: 'Below one',
  above_one: 'Above one',
};

export function polymarketMidpointComplementStatusLabel(
  status: PolymarketMidpointComplement['status'],
): string {
  return STATUS_LABELS[status];
}
