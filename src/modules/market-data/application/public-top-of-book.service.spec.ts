import { jest } from '@jest/globals';
import { MarketTopOfBook } from '../domain/market-top-of-book';
import { TopOfBookStream } from '../domain/top-of-book-stream';
import { PublicTopOfBookService } from './public-top-of-book.service';

describe('PublicTopOfBookService', () => {
  it('starts and stops the configured stream with the module lifecycle', () => {
    const start =
      jest.fn<(handler: (topOfBook: MarketTopOfBook) => void) => void>();
    const stop = jest.fn<() => void>();
    const stream: TopOfBookStream = { start, stop };
    const service = new PublicTopOfBookService(stream);

    service.onModuleInit();
    service.onModuleDestroy();

    expect(start).toHaveBeenCalledTimes(1);
    expect(start).toHaveBeenCalledWith(expect.any(Function));
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
