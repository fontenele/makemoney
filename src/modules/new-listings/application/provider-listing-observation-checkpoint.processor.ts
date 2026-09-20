import { ListingMarketObservationProvider } from '../domain/listing-market-observation';
import { ClaimedListingObservationCheckpoint } from '../domain/listing-observation-schedule';
import { ListingObservationCheckpointProcessor } from './listing-observation-checkpoint-cycle.service';
import { ListingTopOfBookSnapshotService } from './listing-top-of-book-snapshot.service';

export class ProviderListingObservationCheckpointProcessor implements ListingObservationCheckpointProcessor {
  constructor(
    private readonly provider: ListingMarketObservationProvider,
    private readonly topOfBook: ListingTopOfBookSnapshotService,
  ) {}

  async process(
    checkpoint: ClaimedListingObservationCheckpoint,
  ): ReturnType<ListingObservationCheckpointProcessor['process']> {
    const request = {
      provider: checkpoint.provider,
      symbol: checkpoint.symbol,
    };
    const [observation, topOfBook] = await Promise.all([
      this.provider.load(request),
      this.topOfBook.load(request),
    ]);
    return { observation, topOfBook };
  }
}
