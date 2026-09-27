import { Inject, Injectable } from '@nestjs/common';
import {
  PREDICTION_MARKET_ORDER_BOOK_PROVIDER,
  PredictionMarketOrderBookProvider,
  PredictionMarketTopOfBook,
} from '../domain/prediction-market-top-of-book';

@Injectable()
export class PredictionMarketOrderBookService {
  constructor(
    @Inject(PREDICTION_MARKET_ORDER_BOOK_PROVIDER)
    private readonly provider: PredictionMarketOrderBookProvider,
  ) {}

  getTopOfBook(
    tokenId: string,
    signal?: AbortSignal,
  ): Promise<PredictionMarketTopOfBook> {
    return this.provider.getTopOfBook(tokenId, signal);
  }
}
