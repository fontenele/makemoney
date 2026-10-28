import { isCanonicalBinanceSymbol } from '../domain/binance-spot-identity';
import { ListingObservationCheckpointLatencyCohort } from '../domain/listing-observation-checkpoint-latency-cohort';
import {
  ClaimedCompletedListingObservationCheckpoint,
  LISTING_OBSERVATION_CHECKPOINTS,
} from '../domain/listing-observation-schedule';

export class ListingObservationCheckpointLatencyCohortCalculator {
  calculate(
    timelines: readonly (readonly ClaimedCompletedListingObservationCheckpoint[])[],
  ): ListingObservationCheckpointLatencyCohort {
    if (timelines.length === 0) {
      return { provider: null, detectionCount: 0, checkpoints: [] };
    }

    const symbols = new Set<string>();
    const lagsByLabel = new Map<string, number[]>();
    const queueDelaysByLabel = new Map<string, number[]>();
    const processingDurationsByLabel = new Map<string, number[]>();
    for (const timeline of timelines) {
      if (timeline.length === 0) {
        throw new Error('Listing checkpoint latency timeline is empty');
      }
      const symbol = timeline[0].symbol;
      if (!isCanonicalBinanceSymbol(symbol) || symbols.has(symbol)) {
        throw new Error(
          'Listing checkpoint latency cohort identity is invalid',
        );
      }
      symbols.add(symbol);

      const labels = new Set<string>();
      for (const checkpoint of timeline) {
        const schedule = LISTING_OBSERVATION_CHECKPOINTS.find(
          ({ label }) => label === checkpoint.label,
        );
        if (
          checkpoint.provider !== 'binance' ||
          checkpoint.symbol !== symbol ||
          !schedule ||
          schedule.offsetMs !== checkpoint.offsetMs ||
          labels.has(checkpoint.label)
        ) {
          throw new Error('Listing checkpoint latency timeline is invalid');
        }
        labels.add(checkpoint.label);

        const targetAtMs = checkpoint.targetAt.getTime();
        const claimedAtMs = checkpoint.claimedAt.getTime();
        const completedAtMs = checkpoint.completedAt.getTime();
        const lagMs = completedAtMs - targetAtMs;
        const queueDelayMs = claimedAtMs - targetAtMs;
        const processingDurationMs = completedAtMs - claimedAtMs;
        if (
          !Number.isSafeInteger(lagMs) ||
          !Number.isSafeInteger(queueDelayMs) ||
          !Number.isSafeInteger(processingDurationMs) ||
          lagMs < 0 ||
          queueDelayMs < 0 ||
          processingDurationMs < 0 ||
          queueDelayMs + processingDurationMs !== lagMs
        ) {
          throw new Error('Listing checkpoint completion lag is invalid');
        }
        const lags = lagsByLabel.get(checkpoint.label) ?? [];
        lags.push(lagMs);
        lagsByLabel.set(checkpoint.label, lags);
        const queueDelays = queueDelaysByLabel.get(checkpoint.label) ?? [];
        queueDelays.push(queueDelayMs);
        queueDelaysByLabel.set(checkpoint.label, queueDelays);
        const processingDurations =
          processingDurationsByLabel.get(checkpoint.label) ?? [];
        processingDurations.push(processingDurationMs);
        processingDurationsByLabel.set(checkpoint.label, processingDurations);
      }
    }

    return {
      provider: 'binance',
      detectionCount: timelines.length,
      checkpoints: LISTING_OBSERVATION_CHECKPOINTS.map(
        ({ label, offsetMs }) => {
          const ordered = [...(lagsByLabel.get(label) ?? [])].sort(
            (left, right) => left - right,
          );
          const orderedQueueDelays = [
            ...(queueDelaysByLabel.get(label) ?? []),
          ].sort((left, right) => left - right);
          const orderedProcessingDurations = [
            ...(processingDurationsByLabel.get(label) ?? []),
          ].sort((left, right) => left - right);
          return {
            label,
            offsetMs,
            sampleSize: ordered.length,
            minimumLagMs: ordered[0] ?? null,
            medianLagMs: median(ordered),
            percentile95LagMs: percentile95(ordered),
            maximumLagMs: ordered.at(-1) ?? null,
            minimumQueueDelayMs: orderedQueueDelays[0] ?? null,
            medianQueueDelayMs: median(orderedQueueDelays),
            percentile95QueueDelayMs: percentile95(orderedQueueDelays),
            maximumQueueDelayMs: orderedQueueDelays.at(-1) ?? null,
            minimumProcessingDurationMs: orderedProcessingDurations[0] ?? null,
            medianProcessingDurationMs: median(orderedProcessingDurations),
            percentile95ProcessingDurationMs: percentile95(
              orderedProcessingDurations,
            ),
            maximumProcessingDurationMs:
              orderedProcessingDurations.at(-1) ?? null,
          };
        },
      ),
    };
  }
}

function median(ordered: readonly number[]): number | null {
  if (ordered.length === 0) return null;
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 1
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
}

function percentile95(ordered: readonly number[]): number | null {
  if (ordered.length === 0) return null;
  return ordered[Math.ceil(ordered.length * 0.95) - 1];
}
