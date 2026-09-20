import { ListingObservationCheckpointLabel } from './listing-observation-schedule';

export interface ListingTopOfBookSpreadEvolutionCohortCheckpoint {
  label: ListingObservationCheckpointLabel;
  offsetMs: number;
  sampleSize: number;
  averageSpreadBasisPointsChange: string;
}

export interface ListingTopOfBookSpreadEvolutionCohort {
  provider: 'binance' | null;
  detectionCount: number;
  checkpoints: ListingTopOfBookSpreadEvolutionCohortCheckpoint[];
}
