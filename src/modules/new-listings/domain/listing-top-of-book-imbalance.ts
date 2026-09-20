import { ListingTopOfBookObservation } from './listing-top-of-book-observation';

export interface ListingTopOfBookImbalance extends ListingTopOfBookObservation {
  bidQuoteNotional: string;
  askQuoteNotional: string;
  imbalanceRate: string | null;
}
