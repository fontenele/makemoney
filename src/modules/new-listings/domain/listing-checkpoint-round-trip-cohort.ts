import {
  ListingCheckpointRoundTrip,
  ListingCheckpointRoundTripSelection,
} from './listing-checkpoint-round-trip';

export interface ListingCheckpointRoundTripCohortSample {
  provider: 'binance';
  symbol: string;
  roundTrip: ListingCheckpointRoundTrip | null;
}

export interface ListingCheckpointRoundTripCohort {
  provider: 'binance' | null;
  selection: ListingCheckpointRoundTripSelection;
  sampleSize: number;
  availableSampleSize: number;
  unavailableSampleSize: number;
  profitableAfterCostsCount: number;
  nonProfitableAfterCostsCount: number;
  profitableAfterCostsRate: string | null;
  averageGrossReturnRate: string | null;
  averageNetReturnRate: string | null;
  medianNetReturnRate: string | null;
}
