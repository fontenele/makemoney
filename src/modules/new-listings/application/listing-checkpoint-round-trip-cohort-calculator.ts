import Decimal from 'decimal.js';
import {
  ListingCheckpointRoundTripCohort,
  ListingCheckpointRoundTripCohortSample,
} from '../domain/listing-checkpoint-round-trip-cohort';
import {
  ListingCheckpointRoundTrip,
  ListingCheckpointRoundTripSelection,
} from '../domain/listing-checkpoint-round-trip';
import { LISTING_OBSERVATION_CHECKPOINTS } from '../domain/listing-observation-schedule';
import { validateListingCheckpointRoundTripSelection } from './listing-checkpoint-round-trip-calculator';

const CohortDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});

export class ListingCheckpointRoundTripCohortCalculator {
  calculate(
    selection: ListingCheckpointRoundTripSelection,
    samples: readonly ListingCheckpointRoundTripCohortSample[],
  ): ListingCheckpointRoundTripCohort {
    validateListingCheckpointRoundTripSelection(selection);
    const symbols = new Set<string>();
    const grossReturns: InstanceType<typeof CohortDecimal>[] = [];
    const netReturns: InstanceType<typeof CohortDecimal>[] = [];
    let profitableAfterCostsCount = 0;

    for (const sample of samples) {
      validateSampleIdentity(sample, symbols);
      if (!sample.roundTrip) continue;
      const values = validateRoundTrip(sample, selection);
      grossReturns.push(values.grossReturn);
      netReturns.push(values.netReturn);
      if (sample.roundTrip.profitableAfterCosts) {
        profitableAfterCostsCount += 1;
      }
    }

    const availableSampleSize = netReturns.length;
    return {
      provider: samples.length === 0 ? null : 'binance',
      selection: { ...selection },
      sampleSize: samples.length,
      availableSampleSize,
      unavailableSampleSize: samples.length - availableSampleSize,
      profitableAfterCostsCount,
      nonProfitableAfterCostsCount:
        availableSampleSize - profitableAfterCostsCount,
      profitableAfterCostsRate:
        availableSampleSize === 0
          ? null
          : new CohortDecimal(profitableAfterCostsCount)
              .dividedBy(availableSampleSize)
              .toFixed(),
      averageGrossReturnRate: average(grossReturns),
      averageNetReturnRate: average(netReturns),
      medianNetReturnRate: median(netReturns),
    };
  }
}

function validateSampleIdentity(
  sample: ListingCheckpointRoundTripCohortSample,
  symbols: Set<string>,
): void {
  if (
    sample.provider !== 'binance' ||
    !/^[A-Z0-9]{1,30}$/.test(sample.symbol)
  ) {
    throw new Error('Listing round trip cohort identity is invalid');
  }
  if (symbols.has(sample.symbol)) {
    throw new Error('Listing round trip cohort symbols must be unique');
  }
  symbols.add(sample.symbol);
}

function validateRoundTrip(
  sample: ListingCheckpointRoundTripCohortSample,
  selection: ListingCheckpointRoundTripSelection,
): {
  grossReturn: InstanceType<typeof CohortDecimal>;
  netReturn: InstanceType<typeof CohortDecimal>;
} {
  const roundTrip = sample.roundTrip as ListingCheckpointRoundTrip;
  if (
    roundTrip.provider !== sample.provider ||
    roundTrip.symbol !== sample.symbol ||
    roundTrip.entry.label !== selection.entryLabel ||
    roundTrip.exit.label !== selection.exitLabel ||
    roundTrip.configuration.feeRate !== selection.feeRate ||
    roundTrip.configuration.slippageRate !== selection.slippageRate
  ) {
    throw new Error('Listing round trip cohort configuration is inconsistent');
  }
  const entrySchedule = LISTING_OBSERVATION_CHECKPOINTS.find(
    ({ label }) => label === roundTrip.entry.label,
  );
  const exitSchedule = LISTING_OBSERVATION_CHECKPOINTS.find(
    ({ label }) => label === roundTrip.exit.label,
  );
  if (
    !entrySchedule ||
    !exitSchedule ||
    roundTrip.entry.offsetMs !== entrySchedule.offsetMs ||
    roundTrip.exit.offsetMs !== exitSchedule.offsetMs ||
    roundTrip.durationMs !== exitSchedule.offsetMs - entrySchedule.offsetMs
  ) {
    throw new Error('Listing round trip cohort schedule is inconsistent');
  }

  const fee = decimal(selection.feeRate);
  const slippage = decimal(selection.slippageRate);
  const entryReference = positiveDecimal(roundTrip.entry.referencePrice);
  const exitReference = positiveDecimal(roundTrip.exit.referencePrice);
  const entryExecution = positiveDecimal(roundTrip.entry.executionPrice);
  const exitExecution = positiveDecimal(roundTrip.exit.executionPrice);
  const grossReturn = decimal(roundTrip.grossReturnRate);
  const netReturn = decimal(roundTrip.netReturnRate);
  const expectedGross = exitReference.dividedBy(entryReference).minus(1);
  const expectedNet = exitExecution
    .times(new CohortDecimal(1).minus(fee))
    .dividedBy(entryExecution.times(fee.plus(1)))
    .minus(1);
  if (
    !entryExecution.equals(entryReference.times(slippage.plus(1))) ||
    !exitExecution.equals(
      exitReference.times(new CohortDecimal(1).minus(slippage)),
    ) ||
    !grossReturn.equals(expectedGross) ||
    !netReturn.equals(expectedNet) ||
    roundTrip.profitableAfterCosts !== netReturn.greaterThan(0)
  ) {
    throw new Error('Listing round trip cohort values are inconsistent');
  }
  return { grossReturn, netReturn };
}

function positiveDecimal(value: string): InstanceType<typeof CohortDecimal> {
  const parsed = decimal(value);
  if (!parsed.greaterThan(0)) {
    throw new Error('Listing round trip cohort price is invalid');
  }
  return parsed;
}

function decimal(value: string): InstanceType<typeof CohortDecimal> {
  try {
    const parsed = new CohortDecimal(value);
    if (parsed.isFinite()) return parsed;
  } catch {
    throw new Error('Listing round trip cohort decimal is invalid');
  }
  throw new Error('Listing round trip cohort decimal is invalid');
}

function average(values: InstanceType<typeof CohortDecimal>[]): string | null {
  if (values.length === 0) return null;
  return values
    .reduce((sum, value) => sum.plus(value), new CohortDecimal(0))
    .dividedBy(values.length)
    .toFixed();
}

function median(values: InstanceType<typeof CohortDecimal>[]): string | null {
  if (values.length === 0) return null;
  const ordered = [...values].sort((left, right) => left.comparedTo(right));
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 1
    ? ordered[middle].toFixed()
    : ordered[middle - 1].plus(ordered[middle]).dividedBy(2).toFixed();
}
