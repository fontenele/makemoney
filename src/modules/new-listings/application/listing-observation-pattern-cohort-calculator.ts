import Decimal from 'decimal.js';
import { ListingObservationPatternClassification } from '../domain/listing-observation-pattern-classification';
import { ListingObservationPatternCohort } from '../domain/listing-observation-pattern-cohort';
import { validateListingObservationPatternThresholds } from './listing-observation-pattern-classifier';

const CohortPatternDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
});

export class ListingObservationPatternCohortCalculator {
  calculate(
    classifications: readonly ListingObservationPatternClassification[],
  ): ListingObservationPatternCohort {
    if (classifications.length === 0) {
      return {
        provider: null,
        thresholds: null,
        classificationCount: 0,
        noPumpObservedCount: 0,
        pumpObservedCount: 0,
        correctionObservedCount: 0,
        pumpObservedRate: null,
        correctionObservedRate: null,
        correctionAmongPumpsRate: null,
      };
    }

    const thresholds = classifications[0].thresholds;
    validateListingObservationPatternThresholds(thresholds);
    const symbols = new Set<string>();
    let noPumpObservedCount = 0;
    let pumpObservedCount = 0;
    let correctionObservedCount = 0;

    for (const classification of classifications) {
      validateClassification(classification, thresholds, symbols);
      if (classification.status === 'no-pump-observed') {
        noPumpObservedCount += 1;
      } else {
        pumpObservedCount += 1;
        if (classification.status === 'pump-and-correction-observed') {
          correctionObservedCount += 1;
        }
      }
    }

    const total = new CohortPatternDecimal(classifications.length);
    return {
      provider: 'binance',
      thresholds,
      classificationCount: classifications.length,
      noPumpObservedCount,
      pumpObservedCount,
      correctionObservedCount,
      pumpObservedRate: new CohortPatternDecimal(pumpObservedCount)
        .dividedBy(total)
        .toString(),
      correctionObservedRate: new CohortPatternDecimal(correctionObservedCount)
        .dividedBy(total)
        .toString(),
      correctionAmongPumpsRate:
        pumpObservedCount === 0
          ? null
          : new CohortPatternDecimal(correctionObservedCount)
              .dividedBy(pumpObservedCount)
              .toString(),
    };
  }
}

function validateClassification(
  classification: ListingObservationPatternClassification,
  thresholds: ListingObservationPatternClassification['thresholds'],
  symbols: Set<string>,
) {
  if (
    classification.provider !== 'binance' ||
    !/^[A-Z0-9]{1,40}$/.test(classification.symbol)
  ) {
    throw new Error('Listing observation pattern classification is invalid');
  }
  if (symbols.has(classification.symbol)) {
    throw new Error(
      'Listing observation pattern cohort symbols must be unique',
    );
  }
  symbols.add(classification.symbol);
  validateListingObservationPatternThresholds(classification.thresholds);
  if (
    !new CohortPatternDecimal(classification.thresholds.pumpReturnRate).equals(
      thresholds.pumpReturnRate,
    ) ||
    !new CohortPatternDecimal(
      classification.thresholds.correctionFromPeakRate,
    ).equals(thresholds.correctionFromPeakRate)
  ) {
    throw new Error('Listing observation pattern thresholds must match');
  }
  if (
    (classification.status === 'no-pump-observed' &&
      (classification.pump ||
        classification.peak ||
        classification.correction)) ||
    (classification.status === 'pump-observed' &&
      (!classification.pump ||
        !classification.peak ||
        classification.correction)) ||
    (classification.status === 'pump-and-correction-observed' &&
      (!classification.pump ||
        !classification.peak ||
        !classification.correction))
  ) {
    throw new Error('Listing observation pattern classification is incoherent');
  }
}
