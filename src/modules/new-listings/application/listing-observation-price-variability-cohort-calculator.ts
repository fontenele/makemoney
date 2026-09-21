import Decimal from 'decimal.js';
import { ListingObservationPriceVariabilityCohort } from '../domain/listing-observation-price-variability-cohort';
import {
  ListingObservationPriceTransition,
  ListingObservationPriceVariability,
} from '../domain/listing-observation-price-variability';
import { LISTING_OBSERVATION_CHECKPOINTS } from '../domain/listing-observation-schedule';

const CohortDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});

export class ListingObservationPriceVariabilityCohortCalculator {
  calculate(
    variability: readonly ListingObservationPriceVariability[],
  ): ListingObservationPriceVariabilityCohort {
    if (variability.length === 0) {
      return {
        provider: null,
        sampleSize: 0,
        transitionSampleSize: 0,
        medianAverageAbsoluteReturnRate: null,
        medianMaximumAbsoluteReturnRate: null,
      };
    }

    const symbols = new Set<string>();
    const averageRates: InstanceType<typeof CohortDecimal>[] = [];
    const maximumRates: InstanceType<typeof CohortDecimal>[] = [];

    for (const path of variability) {
      validateIdentity(path, symbols);
      if (
        !Number.isSafeInteger(path.transitionCount) ||
        path.transitionCount < 0
      ) {
        throw new Error(
          'Listing price variability transition count is invalid',
        );
      }
      if (path.transitionCount === 0) {
        if (
          path.averageAbsoluteReturnRate !== null ||
          path.maximumAbsoluteReturn !== null
        ) {
          throw new Error('Listing price variability empty values are invalid');
        }
        continue;
      }
      if (
        path.averageAbsoluteReturnRate === null ||
        path.maximumAbsoluteReturn === null
      ) {
        throw new Error(
          'Listing price variability transition values are missing',
        );
      }

      const average = nonNegativeDecimal(path.averageAbsoluteReturnRate);
      const maximum = validateMaximumTransition(path.maximumAbsoluteReturn);
      if (average.greaterThan(maximum)) {
        throw new Error('Listing price variability average exceeds maximum');
      }
      averageRates.push(average);
      maximumRates.push(maximum);
    }

    return {
      provider: 'binance',
      sampleSize: variability.length,
      transitionSampleSize: averageRates.length,
      medianAverageAbsoluteReturnRate: median(averageRates),
      medianMaximumAbsoluteReturnRate: median(maximumRates),
    };
  }
}

function validateIdentity(
  path: ListingObservationPriceVariability,
  symbols: Set<string>,
): void {
  if (path.provider !== 'binance' || !/^[A-Z0-9]{1,30}$/.test(path.symbol)) {
    throw new Error('Listing price variability cohort identity is invalid');
  }
  if (symbols.has(path.symbol)) {
    throw new Error('Listing price variability cohort symbols must be unique');
  }
  symbols.add(path.symbol);
}

function validateMaximumTransition(
  transition: ListingObservationPriceTransition,
): InstanceType<typeof CohortDecimal> {
  const from = validEvent(transition.from);
  const to = validEvent(transition.to);
  if (
    to.offsetMs <= from.offsetMs ||
    transition.durationMs !== to.offsetMs - from.offsetMs
  ) {
    throw new Error('Listing price variability transition duration is invalid');
  }
  const signed = decimal(transition.returnRate);
  const absolute = nonNegativeDecimal(transition.absoluteReturnRate);
  const expected = to.price.minus(from.price).dividedBy(from.price);
  if (!signed.equals(expected) || !absolute.equals(signed.abs())) {
    throw new Error(
      'Listing price variability transition values are inconsistent',
    );
  }
  return absolute;
}

function validEvent(event: ListingObservationPriceTransition['from']): {
  offsetMs: number;
  price: InstanceType<typeof CohortDecimal>;
} {
  const checkpoint = LISTING_OBSERVATION_CHECKPOINTS.find(
    ({ label }) => label === event.label,
  );
  if (!checkpoint || checkpoint.offsetMs !== event.offsetMs) {
    throw new Error('Listing price variability event schedule is invalid');
  }
  const price = decimal(event.lastPrice);
  if (!price.greaterThan(0)) {
    throw new Error('Listing price variability price is invalid');
  }
  return { offsetMs: event.offsetMs, price };
}

function nonNegativeDecimal(value: string): InstanceType<typeof CohortDecimal> {
  const parsed = decimal(value);
  if (parsed.isNegative()) {
    throw new Error('Listing price variability rate is invalid');
  }
  return parsed;
}

function decimal(value: string): InstanceType<typeof CohortDecimal> {
  try {
    const parsed = new CohortDecimal(value);
    if (parsed.isFinite()) return parsed;
  } catch {
    throw new Error('Listing price variability decimal is invalid');
  }
  throw new Error('Listing price variability decimal is invalid');
}

function median(values: InstanceType<typeof CohortDecimal>[]): string | null {
  if (values.length === 0) return null;
  const ordered = [...values].sort((left, right) => left.comparedTo(right));
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 1
    ? ordered[middle].toFixed()
    : ordered[middle - 1].plus(ordered[middle]).dividedBy(2).toFixed();
}
