import Decimal from 'decimal.js';
import { ListingTopOfBookSpreadEvolution } from '../domain/listing-top-of-book-spread-evolution';
import { StoredListingTopOfBookCheckpoint } from '../domain/listing-top-of-book-observation-repository';
import { LISTING_OBSERVATION_CHECKPOINTS } from '../domain/listing-observation-schedule';
import { ListingTopOfBookSpreadCalculator } from './listing-top-of-book-spread-calculator';

const EvolutionDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});

export class ListingTopOfBookSpreadEvolutionCalculator {
  constructor(
    private readonly spreadCalculator = new ListingTopOfBookSpreadCalculator(),
  ) {}

  calculate(
    checkpoints: readonly StoredListingTopOfBookCheckpoint[],
  ): ListingTopOfBookSpreadEvolution | null {
    if (checkpoints.length === 0) return null;

    const ordered = [...checkpoints].sort(
      (left, right) =>
        left.offsetMs - right.offsetMs || left.label.localeCompare(right.label),
    );
    const { provider, symbol } = ordered[0];
    const labels = new Set<string>();
    const spreads = ordered.map((checkpoint) => {
      validateCheckpoint(checkpoint, provider, symbol, labels);
      return {
        checkpoint,
        spread: this.spreadCalculator.calculate(checkpoint),
      };
    });
    const baseline = spreads.find(
      ({ checkpoint }) => checkpoint.label === 'T+0',
    );
    if (!baseline) return null;
    const baselineBasisPoints = new EvolutionDecimal(
      baseline.spread.spreadBasisPoints,
    );

    return {
      provider,
      symbol,
      baselineLabel: 'T+0',
      baselineSpreadBasisPoints: baselineBasisPoints.toFixed(),
      points: spreads.map(({ checkpoint, spread }) => ({
        label: checkpoint.label,
        offsetMs: checkpoint.offsetMs,
        targetAt: checkpoint.targetAt,
        spreadBasisPoints: spread.spreadBasisPoints,
        spreadBasisPointsChange: new EvolutionDecimal(spread.spreadBasisPoints)
          .minus(baselineBasisPoints)
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
