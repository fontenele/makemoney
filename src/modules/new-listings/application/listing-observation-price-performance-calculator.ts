import Decimal from 'decimal.js';
import { validateListingMarketObservation } from '../domain/listing-market-observation';
import {
  CompletedListingObservationCheckpoint,
  LISTING_OBSERVATION_CHECKPOINTS,
} from '../domain/listing-observation-schedule';
import { ListingObservationPricePerformance } from '../domain/listing-observation-price-performance';

const PerformanceDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});

export class ListingObservationPricePerformanceCalculator {
  calculate(
    observations: readonly CompletedListingObservationCheckpoint[],
  ): ListingObservationPricePerformance | null {
    if (observations.length === 0) return null;

    const ordered = [...observations].sort(
      (left, right) =>
        left.offsetMs - right.offsetMs || left.label.localeCompare(right.label),
    );
    const labels = new Set<string>();
    const { provider, symbol } = ordered[0];
    for (const observation of ordered) {
      validateObservation(observation, provider, symbol, labels);
    }

    const baseline = ordered.find(({ label }) => label === 'T+0');
    if (!baseline) return null;
    const baselinePrice = new PerformanceDecimal(baseline.lastPrice);

    return {
      provider,
      symbol,
      baselineLabel: 'T+0',
      baselinePrice: baselinePrice.toFixed(),
      points: ordered.map((observation) => {
        const price = new PerformanceDecimal(observation.lastPrice);
        const absolutePriceChange = price.minus(baselinePrice);
        return {
          label: observation.label,
          offsetMs: observation.offsetMs,
          targetAt: observation.targetAt,
          completedAt: observation.completedAt,
          lastPrice: price.toFixed(),
          absolutePriceChange: absolutePriceChange.toFixed(),
          priceReturnRate: absolutePriceChange
            .dividedBy(baselinePrice)
            .toFixed(),
        };
      }),
    };
  }
}

function validateObservation(
  observation: CompletedListingObservationCheckpoint,
  provider: 'binance',
  symbol: string,
  labels: Set<string>,
): void {
  validateListingMarketObservation(observation);
  if (observation.provider !== provider || observation.symbol !== symbol) {
    throw new Error('Listing observations must share one provider and symbol');
  }
  if (labels.has(observation.label)) {
    throw new Error('Listing observation checkpoint labels must be unique');
  }
  labels.add(observation.label);
  const schedule = LISTING_OBSERVATION_CHECKPOINTS.find(
    ({ label }) => label === observation.label,
  );
  if (!schedule || schedule.offsetMs !== observation.offsetMs) {
    throw new Error('Listing observation checkpoint schedule is invalid');
  }
  if (
    !Number.isFinite(observation.targetAt.getTime()) ||
    !Number.isFinite(observation.completedAt.getTime()) ||
    observation.completedAt < observation.targetAt
  ) {
    throw new Error('Listing observation checkpoint times are invalid');
  }
}
