import Decimal from 'decimal.js';
import { ListingTopOfBookSpreadClassification } from '../domain/listing-top-of-book-spread-classification';
import { ListingTopOfBookSpreadClassificationCohort } from '../domain/listing-top-of-book-spread-classification-cohort';
import { validateListingTopOfBookSpreadThresholds } from './listing-top-of-book-spread-classifier';

const CohortSpreadClassificationDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
});

export class ListingTopOfBookSpreadClassificationCohortCalculator {
  calculate(
    classifications: readonly ListingTopOfBookSpreadClassification[],
  ): ListingTopOfBookSpreadClassificationCohort {
    if (classifications.length === 0) {
      return {
        provider: null,
        thresholds: null,
        classificationCount: 0,
        noWideningObservedCount: 0,
        wideningObservedCount: 0,
        wideningObservedRate: null,
      };
    }

    const thresholds = classifications[0].thresholds;
    validateListingTopOfBookSpreadThresholds(thresholds);
    const symbols = new Set<string>();
    let noWideningObservedCount = 0;
    let wideningObservedCount = 0;

    for (const classification of classifications) {
      validateClassification(classification, thresholds, symbols);
      if (classification.status === 'widening-observed') {
        wideningObservedCount += 1;
      } else {
        noWideningObservedCount += 1;
      }
    }

    return {
      provider: 'binance',
      thresholds,
      classificationCount: classifications.length,
      noWideningObservedCount,
      wideningObservedCount,
      wideningObservedRate: new CohortSpreadClassificationDecimal(
        wideningObservedCount,
      )
        .dividedBy(classifications.length)
        .toString(),
    };
  }
}

function validateClassification(
  classification: ListingTopOfBookSpreadClassification,
  thresholds: ListingTopOfBookSpreadClassification['thresholds'],
  symbols: Set<string>,
): void {
  if (
    classification.provider !== 'binance' ||
    !/^[A-Z0-9]{1,30}$/.test(classification.symbol)
  ) {
    throw new Error('Listing top-of-book spread classification is invalid');
  }
  if (symbols.has(classification.symbol)) {
    throw new Error(
      'Listing top-of-book spread classification cohort symbols must be unique',
    );
  }
  symbols.add(classification.symbol);
  validateListingTopOfBookSpreadThresholds(classification.thresholds);
  if (
    !new CohortSpreadClassificationDecimal(
      classification.thresholds.wideningBasisPoints,
    ).equals(thresholds.wideningBasisPoints)
  ) {
    throw new Error(
      'Listing top-of-book spread classification thresholds must match',
    );
  }
  if (
    !classification.maximumWidening ||
    (classification.status === 'no-widening-observed' &&
      classification.widening) ||
    (classification.status === 'widening-observed' && !classification.widening)
  ) {
    throw new Error('Listing top-of-book spread classification is incoherent');
  }
}
