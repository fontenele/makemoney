import { jest } from '@jest/globals';
import { MarketTopOfBook } from '../domain/market-top-of-book';
import { TopOfBookStream } from '../domain/top-of-book-stream';
import { PublicTopOfBookService } from './public-top-of-book.service';
import { SpreadCalculator } from './spread-calculator';

describe('PublicTopOfBookService', () => {
  it('starts and stops the configured stream with the module lifecycle', () => {
    const start =
      jest.fn<(handler: (topOfBook: MarketTopOfBook) => void) => void>();
    const stop = jest.fn<() => void>();
    const stream: TopOfBookStream = { start, stop };
    const service = new PublicTopOfBookService(stream, new SpreadCalculator());

    service.onModuleInit();
    service.onModuleDestroy();

    expect(start).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledWith(expect.any(Function));
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('calculates the spread for each delivered top-of-book update', () => {
    let handler: ((topOfBook: MarketTopOfBook) => void) | undefined;
    const stream: TopOfBookStream = {
      start: (configuredHandler) => {
        handler = configuredHandler;
      },
      stop: jest.fn<() => void>(),
    };
    const calculator = new SpreadCalculator();
    const calculate = jest.spyOn(calculator, 'calculate');
    const service = new PublicTopOfBookService(stream, calculator);
    const topOfBook: MarketTopOfBook = {
      provider: 'binance',
      symbol: 'BTC/USDT',
      updateId: '123',
      bidPrice: '99999.99',
      bidQuantity: '1',
      askPrice: '100000.01',
      askQuantity: '2',
      receivedAt: new Date('2026-09-11T12:00:00.000Z'),
    };

    service.onModuleInit();
    handler?.(topOfBook);

    expect(calculate).toHaveBeenCalledWith(topOfBook);
  });
});
