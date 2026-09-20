import { ListingObservationPatternThresholds } from './listing-observation-pattern-classification';

export interface ListingObservationPatternTimingCohort {
  provider: 'binance' | null;
  thresholds: ListingObservationPatternThresholds | null;
  pumpSampleSize: number;
  correctionSampleSize: number;
  medianTimeToPumpMs: number | null;
  medianTimeFromPeakToCorrectionMs: number | null;
}
