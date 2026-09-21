export interface ListingObservationPriceVariabilityCohort {
  provider: 'binance' | null;
  sampleSize: number;
  transitionSampleSize: number;
  medianAverageAbsoluteReturnRate: string | null;
  medianMaximumAbsoluteReturnRate: string | null;
}
