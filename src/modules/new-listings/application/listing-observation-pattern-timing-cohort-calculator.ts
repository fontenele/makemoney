import { ListingObservationPatternClassification } from '../domain/listing-observation-pattern-classification';
import { ListingObservationPatternTimingCohort } from '../domain/listing-observation-pattern-timing-cohort';
import { LISTING_OBSERVATION_CHECKPOINTS } from '../domain/listing-observation-schedule';
import { ListingObservationPatternCohortCalculator } from './listing-observation-pattern-cohort-calculator';

export class ListingObservationPatternTimingCohortCalculator {
  private readonly cohort = new ListingObservationPatternCohortCalculator();

  calculate(
    classifications: readonly ListingObservationPatternClassification[],
  ): ListingObservationPatternTimingCohort {
    const validated = this.cohort.calculate(classifications);
    if (!validated.provider || !validated.thresholds) {
      return {
        provider: null,
        thresholds: null,
        pumpSampleSize: 0,
        correctionSampleSize: 0,
        medianTimeToPumpMs: null,
        medianTimeFromPeakToCorrectionMs: null,
      };
    }

    const timeToPumpMs: number[] = [];
    const timeFromPeakToCorrectionMs: number[] = [];
    for (const classification of classifications) {
      if (!classification.pump || !classification.peak) continue;
      const pumpOffset = validScheduledOffset(classification.pump);
      const peakOffset = validScheduledOffset(classification.peak);
      if (peakOffset < pumpOffset) {
        throw new Error('Listing observation pattern event order is invalid');
      }
      timeToPumpMs.push(pumpOffset);

      if (classification.correction) {
        const correctionOffset = validScheduledOffset(
          classification.correction,
        );
        if (correctionOffset <= peakOffset) {
          throw new Error('Listing observation pattern event order is invalid');
        }
        timeFromPeakToCorrectionMs.push(correctionOffset - peakOffset);
      }
    }

    return {
      provider: validated.provider,
      thresholds: validated.thresholds,
      pumpSampleSize: timeToPumpMs.length,
      correctionSampleSize: timeFromPeakToCorrectionMs.length,
      medianTimeToPumpMs: median(timeToPumpMs),
      medianTimeFromPeakToCorrectionMs: median(timeFromPeakToCorrectionMs),
    };
  }
}

function validScheduledOffset(event: { label: string; offsetMs: number }) {
  const checkpoint = LISTING_OBSERVATION_CHECKPOINTS.find(
    ({ label }) => label === event.label,
  );
  if (!checkpoint || checkpoint.offsetMs !== event.offsetMs) {
    throw new Error('Listing observation pattern event schedule is invalid');
  }
  return event.offsetMs;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 1
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
}
