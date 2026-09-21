import { ListingTopOfBookSpreadThresholds } from './listing-top-of-book-spread-classification';

export interface ListingTopOfBookSpreadClassificationMagnitudeCohort {
  provider: 'binance' | null;
  thresholds: ListingTopOfBookSpreadThresholds | null;
  wideningSampleSize: number;
  medianMaximumWideningBasisPoints: string | null;
}
