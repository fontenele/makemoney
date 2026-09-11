import { ConfigService } from '@nestjs/config';
import { LatestMarketPriceService } from '../../market-data/application/latest-market-price.service';
import { PaperWalletService } from './paper-wallet.service';
import { PortfolioValuationService } from './portfolio-valuation.service';

describe('PortfolioValuationService', () => {
  it('rejects valuation before a market price is available', async () => {
    const { service } = createService('1000', '0');

    await expect(service.getValuation()).rejects.toThrow(
      'BTC/USDT market price is not available yet',
    );
  });

  it('values USDT when the BTC balance is zero', async () => {
    const { service, prices } = createService('1000', '0');
    prices.update(ticker('77777.12'));

    await expect(service.getValuation()).resolves.toEqual({
      quoteAsset: 'USDT',
      btcBalance: '0',
      btcPrice: '77777.12',
      btcValue: '0',
      usdtBalance: '1000',
      totalValue: '1000',
      pricedAt: new Date('2026-09-11T12:00:00.000Z'),
    });
  });

  it('calculates the total with exact decimal arithmetic', async () => {
    const { service, prices } = createService('0.1', '0.2');
    prices.update(ticker('0.3'));

    const valuation = await service.getValuation();
    expect(valuation.totalValue).toBe('0.16');
    expect(valuation.btcValue).toBe('0.06');
  });

  it('rejects a price older than the configured maximum age', async () => {
    const { service, prices } = createService('1000', '0', 9899);
    prices.update(ticker('77000'));

    await expect(service.getValuation()).rejects.toThrow(
      'BTC/USDT market price is stale (9900ms old; maximum 9899ms)',
    );
  });

  it('accepts a price exactly at the configured maximum age', async () => {
    const { service, prices } = createService('1000', '0', 9900);
    prices.update(ticker('77000'));

    await expect(service.getValuation()).resolves.toMatchObject({
      btcPrice: '77000',
    });
  });

  it.each(['0', '-1', '1e3', 'NaN'])(
    'rejects invalid market price %s',
    async (price) => {
      const { service, prices } = createService('1000', '0');
      prices.update(ticker(price));

      await expect(service.getValuation()).rejects.toThrow();
    },
  );
});

function createService(
  usdt: string,
  btc: string,
  maxPriceAgeMs = 10000,
): {
  service: PortfolioValuationService;
  prices: LatestMarketPriceService;
} {
  const prices = new LatestMarketPriceService();
  const wallet = {
    getBalances: () => Promise.resolve({ BTC: btc, USDT: usdt }),
  } as PaperWalletService;

  return {
    service: new PortfolioValuationService(
      wallet,
      prices,
      new ConfigService({ PAPER_VALUATION_MAX_PRICE_AGE_MS: maxPriceAgeMs }),
      { now: () => new Date('2026-09-11T12:00:10.000Z') },
    ),
    prices,
  };
}

function ticker(lastPrice: string) {
  return {
    provider: 'binance' as const,
    symbol: 'BTC/USDT' as const,
    lastPrice,
    eventTime: new Date('2026-09-11T12:00:00.000Z'),
    receivedAt: new Date('2026-09-11T12:00:00.100Z'),
  };
}
