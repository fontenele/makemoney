import { Inject, Injectable } from '@nestjs/common';
import {
  SPOT_SYMBOL_REPOSITORY,
  SpotSymbolRepository,
} from '../domain/spot-symbol-catalog';
import {
  ClaimedListingObservationCheckpoint,
  DueListingObservationCheckpoint,
  LISTING_OBSERVATION_CHECKPOINTS,
  ListingObservationCheckpointLabel,
} from '../domain/listing-observation-schedule';
import {
  ListingMarketObservation,
  validateListingMarketObservation,
} from '../domain/listing-market-observation';

export const MAX_DUE_LISTING_OBSERVATION_CHECKPOINT_LIMIT = 100;

@Injectable()
export class DueListingObservationCheckpointService {
  constructor(
    @Inject(SPOT_SYMBOL_REPOSITORY)
    private readonly repository: SpotSymbolRepository,
  ) {}

  listDue(
    dueAt: Date,
    limit: number,
  ): Promise<DueListingObservationCheckpoint[]> {
    if (!Number.isFinite(dueAt.getTime())) {
      throw new Error('Due checkpoint time must be valid');
    }
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > MAX_DUE_LISTING_OBSERVATION_CHECKPOINT_LIMIT
    ) {
      throw new Error('Due checkpoint limit must be an integer from 1 to 100');
    }
    return this.repository.listDueCheckpoints(dueAt, limit);
  }

  claimDue(input: {
    dueAt: Date;
    limit: number;
    claimToken: string;
    claimedAt: Date;
    claimExpiresAt: Date;
  }): Promise<ClaimedListingObservationCheckpoint[]> {
    this.validateDate(input.dueAt, 'Due checkpoint time');
    this.validateLimit(input.limit);
    if (!/^[A-Za-z0-9._:-]{1,100}$/.test(input.claimToken)) {
      throw new Error(
        'Checkpoint claim token must contain 1 to 100 safe characters',
      );
    }
    this.validateDate(input.claimedAt, 'Checkpoint claim time');
    this.validateDate(input.claimExpiresAt, 'Checkpoint claim expiry');
    if (input.claimExpiresAt.getTime() <= input.claimedAt.getTime()) {
      throw new Error('Checkpoint claim expiry must be after claim time');
    }
    return this.repository.claimDueCheckpoints(input);
  }

  completeClaimed(input: {
    provider: 'binance';
    symbol: string;
    label: ListingObservationCheckpointLabel;
    claimToken: string;
    completedAt: Date;
    observation: ListingMarketObservation;
  }): Promise<boolean> {
    if (input.provider !== 'binance') {
      throw new Error('Checkpoint provider must be binance');
    }
    if (!/^[A-Z0-9]{1,30}$/.test(input.symbol)) {
      throw new Error('Checkpoint symbol must be canonical');
    }
    if (!LISTING_OBSERVATION_CHECKPOINT_LABELS.has(input.label)) {
      throw new Error('Checkpoint label must be supported');
    }
    if (!/^[A-Za-z0-9._:-]{1,100}$/.test(input.claimToken)) {
      throw new Error(
        'Checkpoint claim token must contain 1 to 100 safe characters',
      );
    }
    this.validateDate(input.completedAt, 'Checkpoint completion time');
    if (
      !input.observation ||
      input.observation.provider !== input.provider ||
      input.observation.symbol !== input.symbol
    ) {
      throw new Error('Checkpoint observation identity must match checkpoint');
    }
    validateListingMarketObservation(input.observation);
    return this.repository.completeClaimedCheckpoint(input);
  }

  private validateDate(value: Date, label: string): void {
    if (!Number.isFinite(value.getTime()))
      throw new Error(`${label} must be valid`);
  }

  private validateLimit(limit: number): void {
    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > MAX_DUE_LISTING_OBSERVATION_CHECKPOINT_LIMIT
    ) {
      throw new Error('Due checkpoint limit must be an integer from 1 to 100');
    }
  }
}

const LISTING_OBSERVATION_CHECKPOINT_LABELS = new Set<string>(
  LISTING_OBSERVATION_CHECKPOINTS.map(({ label }) => label),
);
