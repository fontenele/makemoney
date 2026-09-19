import { ListingObservationCheckpointLabel } from './listing-observation-schedule';

export interface ListingObservationPatternThresholds {
  pumpReturnRate: string;
  correctionFromPeakRate: string;
}

export interface ListingObservationPatternEvent {
  label: ListingObservationCheckpointLabel;
  offsetMs: number;
  priceReturnRate: string;
}

export interface ListingObservationPeakEvent extends ListingObservationPatternEvent {
  lastPrice: string;
}

export type ListingObservationPatternStatus =
  'no-pump-observed' | 'pump-observed' | 'pump-and-correction-observed';

export interface ListingObservationPatternClassification {
  provider: 'binance';
  symbol: string;
  status: ListingObservationPatternStatus;
  thresholds: ListingObservationPatternThresholds;
  evaluatedThroughLabel: ListingObservationCheckpointLabel;
  pump: ListingObservationPatternEvent | null;
  peak: ListingObservationPeakEvent | null;
  correction:
    | (ListingObservationPatternEvent & {
        drawdownFromPeakRate: string;
      })
    | null;
}
