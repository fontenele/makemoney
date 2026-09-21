import { ListingCheckpointRoundTripSelection } from './listing-checkpoint-round-trip';

export interface ListingCheckpointRoundTripOutcomeCohort {
  provider: 'binance' | null;
  selection: ListingCheckpointRoundTripSelection;
  sampleSize: number;
  availableSampleSize: number;
  unavailableSampleSize: number;
  profitableAfterCostsCount: number;
  losingAfterCostsCount: number;
  breakEvenAfterCostsCount: number;
  averageProfitableNetReturnRate: string | null;
  averageLosingNetReturnRate: string | null;
}
