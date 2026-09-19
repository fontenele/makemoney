import Decimal from 'decimal.js';
import { ListingObservationPatternClassification } from '../domain/listing-observation-pattern-classification';
import { ListingObservationPatternMagnitudeCohort } from '../domain/listing-observation-pattern-magnitude-cohort';
import { ListingObservationPatternCohortCalculator } from './listing-observation-pattern-cohort-calculator';

const MagnitudeDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
});

export class ListingObservationPatternMagnitudeCohortCalculator {
  private readonly cohort = new ListingObservationPatternCohortCalculator();

  calculate(
    classifications: readonly ListingObservationPatternClassification[],
  ): ListingObservationPatternMagnitudeCohort {
    const validated = this.cohort.calculate(classifications);
    if (!validated.provider || !validated.thresholds) {
      return {
        provider: null,
        thresholds: null,
        pumpSampleSize: 0,
        correctionSampleSize: 0,
        medianPeakReturnRate: null,
        medianCorrectionFromPeakRate: null,
      };
    }

    const pumpThreshold = new MagnitudeDecimal(
      validated.thresholds.pumpReturnRate,
    );
    const correctionThreshold = new MagnitudeDecimal(
      validated.thresholds.correctionFromPeakRate,
    );
    const peakReturns: InstanceType<typeof MagnitudeDecimal>[] = [];
    const correctionRates: InstanceType<typeof MagnitudeDecimal>[] = [];

    for (const classification of classifications) {
      if (classification.peak) {
        peakReturns.push(
          validObservedRate(
            classification.peak.priceReturnRate,
            pumpThreshold,
            'peak return rate',
          ),
        );
      }
      if (classification.correction) {
        correctionRates.push(
          validObservedRate(
            classification.correction.drawdownFromPeakRate,
            correctionThreshold,
            'correction from peak rate',
            true,
          ),
        );
      }
    }

    return {
      provider: validated.provider,
      thresholds: validated.thresholds,
      pumpSampleSize: peakReturns.length,
      correctionSampleSize: correctionRates.length,
      medianPeakReturnRate: median(peakReturns),
      medianCorrectionFromPeakRate: median(correctionRates),
    };
  }
}

function validObservedRate(
  value: string,
  minimum: InstanceType<typeof MagnitudeDecimal>,
  field: string,
  boundedByOne = false,
): InstanceType<typeof MagnitudeDecimal> {
  let parsed: InstanceType<typeof MagnitudeDecimal>;
  try {
    parsed = new MagnitudeDecimal(value);
  } catch {
    throw new Error(`Listing observation ${field} is invalid`);
  }
  if (
    !parsed.isFinite() ||
    parsed.lessThan(minimum) ||
    (boundedByOne && parsed.greaterThan(1))
  ) {
    throw new Error(`Listing observation ${field} is invalid`);
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
