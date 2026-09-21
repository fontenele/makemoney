import Decimal from 'decimal.js';
import { ListingTopOfBookSpreadClassification } from '../domain/listing-top-of-book-spread-classification';
import { ListingTopOfBookSpreadClassificationMagnitudeCohort } from '../domain/listing-top-of-book-spread-classification-magnitude-cohort';
import { ListingTopOfBookSpreadClassificationCohortCalculator } from './listing-top-of-book-spread-classification-cohort-calculator';

const MagnitudeDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
});

export class ListingTopOfBookSpreadClassificationMagnitudeCohortCalculator {
  private readonly cohort =
    new ListingTopOfBookSpreadClassificationCohortCalculator();

  calculate(
    classifications: readonly ListingTopOfBookSpreadClassification[],
  ): ListingTopOfBookSpreadClassificationMagnitudeCohort {
    const validated = this.cohort.calculate(classifications);
    if (!validated.provider || !validated.thresholds) {
      return {
        provider: null,
        thresholds: null,
        wideningSampleSize: 0,
        medianMaximumWideningBasisPoints: null,
      };
    }

    const threshold = new MagnitudeDecimal(
      validated.thresholds.wideningBasisPoints,
    );
    const magnitudes: InstanceType<typeof MagnitudeDecimal>[] = [];
    for (const classification of classifications) {
      const magnitude = validMagnitude(
        classification.maximumWidening.spreadBasisPointsChange,
      );
      if (
        (classification.status === 'widening-observed') !==
        magnitude.greaterThanOrEqualTo(threshold)
      ) {
        throw new Error(
          'Listing top-of-book maximum widening is inconsistent with classification',
        );
      }
      if (classification.status === 'widening-observed') {
        magnitudes.push(magnitude);
      }
    }

    return {
      provider: validated.provider,
      thresholds: validated.thresholds,
      wideningSampleSize: magnitudes.length,
      medianMaximumWideningBasisPoints: median(magnitudes),
    };
  }
}

function validMagnitude(value: string): InstanceType<typeof MagnitudeDecimal> {
  let parsed: InstanceType<typeof MagnitudeDecimal>;
  try {
    parsed = new MagnitudeDecimal(value);
  } catch {
    throw new Error('Listing top-of-book maximum widening is invalid');
  }
  if (!parsed.isFinite() || parsed.isNegative()) {
    throw new Error('Listing top-of-book maximum widening is invalid');
  }
  return parsed;
}

function median(
  values: InstanceType<typeof MagnitudeDecimal>[],
): string | null {
  if (values.length === 0) return null;
  const ordered = [...values].sort((left, right) => left.comparedTo(right));
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 1
    ? ordered[middle].toString()
    : ordered[middle - 1].plus(ordered[middle]).dividedBy(2).toString();
}
