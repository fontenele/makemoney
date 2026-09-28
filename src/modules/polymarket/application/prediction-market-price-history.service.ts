import { Inject, Injectable } from '@nestjs/common';
import {
  PREDICTION_MARKET_PRICE_HISTORY_PROVIDER,
  PredictionMarketHistoricalPriceObservation,
  PredictionMarketPriceHistoryPage,
  PredictionMarketPriceHistoryProvider,
  PredictionMarketPriceHistoryQuery,
} from '../domain/prediction-market-price-history';

@Injectable()
export class PredictionMarketPriceHistoryService {
  constructor(
    @Inject(PREDICTION_MARKET_PRICE_HISTORY_PROVIDER)
    private readonly provider: PredictionMarketPriceHistoryProvider,
  ) {}

  getPriceHistory(
    tokenId: string,
    query: PredictionMarketPriceHistoryQuery,
    signal?: AbortSignal,
  ): Promise<PredictionMarketPriceHistoryPage> {
    return this.provider.getPriceHistory(tokenId, query, signal);
  }

  getPriceAt(
    tokenId: string,
    at: Date,
    signal?: AbortSignal,
  ): Promise<PredictionMarketHistoricalPriceObservation> {
    return this.provider.getPriceAt(tokenId, at, signal);
  }
}
