import Decimal from 'decimal.js';
import { ListingTopOfBookCohort } from '../domain/listing-top-of-book-cohort';
import { StoredListingTopOfBookCheckpoint } from '../domain/listing-top-of-book-observation-repository';
import {
  LISTING_OBSERVATION_CHECKPOINTS,
  ListingObservationCheckpointLabel,
} from '../domain/listing-observation-schedule';
import { ListingTopOfBookSpreadCalculator } from './listing-top-of-book-spread-calculator';

const CohortDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});

interface MutableTopOfBookAggregate {
  sampleSize: number;
  spreadBasisPoints: InstanceType<typeof CohortDecimal>;
  bidQuoteNotional: InstanceType<typeof CohortDecimal>;
  askQuoteNotional: InstanceType<typeof CohortDecimal>;
}

export class ListingTopOfBookCohortCalculator {
  constructor(
    private readonly spreadCalculator = new ListingTopOfBookSpreadCalculator(),
  ) {}

  calculate(
    timelines: readonly (readonly StoredListingTopOfBookCheckpoint[])[],
  ): ListingTopOfBookCohort {
    if (timelines.length === 0) {
      return { provider: null, detectionCount: 0, checkpoints: [] };
    }

    const symbols = new Set<string>();
    const aggregates = new Map<
      ListingObservationCheckpointLabel,
      MutableTopOfBookAggregate
    >();
    for (const timeline of timelines) {
      this.validateTimeline(timeline, symbols);
      for (const checkpoint of timeline) {
        const spread = this.spreadCalculator.calculate(checkpoint);
        const aggregate = aggregates.get(checkpoint.label) ?? {
          sampleSize: 0,
          spreadBasisPoints: new CohortDecimal(0),
          bidQuoteNotional: new CohortDecimal(0),
          askQuoteNotional: new CohortDecimal(0),
        };
        aggregate.sampleSize += 1;
        aggregate.spreadBasisPoints = aggregate.spreadBasisPoints.plus(
          spread.spreadBasisPoints,
        );
        aggregate.bidQuoteNotional = aggregate.bidQuoteNotional.plus(
          new CohortDecimal(spread.bidPrice).times(spread.bidQuantity),
        );
        aggregate.askQuoteNotional = aggregate.askQuoteNotional.plus(
          new CohortDecimal(spread.askPrice).times(spread.askQuantity),
        );
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
          return [
            {
              label,
              offsetMs,
              sampleSize: aggregate.sampleSize,
              averageSpreadBasisPoints: aggregate.spreadBasisPoints
                .dividedBy(aggregate.sampleSize)
                .toFixed(),
              averageBidQuoteNotional: aggregate.bidQuoteNotional
                .dividedBy(aggregate.sampleSize)
                .toFixed(),
              averageAskQuoteNotional: aggregate.askQuoteNotional
                .dividedBy(aggregate.sampleSize)
                .toFixed(),
            },
          ];
        },
      ),
    };
  }

  private validateTimeline(
    timeline: readonly StoredListingTopOfBookCheckpoint[],
    symbols: Set<string>,
  ): void {
    if (timeline.length === 0) {
      throw new Error('Listing top-of-book cohort timeline must not be empty');
    }
    const symbol = timeline[0].symbol;
    if (symbols.has(symbol)) {
      throw new Error('Listing top-of-book cohort symbols must be unique');
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
        throw new Error('Listing top-of-book cohort checkpoint is invalid');
      }
      labels.add(checkpoint.label);
    }
  }
}
