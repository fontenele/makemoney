import Decimal from 'decimal.js';
import { ListingTopOfBookImbalanceCohort } from '../domain/listing-top-of-book-imbalance-cohort';
import { StoredListingTopOfBookCheckpoint } from '../domain/listing-top-of-book-observation-repository';
import {
  LISTING_OBSERVATION_CHECKPOINTS,
  ListingObservationCheckpointLabel,
} from '../domain/listing-observation-schedule';
import { ListingTopOfBookImbalanceCalculator } from './listing-top-of-book-imbalance-calculator';

const CohortDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});

interface MutableImbalanceAggregate {
  sampleSize: number;
  imbalanceRates: InstanceType<typeof CohortDecimal>[];
}

export class ListingTopOfBookImbalanceCohortCalculator {
  constructor(
    private readonly imbalanceCalculator = new ListingTopOfBookImbalanceCalculator(),
  ) {}

  calculate(
    timelines: readonly (readonly StoredListingTopOfBookCheckpoint[])[],
  ): ListingTopOfBookImbalanceCohort {
    if (timelines.length === 0) {
      return { provider: null, detectionCount: 0, checkpoints: [] };
    }

    const symbols = new Set<string>();
    const aggregates = new Map<
      ListingObservationCheckpointLabel,
      MutableImbalanceAggregate
    >();
    for (const timeline of timelines) {
      validateTimeline(timeline, symbols);
      for (const checkpoint of timeline) {
        const imbalance = this.imbalanceCalculator.calculate(checkpoint);
        const aggregate = aggregates.get(checkpoint.label) ?? {
          sampleSize: 0,
          imbalanceRates: [],
        };
        aggregate.sampleSize += 1;
        if (imbalance.imbalanceRate !== null) {
          aggregate.imbalanceRates.push(
            new CohortDecimal(imbalance.imbalanceRate),
          );
        }
        aggregates.set(checkpoint.label, aggregate);
      }
    }

    return {
      provider: 'binance',
      detectionCount: timelines.length,
      checkpoints: LISTING_OBSERVATION_CHECKPOINTS.flatMap(
        ({ label, offsetMs }) => {
          const aggregate = aggregates.get(label);
          if (!aggregate) return [];
          const imbalanceSampleSize = aggregate.imbalanceRates.length;
          const total = aggregate.imbalanceRates.reduce(
            (sum, rate) => sum.plus(rate),
            new CohortDecimal(0),
          );
          return [
            {
              label,
              offsetMs,
              sampleSize: aggregate.sampleSize,
              imbalanceSampleSize,
              unavailableImbalanceCount:
                aggregate.sampleSize - imbalanceSampleSize,
              averageImbalanceRate:
                imbalanceSampleSize === 0
                  ? null
                  : total.dividedBy(imbalanceSampleSize).toFixed(),
            },
          ];
        },
      ),
    };
  }
}

function validateTimeline(
  timeline: readonly StoredListingTopOfBookCheckpoint[],
  symbols: Set<string>,
): void {
  if (timeline.length === 0) {
    throw new Error('Listing top-of-book imbalance timeline must not be empty');
  }
  const symbol = timeline[0].symbol;
  if (symbols.has(symbol)) {
    throw new Error(
      'Listing top-of-book imbalance cohort symbols must be unique',
    );
  }
  symbols.add(symbol);
  const labels = new Set<string>();
  for (const checkpoint of timeline) {
    const schedule = LISTING_OBSERVATION_CHECKPOINTS.find(
      ({ label }) => label === checkpoint.label,
    );
    if (
      checkpoint.symbol !== symbol ||
      !schedule ||
      schedule.offsetMs !== checkpoint.offsetMs ||
      labels.has(checkpoint.label) ||
      !Number.isFinite(checkpoint.targetAt.getTime())
    ) {
      throw new Error('Listing top-of-book imbalance checkpoint is invalid');
    }
    labels.add(checkpoint.label);
  }
}
