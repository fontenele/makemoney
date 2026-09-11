import { Injectable } from '@nestjs/common';
import { MarketTicker } from '../domain/market-ticker';

@Injectable()
export class LatestMarketPriceService {
  private latestTicker: MarketTicker | undefined;

  update(ticker: MarketTicker): void {
    this.latestTicker = ticker;
  }

  getLatest(): MarketTicker | undefined {
    return this.latestTicker;
  }
}
