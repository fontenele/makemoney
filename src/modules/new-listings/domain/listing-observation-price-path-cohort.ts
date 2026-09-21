export interface ListingObservationPricePathCohort {
  provider: 'binance' | null;
  sampleSize: number;
  medianObservedHighOffsetMs: number | null;
  medianObservedLowOffsetMs: number | null;
  drawdownSampleSize: number;
  medianMaximumDrawdownRate: string | null;
  medianMaximumDrawdownDurationMs: number | null;
}
