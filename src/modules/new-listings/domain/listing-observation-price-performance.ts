import { ListingObservationCheckpointLabel } from './listing-observation-schedule';

export interface ListingObservationPricePerformancePoint {
  label: ListingObservationCheckpointLabel;
  offsetMs: number;
  targetAt: Date;
  completedAt: Date;
  lastPrice: string;
  absolutePriceChange: string;
  priceReturnRate: string;
}

export interface ListingObservationPricePerformance {
  provider: 'binance';
  symbol: string;
  baselineLabel: 'T+0';
  baselinePrice: string;
  points: ListingObservationPricePerformancePoint[];
}
