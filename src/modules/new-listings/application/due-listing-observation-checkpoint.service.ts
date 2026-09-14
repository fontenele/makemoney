import { Inject, Injectable } from '@nestjs/common';
import {
  SPOT_SYMBOL_REPOSITORY,
  SpotSymbolRepository,
} from '../domain/spot-symbol-catalog';
import { DueListingObservationCheckpoint } from '../domain/listing-observation-schedule';

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
}
