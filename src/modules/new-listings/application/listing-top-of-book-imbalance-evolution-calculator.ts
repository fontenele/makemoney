import Decimal from 'decimal.js';
import { ListingTopOfBookImbalanceEvolution } from '../domain/listing-top-of-book-imbalance-evolution';
import { StoredListingTopOfBookCheckpoint } from '../domain/listing-top-of-book-observation-repository';
import { LISTING_OBSERVATION_CHECKPOINTS } from '../domain/listing-observation-schedule';
import { ListingTopOfBookImbalanceCalculator } from './listing-top-of-book-imbalance-calculator';

const EvolutionDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});

export class ListingTopOfBookImbalanceEvolutionCalculator {
  constructor(
    private readonly imbalanceCalculator = new ListingTopOfBookImbalanceCalculator(),
  ) {}

  calculate(
    checkpoints: readonly StoredListingTopOfBookCheckpoint[],
  ): ListingTopOfBookImbalanceEvolution | null {
    if (checkpoints.length === 0) return null;

    const ordered = [...checkpoints].sort(
      (left, right) =>
        left.offsetMs - right.offsetMs || left.label.localeCompare(right.label),
    );
    const { provider, symbol } = ordered[0];
    const labels = new Set<string>();
    const imbalances = ordered.map((checkpoint) => {
      validateCheckpoint(checkpoint, provider, symbol, labels);
      return {
        checkpoint,
        imbalance: this.imbalanceCalculator.calculate(checkpoint),
      };
    });
    const baseline = imbalances.find(
      ({ checkpoint }) => checkpoint.label === 'T+0',
    );
    if (!baseline || baseline.imbalance.imbalanceRate === null) return null;
    const baselineRate = new EvolutionDecimal(baseline.imbalance.imbalanceRate);

    return {
      provider,
      symbol,
      baselineLabel: 'T+0',
      baselineImbalanceRate: baselineRate.toFixed(),
      points: imbalances.map(({ checkpoint, imbalance }) => ({
        label: checkpoint.label,
        offsetMs: checkpoint.offsetMs,
        targetAt: checkpoint.targetAt,
        imbalanceRate: imbalance.imbalanceRate,
        imbalanceChange:
          imbalance.imbalanceRate === null
            ? null
            : new EvolutionDecimal(imbalance.imbalanceRate)
                .minus(baselineRate)
                .toFixed(),
      })),
    };
  }
}

function validateCheckpoint(
  checkpoint: StoredListingTopOfBookCheckpoint,
  provider: 'binance',
  symbol: string,
  labels: Set<string>,
): void {
  if (checkpoint.provider !== provider || checkpoint.symbol !== symbol) {
    throw new Error('Listing top-of-book checkpoints must share one identity');
  }
  if (labels.has(checkpoint.label)) {
    throw new Error('Listing top-of-book checkpoint labels must be unique');
  }
  labels.add(checkpoint.label);
  const schedule = LISTING_OBSERVATION_CHECKPOINTS.find(
    ({ label }) => label === checkpoint.label,
  );
  if (!schedule || schedule.offsetMs !== checkpoint.offsetMs) {
    throw new Error('Listing top-of-book checkpoint schedule is invalid');
  }
  if (!Number.isFinite(checkpoint.targetAt.getTime())) {
    throw new Error('Listing top-of-book checkpoint time is invalid');
  }
}
