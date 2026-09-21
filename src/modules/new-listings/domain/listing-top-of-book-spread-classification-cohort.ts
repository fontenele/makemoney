import { ListingTopOfBookSpreadThresholds } from './listing-top-of-book-spread-classification';

export interface ListingTopOfBookSpreadClassificationCohort {
  provider: 'binance' | null;
  thresholds: ListingTopOfBookSpreadThresholds | null;
  classificationCount: number;
  noWideningObservedCount: number;
  wideningObservedCount: number;
  wideningObservedRate: string | null;
}
