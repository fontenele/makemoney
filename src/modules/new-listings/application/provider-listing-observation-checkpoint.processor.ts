import {
  ListingMarketObservation,
  ListingMarketObservationProvider,
} from '../domain/listing-market-observation';
import { ClaimedListingObservationCheckpoint } from '../domain/listing-observation-schedule';
import { ListingObservationCheckpointProcessor } from './listing-observation-checkpoint-cycle.service';

export class ProviderListingObservationCheckpointProcessor implements ListingObservationCheckpointProcessor {
  constructor(private readonly provider: ListingMarketObservationProvider) {}

  process(
    checkpoint: ClaimedListingObservationCheckpoint,
  ): Promise<ListingMarketObservation> {
    return this.provider.load({
      provider: checkpoint.provider,
      symbol: checkpoint.symbol,
    });
  }
}
