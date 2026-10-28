import { randomUUID } from 'node:crypto';
import { ClaimedListingObservationCheckpoint } from '../domain/listing-observation-schedule';
import { ListingMarketObservation } from '../domain/listing-market-observation';
import { ListingTopOfBookObservation } from '../domain/listing-top-of-book-observation';
import { DueListingObservationCheckpointService } from './due-listing-observation-checkpoint.service';
import { ListingObservationCheckpointWorkerOptions } from './listing-observation-checkpoint-worker-options';

export interface ListingObservationCheckpointProcessor {
  process(checkpoint: ClaimedListingObservationCheckpoint): Promise<{
    observation: ListingMarketObservation;
    topOfBook: ListingTopOfBookObservation;
  }>;
}

export interface ListingObservationCheckpointCycleResult {
  claimed: number;
  completed: number;
  failed: number;
  lostLease: number;
  maximumClaimLagMs: number | null;
  maximumCompletionLagMs: number | null;
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
      maximumClaimLagMs:
        claimed.length === 0
          ? null
          : Math.max(
              ...claimed.map(({ targetAt }) =>
                checkpointLagMs(claimedAt, targetAt),
              ),
            ),
      maximumCompletionLagMs: null,
    };

    for (const checkpoint of claimed) {
      let processed: Awaited<
        ReturnType<ListingObservationCheckpointProcessor['process']>
      >;
      try {
        processed = await processor.process(checkpoint);
      } catch {
        result.failed += 1;
        continue;
      }
      const completedAt = this.clock();
      const completed = await this.checkpoints.completeClaimedWithTopOfBook({
        provider: checkpoint.provider,
        symbol: checkpoint.symbol,
        label: checkpoint.label,
        claimToken: checkpoint.claimToken,
        completedAt,
        ...processed,
      });
      if (completed) {
        result.completed += 1;
        result.maximumCompletionLagMs = maximumLag(
          result.maximumCompletionLagMs,
          checkpointLagMs(completedAt, checkpoint.targetAt),
        );
      } else result.lostLease += 1;
    }
    return result;
  }
}

function checkpointLagMs(observedAt: Date, targetAt: Date): number {
  const lagMs = observedAt.getTime() - targetAt.getTime();
  if (!Number.isSafeInteger(lagMs) || lagMs < 0) {
    throw new Error('Listing checkpoint lag is invalid');
  }
  return lagMs;
}

function maximumLag(current: number | null, candidate: number): number {
  return current === null ? candidate : Math.max(current, candidate);
}
