import { ListingObservationCheckpointLabel } from './listing-observation-schedule';

export interface ListingTopOfBookCohortCheckpoint {
  label: ListingObservationCheckpointLabel;
  offsetMs: number;
  sampleSize: number;
  averageSpreadBasisPoints: string;
  averageBidQuoteNotional: string;
  averageAskQuoteNotional: string;
}

export interface ListingTopOfBookCohort {
  provider: 'binance' | null;
  detectionCount: number;
  checkpoints: ListingTopOfBookCohortCheckpoint[];
}
