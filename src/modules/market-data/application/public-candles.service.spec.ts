import { jest } from '@jest/globals';
import { CandleStream } from '../domain/candle-stream';
import { MarketCandle } from '../domain/market-candle';
import { PublicCandlesService } from './public-candles.service';
import { MarketCandleFeedService } from './market-candle-feed.service';

describe('PublicCandlesService', () => {
  it('starts and stops the configured candle stream with the module lifecycle', () => {
    const start = jest.fn<(handler: (candle: MarketCandle) => void) => void>();
    const stop = jest.fn<() => void>();
    const stream: CandleStream = { start, stop };
    const service = new PublicCandlesService(
      stream,
      new MarketCandleFeedService(),
    );

    service.onModuleInit();
    service.onModuleDestroy();

    expect(start).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledWith(expect.any(Function));
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
