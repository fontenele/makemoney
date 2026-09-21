import { ListingTopOfBookSpreadThresholds } from './listing-top-of-book-spread-classification';

export interface ListingTopOfBookSpreadClassificationTimingCohort {
  provider: 'binance' | null;
  thresholds: ListingTopOfBookSpreadThresholds | null;
  wideningSampleSize: number;
  medianTimeToWideningMs: number | null;
}
