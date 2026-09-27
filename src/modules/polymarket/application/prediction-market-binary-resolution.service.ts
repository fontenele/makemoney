import { Injectable } from '@nestjs/common';
import {
  PredictionMarketBinaryResolution,
  PredictionMarketBinaryResolutionIncoherentError,
  PredictionMarketBinaryResolutionResult,
  PredictionMarketBinaryResolutionUnavailableError,
  PredictionMarketConditionUnavailableError,
  PredictionMarketOutcomePayoutStatus,
} from '../domain/prediction-market-binary-resolution';
import type { PredictionMarketResolutionRecord } from '../domain/prediction-market-resolution';
import { PredictionMarketDiscoveryService } from './prediction-market-discovery.service';
import { PredictionMarketResolutionService } from './prediction-market-resolution.service';

@Injectable()
export class PredictionMarketBinaryResolutionService {
  constructor(
    private readonly discovery: PredictionMarketDiscoveryService,
    private readonly resolutions: PredictionMarketResolutionService,
  ) {}

  async getResolution(
    marketId: string,
    signal?: AbortSignal,
  ): Promise<PredictionMarketBinaryResolution> {
    const market = await this.discovery.getById(marketId, signal);
    if (market.conditionId === null) {
      throw new PredictionMarketConditionUnavailableError(marketId);
    }
    const conditionId = market.conditionId.toLowerCase();
    const record = await this.resolutions.getResolutionRecord(
      conditionId,
      signal,
    );
    if (record.conditionId !== conditionId) {
      throw new PredictionMarketBinaryResolutionIncoherentError(marketId);
    }
    const interpretation = interpret(record, marketId);
    const resolution = {
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
    return {
      provider: 'polymarket',
      market,
      resolution,
      result: interpretation.result,
      payouts: {
        yes: {
          ...market.outcomes.yes,
          payoutRate: interpretation.yes.rate,
          status: interpretation.yes.status,
        },
        no: {
          ...market.outcomes.no,
          payoutRate: interpretation.no.rate,
          status: interpretation.no.status,
        },
      },
      executable: false,
    };
  }
}

function interpret(record: PredictionMarketResolutionRecord, marketId: string) {
  const vector = record.payouts;
  if (vector === null || vector.length !== 2) {
    throw new PredictionMarketBinaryResolutionUnavailableError(marketId);
  }
  if (vector[0] === '1' && vector[1] === '0') {
    return result('yes', '1', 'winner', '0', 'loser');
  }
  if (vector[0] === '0' && vector[1] === '1') {
    return result('no', '0', 'loser', '1', 'winner');
  }
  if (vector[0] === '0.5' && vector[1] === '0.5') {
    return result('fifty_fifty', '0.5', 'split', '0.5', 'split');
  }
  throw new PredictionMarketBinaryResolutionUnavailableError(marketId);
}

function result(
  value: PredictionMarketBinaryResolutionResult,
  yesRate: '0' | '0.5' | '1',
  yesStatus: PredictionMarketOutcomePayoutStatus,
  noRate: '0' | '0.5' | '1',
  noStatus: PredictionMarketOutcomePayoutStatus,
) {
  return {
    result: value,
    yes: { rate: yesRate, status: yesStatus },
    no: { rate: noRate, status: noStatus },
  };
}
