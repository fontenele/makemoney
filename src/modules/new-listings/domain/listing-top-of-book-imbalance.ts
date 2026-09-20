import { ListingTopOfBookObservation } from './listing-top-of-book-observation';
import { ListingObservationCheckpointLabel } from './listing-observation-schedule';

export interface ListingTopOfBookImbalance extends ListingTopOfBookObservation {
  bidQuoteNotional: string;
  askQuoteNotional: string;
  imbalanceRate: string | null;
}

export interface StoredListingTopOfBookImbalance extends ListingTopOfBookImbalance {
  label: ListingObservationCheckpointLabel;
  offsetMs: number;
  targetAt: Date;
}
