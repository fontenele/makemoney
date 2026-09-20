import { ListingObservationCheckpointLabel } from './listing-observation-schedule';

export interface ListingObservationMarketActivityCheckpoint {
  label: ListingObservationCheckpointLabel;
  offsetMs: number;
  sampleSize: number;
  averageBaseVolume: string;
  averageQuoteVolume: string;
  averageTradeCount: string;
}

export interface ListingObservationMarketActivityCohort {
  provider: 'binance' | null;
  detectionCount: number;
  checkpoints: ListingObservationMarketActivityCheckpoint[];
}
