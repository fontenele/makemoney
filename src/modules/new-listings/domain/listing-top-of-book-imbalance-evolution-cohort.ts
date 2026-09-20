import { ListingObservationCheckpointLabel } from './listing-observation-schedule';

export interface ListingTopOfBookImbalanceEvolutionCohortCheckpoint {
  label: ListingObservationCheckpointLabel;
  offsetMs: number;
  sampleSize: number;
  changeSampleSize: number;
  unavailableChangeCount: number;
  averageImbalanceChange: string | null;
}

export interface ListingTopOfBookImbalanceEvolutionCohort {
  provider: 'binance' | null;
  detectionCount: number;
  checkpoints: ListingTopOfBookImbalanceEvolutionCohortCheckpoint[];
}
