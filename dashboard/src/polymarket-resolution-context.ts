import type { PolymarketBinaryResolution } from './api';

export interface PolymarketResolutionContextRow {
  key: 'review' | 'dispute' | 'arbitration';
  label: string;
  value: string;
  active: boolean;
}

export function buildPolymarketResolutionContextRows(
  resolution: PolymarketBinaryResolution['resolution'],
): PolymarketResolutionContextRow[] {
  return [
    {
      key: 'review',
      label: 'Review',
      value: resolution.extendedReview ? 'Extended review' : 'Standard review',
      active: resolution.extendedReview,
    },
    {
      key: 'dispute',
      label: 'Dispute',
      value: resolution.wasDisputed ? 'Disputed' : 'Not disputed',
      active: resolution.wasDisputed,
    },
    {
      key: 'arbitration',
      label: 'Arbitration',
      value: resolution.wasArbitrated ? 'Arbitrated' : 'Not arbitrated',
      active: resolution.wasArbitrated,
    },
  ];
}
