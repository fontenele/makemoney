import Decimal from 'decimal.js';
import { CompletedListingObservationCheckpoint } from '../domain/listing-observation-schedule';
import {
  ListingObservationPriceTransition,
  ListingObservationPriceVariability,
} from '../domain/listing-observation-price-variability';
import { ListingObservationPricePerformanceCalculator } from './listing-observation-price-performance-calculator';

const VariabilityDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});

export class ListingObservationPriceVariabilityCalculator {
  private readonly performance =
    new ListingObservationPricePerformanceCalculator();

  calculate(
    observations: readonly CompletedListingObservationCheckpoint[],
  ): ListingObservationPriceVariability | null {
    const performance = this.performance.calculate(observations);
    if (!performance) return null;

    const transitions: ListingObservationPriceTransition[] = [];
    let absoluteReturnTotal = new VariabilityDecimal(0);
    let maximumAbsoluteReturn: ListingObservationPriceTransition | null = null;
    let maximumAbsoluteRate = new VariabilityDecimal(-1);

    for (let index = 1; index < performance.points.length; index += 1) {
      const from = performance.points[index - 1];
      const to = performance.points[index];
      const returnRate = new VariabilityDecimal(to.lastPrice)
        .minus(from.lastPrice)
        .dividedBy(from.lastPrice);
      const absoluteReturnRate = returnRate.abs();
      const transition: ListingObservationPriceTransition = {
        from: event(from),
        to: event(to),
        durationMs: to.offsetMs - from.offsetMs,
        returnRate: returnRate.toFixed(),
        absoluteReturnRate: absoluteReturnRate.toFixed(),
      };
      transitions.push(transition);
      absoluteReturnTotal = absoluteReturnTotal.plus(absoluteReturnRate);
      if (absoluteReturnRate.greaterThan(maximumAbsoluteRate)) {
        maximumAbsoluteRate = absoluteReturnRate;
        maximumAbsoluteReturn = transition;
      }
    }

    return {
      provider: performance.provider,
      symbol: performance.symbol,
      transitionCount: transitions.length,
      averageAbsoluteReturnRate:
        transitions.length === 0
          ? null
          : absoluteReturnTotal.dividedBy(transitions.length).toFixed(),
      maximumAbsoluteReturn,
    };
  }
}

function event(point: {
  label: ListingObservationPriceTransition['from']['label'];
  offsetMs: number;
  lastPrice: string;
}) {
  return {
    label: point.label,
    offsetMs: point.offsetMs,
    lastPrice: point.lastPrice,
  };
}
