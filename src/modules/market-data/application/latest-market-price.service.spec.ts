import { MarketTicker } from '../domain/market-ticker';
import { LatestMarketPriceService } from './latest-market-price.service';

describe('LatestMarketPriceService', () => {
  it('has no price before the first ticker', () => {
    expect(new LatestMarketPriceService().getLatest()).toBeUndefined();
  });

  it('retains the most recently received normalized ticker', () => {
    const service = new LatestMarketPriceService();
    const first = ticker('77000');
    const latest = ticker('78000');

    service.update(first);
    service.update(latest);

    expect(service.getLatest()).toBe(latest);
  });
});

function ticker(lastPrice: string): MarketTicker {
  return {
    provider: 'binance',
    symbol: 'BTC/USDT',
    lastPrice,
    eventTime: new Date('2026-09-11T12:00:00.000Z'),
    receivedAt: new Date('2026-09-11T12:00:00.100Z'),
  };
}
