import { jest } from '@jest/globals';
import { MarketTicker } from '../domain/market-ticker';
import { TickerStream } from '../domain/ticker-stream';
import { PublicTickerService } from './public-ticker.service';

describe('PublicTickerService', () => {
  it('starts and stops the configured ticker stream with the module lifecycle', () => {
    const start = jest.fn<(handler: (ticker: MarketTicker) => void) => void>();
    const stop = jest.fn<() => void>();
    const stream: TickerStream = { start, stop };
    const service = new PublicTickerService(stream);

    service.onModuleInit();
    service.onModuleDestroy();

    expect(start).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledWith(expect.any(Function));
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
