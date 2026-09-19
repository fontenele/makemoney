import Decimal from 'decimal.js';
import {
  ListingObservationPatternClassification,
  ListingObservationPatternThresholds,
} from '../domain/listing-observation-pattern-classification';
import { ListingObservationPricePerformance } from '../domain/listing-observation-price-performance';
import { LISTING_OBSERVATION_CHECKPOINTS } from '../domain/listing-observation-schedule';

const PatternDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
});

export class ListingObservationPatternClassifier {
  classify(
    performance: ListingObservationPricePerformance,
    thresholds: ListingObservationPatternThresholds,
  ): ListingObservationPatternClassification {
    const pumpThreshold = positiveRate(
      thresholds.pumpReturnRate,
      'pump return rate',
    );
    const correctionThreshold = positiveRate(
      thresholds.correctionFromPeakRate,
      'correction from peak rate',
    );
    if (correctionThreshold.greaterThan(1)) {
      throw new Error('Correction from peak rate must not exceed one');
    }
    validatePerformance(performance);

    let pumpIndex = -1;
    for (let index = 0; index < performance.points.length; index += 1) {
      if (
        new PatternDecimal(
          performance.points[index].priceReturnRate,
        ).greaterThanOrEqualTo(pumpThreshold)
      ) {
        pumpIndex = index;
        break;
      }
    }

    const last = performance.points.at(-1)!;
    if (pumpIndex < 0) {
      return {
        provider: performance.provider,
        symbol: performance.symbol,
        status: 'no-pump-observed',
        thresholds,
        evaluatedThroughLabel: last.label,
        pump: null,
        peak: null,
        correction: null,
      };
    }

    const pumpPoint = performance.points[pumpIndex];
    let peakPoint = pumpPoint;
    let peakPrice = new PatternDecimal(pumpPoint.lastPrice);
    let correction: ListingObservationPatternClassification['correction'] =
      null;

    for (const point of performance.points.slice(pumpIndex + 1)) {
      const price = new PatternDecimal(point.lastPrice);
      if (price.greaterThan(peakPrice)) {
        peakPoint = point;
        peakPrice = price;
        continue;
      }
      const drawdown = peakPrice.minus(price).dividedBy(peakPrice);
      if (drawdown.greaterThanOrEqualTo(correctionThreshold)) {
        correction = {
          label: point.label,
          offsetMs: point.offsetMs,
          priceReturnRate: point.priceReturnRate,
          drawdownFromPeakRate: drawdown.toString(),
        };
        break;
      }
    }

    return {
      provider: performance.provider,
      symbol: performance.symbol,
      status: correction ? 'pump-and-correction-observed' : 'pump-observed',
      thresholds,
      evaluatedThroughLabel: last.label,
      pump: event(pumpPoint),
      peak: { ...event(peakPoint), lastPrice: peakPoint.lastPrice },
      correction,
    };
  }
}

function event(point: ListingObservationPricePerformance['points'][number]) {
  return {
    label: point.label,
    offsetMs: point.offsetMs,
    priceReturnRate: point.priceReturnRate,
  };
}

function positiveRate(value: string, field: string) {
  let parsed: InstanceType<typeof PatternDecimal>;
  try {
    parsed = new PatternDecimal(value);
  } catch {
    throw new Error(`${field} must be a positive decimal`);
  }
  if (!parsed.isFinite() || !parsed.greaterThan(0)) {
    throw new Error(`${field} must be a positive decimal`);
  }
  return parsed;
}

function validatePerformance(performance: ListingObservationPricePerformance) {
  if (
    performance.provider !== 'binance' ||
    !/^[A-Z0-9]{1,40}$/.test(performance.symbol) ||
    performance.baselineLabel !== 'T+0' ||
    performance.points.length === 0
  ) {
    throw new Error('Listing observation performance is invalid');
  }
  const labels = new Set<string>();
  let priorOffset = -1;
  for (const point of performance.points) {
    const schedule = LISTING_OBSERVATION_CHECKPOINTS.find(
      ({ label }) => label === point.label,
    );
    let price: InstanceType<typeof PatternDecimal>;
    let returnRate: InstanceType<typeof PatternDecimal>;
    try {
      price = new PatternDecimal(point.lastPrice);
      returnRate = new PatternDecimal(point.priceReturnRate);
    } catch {
      throw new Error('Listing observation performance point is invalid');
    }
    if (
      !schedule ||
      schedule.offsetMs !== point.offsetMs ||
      point.offsetMs <= priorOffset ||
      labels.has(point.label) ||
      !price.isFinite() ||
      !price.greaterThan(0) ||
      !returnRate.isFinite()
    ) {
      throw new Error('Listing observation performance point is invalid');
    }
    labels.add(point.label);
    priorOffset = point.offsetMs;
  }
  if (performance.points[0].label !== 'T+0') {
    throw new Error('Listing observation performance must start at T+0');
  }
}
