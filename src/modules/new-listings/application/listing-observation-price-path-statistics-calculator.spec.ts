import { CompletedListingObservationCheckpoint } from '../domain/listing-observation-schedule';
import { ListingObservationPricePathStatisticsCalculator } from './listing-observation-price-path-statistics-calculator';

describe('ListingObservationPricePathStatisticsCalculator', () => {
  const calculator = new ListingObservationPricePathStatisticsCalculator();

  it('derives observed high, low, and maximum peak-to-trough drawdown', () => {
    expect(
      calculator.calculate([
        observation('T+30s', 30_000, '90'),
        observation('T+0', 0, '100'),
        observation('T+5s', 5_000, '120'),
        observation('T+10s', 10_000, '110'),
        observation('T+1m', 60_000, '95'),
      ]),
    ).toEqual({
      provider: 'binance',
      symbol: 'NEWUSDT',
      observedHigh: { label: 'T+5s', offsetMs: 5_000, lastPrice: '120' },
      observedLow: { label: 'T+30s', offsetMs: 30_000, lastPrice: '90' },
      maximumDrawdown: {
        peak: { label: 'T+5s', offsetMs: 5_000, lastPrice: '120' },
        trough: { label: 'T+30s', offsetMs: 30_000, lastPrice: '90' },
        absolutePriceDrawdown: '30',
        priceDrawdownRate: '0.25',
      },
    });
  });

  it('reports zero drawdown for a monotonically rising path', () => {
    expect(
      calculator.calculate([
        observation('T+0', 0, '100'),
        observation('T+5s', 5_000, '110'),
      ]),
    ).toMatchObject({
      observedHigh: { label: 'T+5s', lastPrice: '110' },
      observedLow: { label: 'T+0', lastPrice: '100' },
      maximumDrawdown: {
        peak: { label: 'T+0', lastPrice: '100' },
        trough: { label: 'T+0', lastPrice: '100' },
        absolutePriceDrawdown: '0',
        priceDrawdownRate: '0',
      },
    });
  });

  it('retains the earliest event when extrema or drawdowns tie', () => {
    expect(
      calculator.calculate([
        observation('T+0', 0, '100'),
        observation('T+5s', 5_000, '120'),
        observation('T+10s', 10_000, '90'),
        observation('T+30s', 30_000, '120'),
        observation('T+1m', 60_000, '90'),
      ]),
    ).toMatchObject({
      observedHigh: { label: 'T+5s' },
      observedLow: { label: 'T+10s' },
      maximumDrawdown: {
        peak: { label: 'T+5s' },
        trough: { label: 'T+10s' },
      },
    });
  });

  it('returns unavailable without an explicit T+0 baseline', () => {
    expect(calculator.calculate([])).toBeNull();
    expect(
      calculator.calculate([observation('T+5s', 5_000, '110')]),
    ).toBeNull();
  });
});

function observation(
  label: CompletedListingObservationCheckpoint['label'],
  offsetMs: number,
  lastPrice: string,
): CompletedListingObservationCheckpoint {
  const targetAt = new Date(1_789_348_400_000 + offsetMs);
  return {
    provider: 'binance',
    symbol: 'NEWUSDT',
    label,
    offsetMs,
    targetAt,
    completedAt: new Date(targetAt.getTime() + 1_000),
    lastPrice,
    baseVolume: '1000',
    quoteVolume: '100000',
    tradeCount: 100,
    windowOpenTime: new Date('2026-09-13T02:00:00.000Z'),
    windowCloseTime: new Date('2026-09-14T02:00:00.000Z'),
    receivedAt: new Date('2026-09-14T02:00:01.000Z'),
  };
}
