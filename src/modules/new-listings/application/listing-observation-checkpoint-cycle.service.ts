import { randomUUID } from 'node:crypto';
import { ClaimedListingObservationCheckpoint } from '../domain/listing-observation-schedule';
import { ListingMarketObservation } from '../domain/listing-market-observation';
import { DueListingObservationCheckpointService } from './due-listing-observation-checkpoint.service';
import { ListingObservationCheckpointWorkerOptions } from './listing-observation-checkpoint-worker-options';

export interface ListingObservationCheckpointProcessor {
  process(
    checkpoint: ClaimedListingObservationCheckpoint,
  ): Promise<ListingMarketObservation>;
}

export interface ListingObservationCheckpointCycleResult {
  claimed: number;
  completed: number;
  failed: number;
  lostLease: number;
}

type Clock = () => Date;
type ClaimTokenFactory = () => string;

export class ListingObservationCheckpointCycleService {
  constructor(
    private readonly checkpoints: DueListingObservationCheckpointService,
    private readonly options: ListingObservationCheckpointWorkerOptions,
    private readonly clock: Clock = () => new Date(),
    private readonly claimTokenFactory: ClaimTokenFactory = () => randomUUID(),
  ) {}

  async runOnce(
    processor: ListingObservationCheckpointProcessor,
  ): Promise<ListingObservationCheckpointCycleResult> {
    const claimedAt = this.clock();
    const claimToken = this.claimTokenFactory();
    const claimed = await this.checkpoints.claimDue({
      dueAt: claimedAt,
      limit: this.options.batchSize,
      claimToken,
      claimedAt,
      claimExpiresAt: new Date(
        claimedAt.getTime() + this.options.leaseDurationMs,
      ),
    });
    const result: ListingObservationCheckpointCycleResult = {
      claimed: claimed.length,
      completed: 0,
      failed: 0,
      lostLease: 0,
    };

    for (const checkpoint of claimed) {
      let observation: ListingMarketObservation;
      try {
        observation = await processor.process(checkpoint);
      } catch {
        result.failed += 1;
        continue;
      }
      const completed = await this.checkpoints.completeClaimed({
        provider: checkpoint.provider,
        symbol: checkpoint.symbol,
        label: checkpoint.label,
        claimToken: checkpoint.claimToken,
        completedAt: this.clock(),
        observation,
      });
      if (completed) result.completed += 1;
      else result.lostLease += 1;
    }
    return result;
  }
}
