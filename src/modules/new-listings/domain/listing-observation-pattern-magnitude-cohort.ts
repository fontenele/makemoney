import { ListingObservationPatternThresholds } from './listing-observation-pattern-classification';

export interface ListingObservationPatternMagnitudeCohort {
  provider: 'binance' | null;
  thresholds: ListingObservationPatternThresholds | null;
  pumpSampleSize: number;
  correctionSampleSize: number;
  medianPeakReturnRate: string | null;
  medianCorrectionFromPeakRate: string | null;
}
