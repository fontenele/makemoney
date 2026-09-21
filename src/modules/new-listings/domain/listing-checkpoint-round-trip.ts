import { ListingObservationCheckpointLabel } from './listing-observation-schedule';

export interface ListingCheckpointRoundTripConfiguration {
  feeRate: string;
  slippageRate: string;
}

export interface ListingCheckpointRoundTripSelection extends ListingCheckpointRoundTripConfiguration {
  entryLabel: ListingObservationCheckpointLabel;
  exitLabel: ListingObservationCheckpointLabel;
}

export interface ListingCheckpointRoundTripEvent {
  label: ListingObservationCheckpointLabel;
  offsetMs: number;
  referencePrice: string;
  executionPrice: string;
}

export interface ListingCheckpointRoundTrip {
  provider: 'binance';
  symbol: string;
  configuration: ListingCheckpointRoundTripConfiguration;
  entry: ListingCheckpointRoundTripEvent;
  exit: ListingCheckpointRoundTripEvent;
  durationMs: number;
  grossReturnRate: string;
  netReturnRate: string;
  profitableAfterCosts: boolean;
}
