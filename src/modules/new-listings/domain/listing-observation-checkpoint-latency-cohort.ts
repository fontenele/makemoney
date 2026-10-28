import { ListingObservationCheckpointLabel } from './listing-observation-schedule';

export interface ListingObservationCheckpointLatencyStatistics {
  label: ListingObservationCheckpointLabel;
  offsetMs: number;
  sampleSize: number;
  minimumLagMs: number | null;
  medianLagMs: number | null;
  percentile95LagMs: number | null;
  maximumLagMs: number | null;
  minimumQueueDelayMs: number | null;
  medianQueueDelayMs: number | null;
  percentile95QueueDelayMs: number | null;
  maximumQueueDelayMs: number | null;
  minimumProcessingDurationMs: number | null;
  medianProcessingDurationMs: number | null;
  percentile95ProcessingDurationMs: number | null;
  maximumProcessingDurationMs: number | null;
}

export interface ListingObservationCheckpointLatencyCohort {
  provider: 'binance' | null;
  detectionCount: number;
  checkpoints: ListingObservationCheckpointLatencyStatistics[];
}
