import Decimal from 'decimal.js';
import { validateListingMarketObservation } from '../domain/listing-market-observation';
import { ListingObservationMarketActivityCohort } from '../domain/listing-observation-market-activity-cohort';
import {
  CompletedListingObservationCheckpoint,
  LISTING_OBSERVATION_CHECKPOINTS,
  ListingObservationCheckpointLabel,
} from '../domain/listing-observation-schedule';

const ActivityDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});

interface MutableCheckpointActivity {
  offsetMs: number;
  baseVolume: InstanceType<typeof ActivityDecimal>;
  quoteVolume: InstanceType<typeof ActivityDecimal>;
  tradeCount: InstanceType<typeof ActivityDecimal>;
  sampleSize: number;
}

export class ListingObservationMarketActivityCohortCalculator {
  calculate(
    timelines: readonly (readonly CompletedListingObservationCheckpoint[])[],
  ): ListingObservationMarketActivityCohort {
    if (timelines.length === 0) {
      return { provider: null, detectionCount: 0, checkpoints: [] };
    }

    const symbols = new Set<string>();
    const aggregates = new Map<
      ListingObservationCheckpointLabel,
      MutableCheckpointActivity
    >();
    for (const timeline of timelines) {
      validateTimeline(timeline, symbols);
      for (const observation of timeline) {
        const aggregate = aggregates.get(observation.label) ?? {
          offsetMs: observation.offsetMs,
          baseVolume: new ActivityDecimal(0),
          quoteVolume: new ActivityDecimal(0),
          tradeCount: new ActivityDecimal(0),
          sampleSize: 0,
        };
        aggregate.baseVolume = aggregate.baseVolume.plus(
          observation.baseVolume,
        );
        aggregate.quoteVolume = aggregate.quoteVolume.plus(
          observation.quoteVolume,
        );
        aggregate.tradeCount = aggregate.tradeCount.plus(
          observation.tradeCount,
        );
        aggregate.sampleSize += 1;
        aggregates.set(observation.label, aggregate);
      }
    }

    return {
      provider: 'binance',
      detectionCount: timelines.length,
      checkpoints: LISTING_OBSERVATION_CHECKPOINTS.flatMap(
        ({ label, offsetMs }) => {
          const aggregate = aggregates.get(label);
          if (!aggregate) return [];
          return [
            {
              label,
              offsetMs,
              sampleSize: aggregate.sampleSize,
              averageBaseVolume: aggregate.baseVolume
                .dividedBy(aggregate.sampleSize)
                .toFixed(),
              averageQuoteVolume: aggregate.quoteVolume
                .dividedBy(aggregate.sampleSize)
                .toFixed(),
              averageTradeCount: aggregate.tradeCount
                .dividedBy(aggregate.sampleSize)
                .toFixed(),
            },
          ];
        },
      ),
    };
  }
}

function validateTimeline(
  timeline: readonly CompletedListingObservationCheckpoint[],
  symbols: Set<string>,
): void {
  if (timeline.length === 0) {
    throw new Error('Listing observation activity timeline must not be empty');
  }
  const symbol = timeline[0].symbol;
  if (symbols.has(symbol)) {
    throw new Error('Listing observation activity symbols must be unique');
  }
  symbols.add(symbol);
  const labels = new Set<string>();
  for (const observation of timeline) {
    validateListingMarketObservation(observation);
    const schedule = LISTING_OBSERVATION_CHECKPOINTS.find(
      ({ label }) => label === observation.label,
    );
    if (
      observation.symbol !== symbol ||
      !schedule ||
      schedule.offsetMs !== observation.offsetMs ||
      labels.has(observation.label) ||
      !Number.isFinite(observation.targetAt.getTime()) ||
      !Number.isFinite(observation.completedAt.getTime()) ||
      observation.completedAt < observation.targetAt
    ) {
      throw new Error('Listing observation activity checkpoint is invalid');
    }
    labels.add(observation.label);
  }
}
