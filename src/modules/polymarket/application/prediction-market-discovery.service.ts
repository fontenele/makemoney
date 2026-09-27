import { Inject, Injectable } from '@nestjs/common';
import {
  ActivePredictionMarketQuery,
  PREDICTION_MARKET_PROVIDER,
  PredictionMarketPage,
  PredictionMarketProvider,
} from '../domain/prediction-market';

@Injectable()
export class PredictionMarketDiscoveryService {
  constructor(
    @Inject(PREDICTION_MARKET_PROVIDER)
    private readonly provider: PredictionMarketProvider,
  ) {}

  listActive(
    query: ActivePredictionMarketQuery,
    signal?: AbortSignal,
  ): Promise<PredictionMarketPage> {
    return this.provider.listActive(query, signal);
  }
}
