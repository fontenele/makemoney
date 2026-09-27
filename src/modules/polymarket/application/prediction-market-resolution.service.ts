import { Inject, Injectable } from '@nestjs/common';
import {
  PREDICTION_MARKET_RESOLUTION_PROVIDER,
  PredictionMarketResolutionProvider,
  PredictionMarketResolutionRecord,
  PredictionMarketResolutionState,
} from '../domain/prediction-market-resolution';

@Injectable()
export class PredictionMarketResolutionService {
  constructor(
    @Inject(PREDICTION_MARKET_RESOLUTION_PROVIDER)
    private readonly provider: PredictionMarketResolutionProvider,
  ) {}

  getResolution(
    conditionId: string,
    signal?: AbortSignal,
  ): Promise<PredictionMarketResolutionState> {
    return this.getResolutionRecord(conditionId, signal).then(toPublicState);
  }

  getResolutionRecord(
    conditionId: string,
    signal?: AbortSignal,
  ): Promise<PredictionMarketResolutionRecord> {
    return this.provider.getResolution(conditionId, signal);
  }
}

function toPublicState(
  record: PredictionMarketResolutionRecord,
): PredictionMarketResolutionState {
  return {
    provider: record.provider,
    conditionId: record.conditionId,
    status: record.status,
    extendedReview: record.extendedReview,
    wasDisputed: record.wasDisputed,
    wasArbitrated: record.wasArbitrated,
    resolvedAt: record.resolvedAt,
    source: record.source,
    receivedAt: record.receivedAt,
  };
}
