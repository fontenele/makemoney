import { jest } from '@jest/globals';
import { MarketTrade } from '../domain/market-trade';
import { TradeStream } from '../domain/trade-stream';
import { PublicTradesService } from './public-trades.service';

describe('PublicTradesService', () => {
  it('starts and stops the configured trade stream with the module lifecycle', () => {
    const start = jest.fn<(handler: (trade: MarketTrade) => void) => void>();
    const stop = jest.fn<() => void>();
    const stream: TradeStream = { start, stop };
    const service = new PublicTradesService(stream);

    service.onModuleInit();
    service.onModuleDestroy();

    expect(start).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledWith(expect.any(Function));
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
