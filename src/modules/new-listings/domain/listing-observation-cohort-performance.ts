import { ListingObservationCheckpointLabel } from './listing-observation-schedule';

export interface ListingObservationCohortCheckpointPerformance {
  label: ListingObservationCheckpointLabel;
  offsetMs: number;
  sampleSize: number;
  positiveReturnCount: number;
  negativeReturnCount: number;
  flatReturnCount: number;
  averagePriceReturnRate: string;
}

export interface ListingObservationCohortPerformance {
  provider: 'binance' | null;
  detectionCount: number;
  checkpoints: ListingObservationCohortCheckpointPerformance[];
}
