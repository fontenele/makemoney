import Decimal from 'decimal.js';
import { ListingTopOfBookSpreadEvolution } from '../domain/listing-top-of-book-spread-evolution';
import { ListingTopOfBookSpreadEvolutionCohort } from '../domain/listing-top-of-book-spread-evolution-cohort';
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

interface MutableSpreadEvolutionAggregate {
  changes: InstanceType<typeof CohortDecimal>[];
}

export class ListingTopOfBookSpreadEvolutionCohortCalculator {
  calculate(
    evolutions: readonly ListingTopOfBookSpreadEvolution[],
  ): ListingTopOfBookSpreadEvolutionCohort {
    if (evolutions.length === 0) {
      return { provider: null, detectionCount: 0, checkpoints: [] };
    }

    const symbols = new Set<string>();
    const aggregates = new Map<
      ListingObservationCheckpointLabel,
      MutableSpreadEvolutionAggregate
    >();
    for (const evolution of evolutions) {
      validateEvolution(evolution, symbols);
      for (const point of evolution.points) {
        const aggregate = aggregates.get(point.label) ?? { changes: [] };
        aggregate.changes.push(
          new CohortDecimal(point.spreadBasisPointsChange),
        );
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
          const total = aggregate.changes.reduce(
            (sum, change) => sum.plus(change),
            new CohortDecimal(0),
          );
          return [
            {
              label,
              offsetMs,
              sampleSize: aggregate.changes.length,
              averageSpreadBasisPointsChange: total
                .dividedBy(aggregate.changes.length)
                .toFixed(),
            },
          ];
        },
      ),
    };
  }
}

function validateEvolution(
  evolution: ListingTopOfBookSpreadEvolution,
  symbols: Set<string>,
): void {
  const baseline = new CohortDecimal(evolution.baselineSpreadBasisPoints);
  if (
    evolution.provider !== 'binance' ||
    !CANONICAL_SYMBOL_PATTERN.test(evolution.symbol) ||
    evolution.baselineLabel !== 'T+0' ||
    !baseline.isFinite() ||
    baseline.isNegative()
  ) {
    throw new Error('Listing top-of-book spread evolution is invalid');
  }
  if (symbols.has(evolution.symbol)) {
    throw new Error(
      'Listing top-of-book spread evolution symbols must be unique',
    );
  }
  symbols.add(evolution.symbol);

  const labels = new Set<string>();
  for (const point of evolution.points) {
    const schedule = LISTING_OBSERVATION_CHECKPOINTS.find(
      ({ label }) => label === point.label,
    );
    const spread = new CohortDecimal(point.spreadBasisPoints);
    const change = new CohortDecimal(point.spreadBasisPointsChange);
    if (
      !schedule ||
      schedule.offsetMs !== point.offsetMs ||
      labels.has(point.label) ||
      !Number.isFinite(point.targetAt.getTime()) ||
      !spread.isFinite() ||
      spread.isNegative() ||
      !change.isFinite() ||
      !spread.minus(baseline).equals(change)
    ) {
      throw new Error('Listing top-of-book spread evolution point is invalid');
    }
    labels.add(point.label);
  }

  const baselinePoint = evolution.points.find(({ label }) => label === 'T+0');
  if (
    !baselinePoint ||
    !new CohortDecimal(baselinePoint.spreadBasisPoints).equals(baseline) ||
    !new CohortDecimal(baselinePoint.spreadBasisPointsChange).isZero()
  ) {
    throw new Error('Listing top-of-book spread evolution must include T+0');
  }
}
