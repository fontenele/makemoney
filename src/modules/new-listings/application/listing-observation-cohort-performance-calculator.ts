import Decimal from 'decimal.js';
import { ListingObservationCohortPerformance } from '../domain/listing-observation-cohort-performance';
import { ListingObservationPricePerformance } from '../domain/listing-observation-price-performance';
import {
  LISTING_OBSERVATION_CHECKPOINTS,
  ListingObservationCheckpointLabel,
} from '../domain/listing-observation-schedule';

const CohortDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});
const CANONICAL_SYMBOL_PATTERN = /^[A-Z0-9]{1,30}$/;

interface MutableCheckpointAggregate {
  offsetMs: number;
  returns: InstanceType<typeof CohortDecimal>[];
  positiveReturnCount: number;
  negativeReturnCount: number;
  flatReturnCount: number;
}

export class ListingObservationCohortPerformanceCalculator {
  calculate(
    performances: readonly ListingObservationPricePerformance[],
  ): ListingObservationCohortPerformance {
    if (performances.length === 0) {
      return { provider: null, detectionCount: 0, checkpoints: [] };
    }

    const symbols = new Set<string>();
    const aggregates = new Map<
      ListingObservationCheckpointLabel,
      MutableCheckpointAggregate
    >();
    for (const performance of performances) {
      validatePerformance(performance, symbols);
      for (const point of performance.points) {
        const value = new CohortDecimal(point.priceReturnRate);
        const aggregate = aggregates.get(point.label) ?? {
          offsetMs: point.offsetMs,
          returns: [],
          positiveReturnCount: 0,
          negativeReturnCount: 0,
          flatReturnCount: 0,
        };
        aggregate.returns.push(value);
        if (value.greaterThan(0)) aggregate.positiveReturnCount += 1;
        else if (value.lessThan(0)) aggregate.negativeReturnCount += 1;
        else aggregate.flatReturnCount += 1;
        aggregates.set(point.label, aggregate);
      }
    }

    return {
      provider: 'binance',
      detectionCount: performances.length,
      checkpoints: LISTING_OBSERVATION_CHECKPOINTS.flatMap(
        ({ label, offsetMs }) => {
          const aggregate = aggregates.get(label);
          if (!aggregate) return [];
          const total = aggregate.returns.reduce(
            (sum, value) => sum.plus(value),
            new CohortDecimal(0),
          );
          return [
            {
              label,
              offsetMs,
              sampleSize: aggregate.returns.length,
              positiveReturnCount: aggregate.positiveReturnCount,
              negativeReturnCount: aggregate.negativeReturnCount,
              flatReturnCount: aggregate.flatReturnCount,
              averagePriceReturnRate: total
                .dividedBy(aggregate.returns.length)
                .toFixed(),
            },
          ];
        },
      ),
    };
  }
}

function validatePerformance(
  performance: ListingObservationPricePerformance,
  symbols: Set<string>,
): void {
  if (
    performance.provider !== 'binance' ||
    !CANONICAL_SYMBOL_PATTERN.test(performance.symbol) ||
    performance.baselineLabel !== 'T+0' ||
    !new CohortDecimal(performance.baselinePrice).isPositive()
  ) {
    throw new Error('Listing observation performance identity is invalid');
  }
  if (symbols.has(performance.symbol)) {
    throw new Error('Listing observation cohort symbols must be unique');
  }
  symbols.add(performance.symbol);
  const labels = new Set<string>();
  for (const point of performance.points) {
    const schedule = LISTING_OBSERVATION_CHECKPOINTS.find(
      ({ label }) => label === point.label,
    );
    if (
      !schedule ||
      schedule.offsetMs !== point.offsetMs ||
      labels.has(point.label) ||
      !new CohortDecimal(point.priceReturnRate).isFinite()
    ) {
      throw new Error('Listing observation performance point is invalid');
    }
    labels.add(point.label);
  }
  if (!labels.has('T+0')) {
    throw new Error('Listing observation performance must include T+0');
  }
}
