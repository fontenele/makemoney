import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ListingObservationCheckpointCycleService } from './listing-observation-checkpoint-cycle.service';
import { ListingObservationCheckpointWorkerOptions } from './listing-observation-checkpoint-worker-options';
import { ProviderListingObservationCheckpointProcessor } from './provider-listing-observation-checkpoint.processor';

export class ListingObservationCheckpointWorker
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(ListingObservationCheckpointWorker.name);
  private stopped = false;
  private timer?: NodeJS.Timeout;
  private currentRun?: Promise<void>;

  constructor(
    private readonly cycle: ListingObservationCheckpointCycleService,
    private readonly processor: ProviderListingObservationCheckpointProcessor,
    private readonly options: ListingObservationCheckpointWorkerOptions,
  ) {}

  onModuleInit(): void {
    if (this.options.enabled) this.scheduleNextRun();
  }

  async onModuleDestroy(): Promise<void> {
    this.stopped = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    await this.currentRun;
  }

  private scheduleNextRun(): void {
    if (this.stopped) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.currentRun = this.runCycle();
    }, this.options.intervalMs);
  }

  private async runCycle(): Promise<void> {
    try {
      const result = await this.cycle.runOnce(this.processor);
      this.logger.log({
        event: 'new_listings.checkpoint_cycle_completed',
        ...result,
      });
    } catch (error: unknown) {
      this.logger.error(
        'Failed to run new-listing observation checkpoint cycle',
        error,
      );
    } finally {
      this.currentRun = undefined;
      this.scheduleNextRun();
    }
  }
}
