import Decimal from 'decimal.js';
import { ListingObservationPricePathStatistics } from '../domain/listing-observation-price-path-statistics';
import { CompletedListingObservationCheckpoint } from '../domain/listing-observation-schedule';
import { ListingObservationPricePerformanceCalculator } from './listing-observation-price-performance-calculator';

const PathDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});

export class ListingObservationPricePathStatisticsCalculator {
  private readonly performance =
    new ListingObservationPricePerformanceCalculator();

  calculate(
    observations: readonly CompletedListingObservationCheckpoint[],
  ): ListingObservationPricePathStatistics | null {
    const performance = this.performance.calculate(observations);
    if (!performance) return null;

    let observedHigh = performance.points[0];
    let observedHighPrice = new PathDecimal(observedHigh.lastPrice);
    let observedLow = performance.points[0];
    let observedLowPrice = observedHighPrice;
    let runningPeak = performance.points[0];
    let runningPeakPrice = observedHighPrice;
    let drawdownPeak = runningPeak;
    let drawdownTrough = runningPeak;
    let maximumDrawdown = new PathDecimal(0);

    for (const point of performance.points.slice(1)) {
      const price = new PathDecimal(point.lastPrice);
      if (price.greaterThan(observedHighPrice)) {
        observedHigh = point;
        observedHighPrice = price;
      }
      if (price.lessThan(observedLowPrice)) {
        observedLow = point;
        observedLowPrice = price;
      }
      if (price.greaterThan(runningPeakPrice)) {
        runningPeak = point;
        runningPeakPrice = price;
        continue;
      }
      const drawdown = runningPeakPrice.minus(price);
      if (drawdown.greaterThan(maximumDrawdown)) {
        maximumDrawdown = drawdown;
        drawdownPeak = runningPeak;
        drawdownTrough = point;
      }
    }

    return {
      provider: performance.provider,
      symbol: performance.symbol,
      observedHigh: event(observedHigh),
      observedLow: event(observedLow),
      maximumDrawdown: {
        peak: event(drawdownPeak),
        trough: event(drawdownTrough),
        absolutePriceDrawdown: maximumDrawdown.toFixed(),
        priceDrawdownRate: maximumDrawdown
          .dividedBy(drawdownPeak.lastPrice)
          .toFixed(),
      },
    };
  }
}

function event(point: {
  label: ListingObservationPricePathStatistics['observedHigh']['label'];
  offsetMs: number;
  lastPrice: string;
}) {
  return {
    label: point.label,
    offsetMs: point.offsetMs,
    lastPrice: point.lastPrice,
  };
}
