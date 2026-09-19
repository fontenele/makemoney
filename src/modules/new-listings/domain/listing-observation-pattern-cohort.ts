import { ListingObservationPatternThresholds } from './listing-observation-pattern-classification';

export interface ListingObservationPatternCohort {
  provider: 'binance' | null;
  thresholds: ListingObservationPatternThresholds | null;
  classificationCount: number;
  noPumpObservedCount: number;
  pumpObservedCount: number;
  correctionObservedCount: number;
  pumpObservedRate: string | null;
  correctionObservedRate: string | null;
  correctionAmongPumpsRate: string | null;
}
