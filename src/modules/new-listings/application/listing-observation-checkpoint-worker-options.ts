export interface ListingObservationCheckpointWorkerOptions {
  intervalMs: number;
  batchSize: number;
  leaseDurationMs: number;
}

export const LISTING_OBSERVATION_CHECKPOINT_WORKER_OPTIONS = Symbol(
  'LISTING_OBSERVATION_CHECKPOINT_WORKER_OPTIONS',
);
