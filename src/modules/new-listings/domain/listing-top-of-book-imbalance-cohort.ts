import { ListingObservationCheckpointLabel } from './listing-observation-schedule';

export interface ListingTopOfBookImbalanceCohortCheckpoint {
  label: ListingObservationCheckpointLabel;
  offsetMs: number;
  sampleSize: number;
  imbalanceSampleSize: number;
  unavailableImbalanceCount: number;
  averageImbalanceRate: string | null;
}

export interface ListingTopOfBookImbalanceCohort {
  provider: 'binance' | null;
  detectionCount: number;
  checkpoints: ListingTopOfBookImbalanceCohortCheckpoint[];
}
