import { ConfigService } from '@nestjs/config';
import { LatestPairMetadataService } from '../../market-data/application/latest-pair-metadata.service';
import { LatestTopOfBookService } from '../../market-data/application/latest-top-of-book.service';
import { MarketPairMetadata } from '../../market-data/domain/market-pair-metadata';
import { MarketTopOfBook } from '../../market-data/domain/market-top-of-book';
import { PaperMarketSellQuoteService } from './paper-market-sell-quote.service';

describe('PaperMarketSellQuoteService', () => {
  it('calculates exact net proceeds at the best bid after fee', () => {
    expect(createService().quote('0.001')).toEqual({
      symbol: 'BTC/USDT',
      side: 'sell',
      quantity: '0.001',
      price: '77777.11',
      notional: '77.77711',
      feeRate: '0.001',
      fee: '0.07777711',
      netProceeds: '77.69933289',
      quotedAt: new Date('2026-09-11T12:00:05.000Z'),
      marketDataReceivedAt: new Date('2026-09-11T12:00:00.000Z'),
    });
  });

  it('rounds monetary values to 18 decimal places using half-even', () => {
    const quote = createService({ feeRate: '0.333333333333333333' }).quote(
      '0.0001',
    );

    expect(quote.fee).toBe('2.592570333333333331');
    expect(quote.netProceeds).toBe('5.185140666666666669');
  });

  it.each([
    ['0', 'invalid_quantity'],
    ['0.000001', 'below_min_quantity'],
    ['9000.00001', 'above_max_quantity'],
    ['0.000011', 'invalid_step_size'],
    ['1.00001', 'insufficient_top_of_book_liquidity'],
    ['0.00001', 'below_min_notional'],
  ])('rejects quantity %s with %s', (quantity, reason) => {
    expect(() => createService().quote(quantity)).toThrow(reason);
  });

  it('rejects stale market data', () => {
    expect(() =>
      createService({ now: '2026-09-11T12:00:10.001Z' }).quote('0.001'),
    ).toThrow('top_of_book_stale');
  });

  it('rejects unavailable metadata', () => {
    expect(() => createService({ metadata: false }).quote('0.001')).toThrow(
      'metadata_unavailable',
    );
  });

  it('rejects a pair that is not trading', () => {
    expect(() => createService({ status: 'BREAK' }).quote('0.001')).toThrow(
      'pair_not_trading',
    );
  });
});

function createService(
  options: {
    now?: string;
    metadata?: boolean;
    status?: string;
    feeRate?: string;
  } = {},
): PaperMarketSellQuoteService {
  const books = new LatestTopOfBookService();
  const metadata = new LatestPairMetadataService();
  books.update(topOfBook());
  if (options.metadata !== false) metadata.update(pairMetadata(options.status));

  return new PaperMarketSellQuoteService(
    books,
    metadata,
    new ConfigService({
      PAPER_QUOTE_MAX_MARKET_DATA_AGE_MS: 10000,
      PAPER_TAKER_FEE_RATE: options.feeRate ?? '0.001',
    }),
    { now: () => new Date(options.now ?? '2026-09-11T12:00:05.000Z') },
  );
}

function topOfBook(): MarketTopOfBook {
  return {
    provider: 'binance',
    symbol: 'BTC/USDT',
    updateId: '1',
    bidPrice: '77777.11',
    bidQuantity: '1',
    askPrice: '77777.12',
    askQuantity: '2',
    receivedAt: new Date('2026-09-11T12:00:00.000Z'),
  };
}

function pairMetadata(status = 'TRADING'): MarketPairMetadata {
  return {
    provider: 'binance',
    symbol: 'BTC/USDT',
    status,
    baseAsset: 'BTC',
    quoteAsset: 'USDT',
    minPrice: '0.01',
    maxPrice: '1000000',
    tickSize: '0.01',
    minQuantity: '0.00001',
    maxQuantity: '9000',
    stepSize: '0.00001',
    minNotional: '5',
    receivedAt: new Date('2026-09-11T11:00:00.000Z'),
  };
}
