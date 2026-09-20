import { ListingObservationCheckpointLabel } from './listing-observation-schedule';
import { ListingTopOfBookObservation } from './listing-top-of-book-observation';

export const LISTING_TOP_OF_BOOK_OBSERVATION_REPOSITORY = Symbol(
  'LISTING_TOP_OF_BOOK_OBSERVATION_REPOSITORY',
);

export interface StoreListingTopOfBookObservationRequest {
  provider: ListingTopOfBookObservation['provider'];
  symbol: string;
  label: ListingObservationCheckpointLabel;
  observation: ListingTopOfBookObservation;
}

export interface StoredListingTopOfBookCheckpoint extends ListingTopOfBookObservation {
  label: ListingObservationCheckpointLabel;
  offsetMs: number;
  targetAt: Date;
}

export interface ListingTopOfBookObservationRepository {
  store(
    request: StoreListingTopOfBookObservationRequest,
  ): Promise<ListingTopOfBookObservation>;
  listForDetection(
    provider: ListingTopOfBookObservation['provider'],
    symbol: string,
  ): Promise<StoredListingTopOfBookCheckpoint[]>;
  listCohort(
    provider: ListingTopOfBookObservation['provider'],
    limit: number,
  ): Promise<StoredListingTopOfBookCheckpoint[][]>;
}
