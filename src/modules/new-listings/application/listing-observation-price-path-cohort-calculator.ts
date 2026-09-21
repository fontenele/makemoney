import Decimal from 'decimal.js';
import { ListingObservationPricePathCohort } from '../domain/listing-observation-price-path-cohort';
import {
  ListingObservationPricePathEvent,
  ListingObservationPricePathStatistics,
} from '../domain/listing-observation-price-path-statistics';
import { LISTING_OBSERVATION_CHECKPOINTS } from '../domain/listing-observation-schedule';

const CohortDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});

export class ListingObservationPricePathCohortCalculator {
  calculate(
    statistics: readonly ListingObservationPricePathStatistics[],
  ): ListingObservationPricePathCohort {
    if (statistics.length === 0) {
      return {
        provider: null,
        sampleSize: 0,
        medianObservedHighOffsetMs: null,
        medianObservedLowOffsetMs: null,
        drawdownSampleSize: 0,
        medianMaximumDrawdownRate: null,
        medianMaximumDrawdownDurationMs: null,
      };
    }

    const symbols = new Set<string>();
    const highOffsets: number[] = [];
    const lowOffsets: number[] = [];
    const drawdownRates: InstanceType<typeof CohortDecimal>[] = [];
    const drawdownDurations: number[] = [];

    for (const path of statistics) {
      if (
        path.provider !== 'binance' ||
        !/^[A-Z0-9]{1,30}$/.test(path.symbol)
      ) {
        throw new Error('Listing price-path cohort identity is invalid');
      }
      if (symbols.has(path.symbol)) {
        throw new Error('Listing price-path cohort symbols must be unique');
      }
      symbols.add(path.symbol);

      highOffsets.push(validEvent(path.observedHigh));
      lowOffsets.push(validEvent(path.observedLow));
      const peakOffset = validEvent(path.maximumDrawdown.peak);
      const troughOffset = validEvent(path.maximumDrawdown.trough);
      if (troughOffset < peakOffset) {
        throw new Error('Listing price-path drawdown order is invalid');
      }

      const peakPrice = positiveDecimal(path.maximumDrawdown.peak.lastPrice);
      const troughPrice = positiveDecimal(
        path.maximumDrawdown.trough.lastPrice,
      );
      const absolute = nonNegativeDecimal(
        path.maximumDrawdown.absolutePriceDrawdown,
      );
      const rate = nonNegativeDecimal(path.maximumDrawdown.priceDrawdownRate);
      if (
        !peakPrice.minus(troughPrice).equals(absolute) ||
        !absolute.dividedBy(peakPrice).equals(rate)
      ) {
        throw new Error('Listing price-path drawdown values are inconsistent');
      }
      if (absolute.greaterThan(0)) {
        drawdownRates.push(rate);
        drawdownDurations.push(troughOffset - peakOffset);
      }
    }

    return {
      provider: 'binance',
      sampleSize: statistics.length,
      medianObservedHighOffsetMs: medianNumber(highOffsets),
      medianObservedLowOffsetMs: medianNumber(lowOffsets),
      drawdownSampleSize: drawdownRates.length,
      medianMaximumDrawdownRate: medianDecimal(drawdownRates),
      medianMaximumDrawdownDurationMs: medianNumber(drawdownDurations),
    };
  }
}

function validEvent(event: ListingObservationPricePathEvent): number {
  const checkpoint = LISTING_OBSERVATION_CHECKPOINTS.find(
    ({ label }) => label === event.label,
  );
  if (!checkpoint || checkpoint.offsetMs !== event.offsetMs) {
    throw new Error('Listing price-path event schedule is invalid');
  }
  positiveDecimal(event.lastPrice);
  return event.offsetMs;
}

function positiveDecimal(value: string): InstanceType<typeof CohortDecimal> {
  const parsed = decimal(value);
  if (!parsed.greaterThan(0)) {
    throw new Error('Listing price-path price is invalid');
  }
  return parsed;
}

function nonNegativeDecimal(value: string): InstanceType<typeof CohortDecimal> {
  const parsed = decimal(value);
  if (parsed.isNegative()) {
    throw new Error('Listing price-path drawdown value is invalid');
  }
  return parsed;
}

function decimal(value: string): InstanceType<typeof CohortDecimal> {
  try {
    const parsed = new CohortDecimal(value);
    if (parsed.isFinite()) return parsed;
  } catch {
    throw new Error('Listing price-path decimal is invalid');
  }
  throw new Error('Listing price-path decimal is invalid');
}

function medianDecimal(
  values: InstanceType<typeof CohortDecimal>[],
): string | null {
  if (values.length === 0) return null;
  const ordered = [...values].sort((left, right) => left.comparedTo(right));
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 1
    ? ordered[middle].toFixed()
    : ordered[middle - 1].plus(ordered[middle]).dividedBy(2).toFixed();
}

function medianNumber(values: number[]): number | null {
  if (values.length === 0) return null;
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 1
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
}
