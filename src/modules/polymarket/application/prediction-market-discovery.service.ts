import { Inject, Injectable } from '@nestjs/common';
import {
  ActivePredictionMarketQuery,
  PREDICTION_MARKET_PROVIDER,
  PredictionMarketPage,
  PredictionMarketDetails,
  PredictionMarketProvider,
  PredictionMarketTags,
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

  getById(id: string, signal?: AbortSignal): Promise<PredictionMarketDetails> {
    return this.provider.getById(id, signal);
  }

  getTagsById(id: string, signal?: AbortSignal): Promise<PredictionMarketTags> {
    return this.provider.getTagsById(id, signal);
  }
}
