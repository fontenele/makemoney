import { isCanonicalBinanceSymbol } from '../domain/binance-spot-identity';
import { ListingObservationCheckpointLatencyCohort } from '../domain/listing-observation-checkpoint-latency-cohort';
import {
  CompletedListingObservationCheckpoint,
  LISTING_OBSERVATION_CHECKPOINTS,
} from '../domain/listing-observation-schedule';

export class ListingObservationCheckpointLatencyCohortCalculator {
  calculate(
    timelines: readonly (readonly CompletedListingObservationCheckpoint[])[],
  ): ListingObservationCheckpointLatencyCohort {
    if (timelines.length === 0) {
      return { provider: null, detectionCount: 0, checkpoints: [] };
    }

    const symbols = new Set<string>();
    const lagsByLabel = new Map<string, number[]>();
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

        const lagMs =
          checkpoint.completedAt.getTime() - checkpoint.targetAt.getTime();
        if (!Number.isSafeInteger(lagMs) || lagMs < 0) {
          throw new Error('Listing checkpoint completion lag is invalid');
        }
        const lags = lagsByLabel.get(checkpoint.label) ?? [];
        lags.push(lagMs);
        lagsByLabel.set(checkpoint.label, lags);
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
          return {
            label,
            offsetMs,
            sampleSize: ordered.length,
            minimumLagMs: ordered[0] ?? null,
            medianLagMs: median(ordered),
            percentile95LagMs: percentile95(ordered),
            maximumLagMs: ordered.at(-1) ?? null,
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
