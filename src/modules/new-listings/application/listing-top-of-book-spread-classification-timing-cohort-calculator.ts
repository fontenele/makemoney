import { ListingTopOfBookSpreadClassification } from '../domain/listing-top-of-book-spread-classification';
import { ListingTopOfBookSpreadClassificationTimingCohort } from '../domain/listing-top-of-book-spread-classification-timing-cohort';
import { LISTING_OBSERVATION_CHECKPOINTS } from '../domain/listing-observation-schedule';
import { ListingTopOfBookSpreadClassificationCohortCalculator } from './listing-top-of-book-spread-classification-cohort-calculator';

export class ListingTopOfBookSpreadClassificationTimingCohortCalculator {
  private readonly cohort =
    new ListingTopOfBookSpreadClassificationCohortCalculator();

  calculate(
    classifications: readonly ListingTopOfBookSpreadClassification[],
  ): ListingTopOfBookSpreadClassificationTimingCohort {
    const validated = this.cohort.calculate(classifications);
    if (!validated.provider || !validated.thresholds) {
      return {
        provider: null,
        thresholds: null,
        wideningSampleSize: 0,
        medianTimeToWideningMs: null,
      };
    }

    const timesToWideningMs: number[] = [];
    for (const classification of classifications) {
      const evaluatedThroughOffset = scheduledOffset(
        classification.evaluatedThroughLabel,
      );
      if (!classification.widening) continue;
      const wideningOffset = scheduledOffset(
        classification.widening.label,
        classification.widening.offsetMs,
      );
      if (wideningOffset === 0 || wideningOffset > evaluatedThroughOffset) {
        throw new Error(
          'Listing top-of-book spread classification event order is invalid',
        );
      }
      timesToWideningMs.push(wideningOffset);
    }

    return {
      provider: validated.provider,
      thresholds: validated.thresholds,
      wideningSampleSize: timesToWideningMs.length,
      medianTimeToWideningMs: median(timesToWideningMs),
    };
  }
}

function scheduledOffset(label: string, offsetMs?: number): number {
  const checkpoint = LISTING_OBSERVATION_CHECKPOINTS.find(
    (candidate) => candidate.label === label,
  );
  if (
    !checkpoint ||
    (offsetMs !== undefined && checkpoint.offsetMs !== offsetMs)
  ) {
    throw new Error(
      'Listing top-of-book spread classification event schedule is invalid',
    );
  }
  return checkpoint.offsetMs;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 1
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
}
