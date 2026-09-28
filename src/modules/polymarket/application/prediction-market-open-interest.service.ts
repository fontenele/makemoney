import { Inject, Injectable } from '@nestjs/common';
import {
  PREDICTION_MARKET_OPEN_INTEREST_PROVIDER,
  PredictionMarketOpenInterest,
  PredictionMarketOpenInterestIncoherentError,
  PredictionMarketOpenInterestProvider,
} from '../domain/prediction-market-open-interest';
import { PredictionMarketConditionUnavailableError } from '../domain/prediction-market-binary-resolution';
import { PredictionMarketDiscoveryService } from './prediction-market-discovery.service';

@Injectable()
export class PredictionMarketOpenInterestService {
  constructor(
    private readonly discovery: PredictionMarketDiscoveryService,
    @Inject(PREDICTION_MARKET_OPEN_INTEREST_PROVIDER)
    private readonly provider: PredictionMarketOpenInterestProvider,
  ) {}

  async getOpenInterest(
    marketId: string,
    signal?: AbortSignal,
  ): Promise<PredictionMarketOpenInterest> {
    const market = await this.discovery.getById(marketId, signal);
    if (market.conditionId === null) {
      throw new PredictionMarketConditionUnavailableError(marketId);
    }
    const conditionId = market.conditionId.toLowerCase();
    const observation = await this.provider.getOpenInterest(
      conditionId,
      signal,
    );
    if (observation.conditionId !== conditionId) {
      throw new PredictionMarketOpenInterestIncoherentError(marketId);
    }
    return {
      provider: 'polymarket',
      market,
      conditionId,
      openInterestUsdc: observation.openInterestUsdc,
      source: observation.source,
      receivedAt: observation.receivedAt,
      executable: false,
    };
  }
}
