import Decimal from 'decimal.js';
import { ListingTopOfBookImbalanceEvolution } from '../domain/listing-top-of-book-imbalance-evolution';
import { ListingTopOfBookImbalanceEvolutionCohort } from '../domain/listing-top-of-book-imbalance-evolution-cohort';
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

interface MutableEvolutionAggregate {
  sampleSize: number;
  changes: InstanceType<typeof CohortDecimal>[];
}

export class ListingTopOfBookImbalanceEvolutionCohortCalculator {
  calculate(
    evolutions: readonly ListingTopOfBookImbalanceEvolution[],
  ): ListingTopOfBookImbalanceEvolutionCohort {
    if (evolutions.length === 0) {
      return { provider: null, detectionCount: 0, checkpoints: [] };
    }

    const symbols = new Set<string>();
    const aggregates = new Map<
      ListingObservationCheckpointLabel,
      MutableEvolutionAggregate
    >();
    for (const evolution of evolutions) {
      validateEvolution(evolution, symbols);
      for (const point of evolution.points) {
        const aggregate = aggregates.get(point.label) ?? {
          sampleSize: 0,
          changes: [],
        };
        aggregate.sampleSize += 1;
        if (point.imbalanceChange !== null) {
          aggregate.changes.push(new CohortDecimal(point.imbalanceChange));
        }
        aggregates.set(point.label, aggregate);
      }
    }

    return {
      provider: 'binance',
      detectionCount: evolutions.length,
      checkpoints: LISTING_OBSERVATION_CHECKPOINTS.flatMap(
        ({ label, offsetMs }) => {
          const aggregate = aggregates.get(label);
          if (!aggregate) return [];
          const changeSampleSize = aggregate.changes.length;
          const total = aggregate.changes.reduce(
            (sum, change) => sum.plus(change),
            new CohortDecimal(0),
          );
          return [
            {
              label,
              offsetMs,
              sampleSize: aggregate.sampleSize,
              changeSampleSize,
              unavailableChangeCount: aggregate.sampleSize - changeSampleSize,
              averageImbalanceChange:
                changeSampleSize === 0
                  ? null
                  : total.dividedBy(changeSampleSize).toFixed(),
            },
          ];
        },
      ),
    };
  }
}

function validateEvolution(
  evolution: ListingTopOfBookImbalanceEvolution,
  symbols: Set<string>,
): void {
  const baseline = new CohortDecimal(evolution.baselineImbalanceRate);
  if (
    evolution.provider !== 'binance' ||
    !CANONICAL_SYMBOL_PATTERN.test(evolution.symbol) ||
    evolution.baselineLabel !== 'T+0' ||
    !baseline.isFinite() ||
    baseline.lessThan(-1) ||
    baseline.greaterThan(1)
  ) {
    throw new Error('Listing top-of-book imbalance evolution is invalid');
  }
  if (symbols.has(evolution.symbol)) {
    throw new Error(
      'Listing top-of-book imbalance evolution symbols must be unique',
    );
  }
  symbols.add(evolution.symbol);

  const labels = new Set<string>();
  for (const point of evolution.points) {
    const schedule = LISTING_OBSERVATION_CHECKPOINTS.find(
      ({ label }) => label === point.label,
    );
    const bothUnavailable =
      point.imbalanceRate === null && point.imbalanceChange === null;
    const bothAvailable =
      point.imbalanceRate !== null && point.imbalanceChange !== null;
    if (
      !schedule ||
      schedule.offsetMs !== point.offsetMs ||
      labels.has(point.label) ||
      !Number.isFinite(point.targetAt.getTime()) ||
      (!bothUnavailable && !bothAvailable)
    ) {
      throw new Error(
        'Listing top-of-book imbalance evolution point is invalid',
      );
    }
    if (bothAvailable) {
      const rate = new CohortDecimal(point.imbalanceRate!);
      const change = new CohortDecimal(point.imbalanceChange!);
      if (
        !rate.isFinite() ||
        rate.lessThan(-1) ||
        rate.greaterThan(1) ||
        !change.isFinite() ||
        !rate.minus(baseline).equals(change)
      ) {
        throw new Error(
          'Listing top-of-book imbalance evolution point is invalid',
        );
      }
    }
    labels.add(point.label);
  }

  const baselinePoint = evolution.points.find(({ label }) => label === 'T+0');
  if (
    !baselinePoint ||
    baselinePoint.imbalanceRate === null ||
    !new CohortDecimal(baselinePoint.imbalanceRate).equals(baseline) ||
    baselinePoint.imbalanceChange === null ||
    !new CohortDecimal(baselinePoint.imbalanceChange).isZero()
  ) {
    throw new Error('Listing top-of-book imbalance evolution must include T+0');
  }
}
