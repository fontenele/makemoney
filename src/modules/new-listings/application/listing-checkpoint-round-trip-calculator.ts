import Decimal from 'decimal.js';
import {
  ListingCheckpointRoundTrip,
  ListingCheckpointRoundTripConfiguration,
  ListingCheckpointRoundTripSelection,
} from '../domain/listing-checkpoint-round-trip';
import { LISTING_OBSERVATION_CHECKPOINTS } from '../domain/listing-observation-schedule';
import { validateListingTopOfBookObservation } from '../domain/listing-top-of-book-observation';
import { StoredListingTopOfBookCheckpoint } from '../domain/listing-top-of-book-observation-repository';

const RoundTripDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});
const RATE_PATTERN = /^(?:0|0\.\d+)$/;

export class ListingCheckpointRoundTripCalculator {
  calculate(
    entry: StoredListingTopOfBookCheckpoint,
    exit: StoredListingTopOfBookCheckpoint,
    configuration: ListingCheckpointRoundTripConfiguration,
  ): ListingCheckpointRoundTrip {
    validateListingTopOfBookObservation(entry);
    validateListingTopOfBookObservation(exit);
    if (entry.provider !== exit.provider || entry.symbol !== exit.symbol) {
      throw new Error('Listing round trip identity must match');
    }
    validateCheckpoint(entry);
    validateCheckpoint(exit);
    if (
      exit.offsetMs <= entry.offsetMs ||
      exit.targetAt.getTime() - entry.targetAt.getTime() !==
        exit.offsetMs - entry.offsetMs
    ) {
      throw new Error('Listing round trip checkpoint order is invalid');
    }

    const feeRate = rate(configuration.feeRate, 'fee');
    const slippageRate = rate(configuration.slippageRate, 'slippage');
    const entryAsk = new RoundTripDecimal(entry.askPrice);
    const exitBid = new RoundTripDecimal(exit.bidPrice);
    const executionBuyPrice = entryAsk.times(slippageRate.plus(1));
    const executionSellPrice = exitBid.times(
      new RoundTripDecimal(1).minus(slippageRate),
    );
    const grossReturnRate = exitBid.dividedBy(entryAsk).minus(1);
    const entryCost = executionBuyPrice.times(feeRate.plus(1));
    const exitProceeds = executionSellPrice.times(
      new RoundTripDecimal(1).minus(feeRate),
    );
    const netReturnRate = exitProceeds.dividedBy(entryCost).minus(1);

    return {
      provider: entry.provider,
      symbol: entry.symbol,
      configuration: {
        feeRate: feeRate.toFixed(),
        slippageRate: slippageRate.toFixed(),
      },
      entry: {
        label: entry.label,
        offsetMs: entry.offsetMs,
        referencePrice: entryAsk.toFixed(),
        executionPrice: executionBuyPrice.toFixed(),
      },
      exit: {
        label: exit.label,
        offsetMs: exit.offsetMs,
        referencePrice: exitBid.toFixed(),
        executionPrice: executionSellPrice.toFixed(),
      },
      durationMs: exit.offsetMs - entry.offsetMs,
      grossReturnRate: grossReturnRate.toFixed(),
      netReturnRate: netReturnRate.toFixed(),
      profitableAfterCosts: netReturnRate.greaterThan(0),
    };
  }
}

export function validateListingCheckpointRoundTripSelection(
  selection: ListingCheckpointRoundTripSelection,
): void {
  const entry = LISTING_OBSERVATION_CHECKPOINTS.find(
    ({ label }) => label === selection.entryLabel,
  );
  const exit = LISTING_OBSERVATION_CHECKPOINTS.find(
    ({ label }) => label === selection.exitLabel,
  );
  if (!entry || !exit || exit.offsetMs <= entry.offsetMs) {
    throw new Error('Listing round trip checkpoint selection is invalid');
  }
  rate(selection.feeRate, 'fee');
  rate(selection.slippageRate, 'slippage');
}

function validateCheckpoint(
  checkpoint: StoredListingTopOfBookCheckpoint,
): void {
  const expected = LISTING_OBSERVATION_CHECKPOINTS.find(
    ({ label }) => label === checkpoint.label,
  );
  if (
    !expected ||
    expected.offsetMs !== checkpoint.offsetMs ||
    !(checkpoint.targetAt instanceof Date) ||
    !Number.isFinite(checkpoint.targetAt.getTime())
  ) {
    throw new Error('Listing round trip checkpoint is invalid');
  }
}

function rate(
  value: string,
  field: 'fee' | 'slippage',
): InstanceType<typeof RoundTripDecimal> {
  if (typeof value !== 'string' || !RATE_PATTERN.test(value)) {
    throw new Error(`Listing round trip ${field} rate is invalid`);
  }
  const parsed = new RoundTripDecimal(value);
  if (parsed.greaterThanOrEqualTo(1)) {
    throw new Error(`Listing round trip ${field} rate is invalid`);
  }
  return parsed;
}
