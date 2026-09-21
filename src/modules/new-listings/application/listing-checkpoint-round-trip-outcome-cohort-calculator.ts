import Decimal from 'decimal.js';
import { ListingCheckpointRoundTripCohortSample } from '../domain/listing-checkpoint-round-trip-cohort';
import { ListingCheckpointRoundTripOutcomeCohort } from '../domain/listing-checkpoint-round-trip-outcome-cohort';
import { ListingCheckpointRoundTripSelection } from '../domain/listing-checkpoint-round-trip';
import { ListingCheckpointRoundTripCohortCalculator } from './listing-checkpoint-round-trip-cohort-calculator';

const OutcomeDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});

export class ListingCheckpointRoundTripOutcomeCohortCalculator {
  private readonly cohort = new ListingCheckpointRoundTripCohortCalculator();

  calculate(
    selection: ListingCheckpointRoundTripSelection,
    samples: readonly ListingCheckpointRoundTripCohortSample[],
  ): ListingCheckpointRoundTripOutcomeCohort {
    const validated = this.cohort.calculate(selection, samples);
    const profitable: InstanceType<typeof OutcomeDecimal>[] = [];
    const losing: InstanceType<typeof OutcomeDecimal>[] = [];
    let breakEvenAfterCostsCount = 0;

    for (const sample of samples) {
      if (!sample.roundTrip) continue;
      const netReturn = new OutcomeDecimal(sample.roundTrip.netReturnRate);
      if (netReturn.greaterThan(0)) profitable.push(netReturn);
      else if (netReturn.lessThan(0)) losing.push(netReturn);
      else breakEvenAfterCostsCount += 1;
    }

    return {
      provider: validated.provider,
      selection: validated.selection,
      sampleSize: validated.sampleSize,
      availableSampleSize: validated.availableSampleSize,
      unavailableSampleSize: validated.unavailableSampleSize,
      profitableAfterCostsCount: profitable.length,
      losingAfterCostsCount: losing.length,
      breakEvenAfterCostsCount,
      averageProfitableNetReturnRate: average(profitable),
      averageLosingNetReturnRate: average(losing),
    };
  }
}

function average(values: InstanceType<typeof OutcomeDecimal>[]): string | null {
  if (values.length === 0) return null;
  return values
    .reduce((sum, value) => sum.plus(value), new OutcomeDecimal(0))
    .dividedBy(values.length)
    .toFixed();
}
