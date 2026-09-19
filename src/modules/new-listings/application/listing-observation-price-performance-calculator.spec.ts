import { ListingObservationPricePerformanceCalculator } from './listing-observation-price-performance-calculator';
import { CompletedListingObservationCheckpoint } from '../domain/listing-observation-schedule';

describe('ListingObservationPricePerformanceCalculator', () => {
  const calculator = new ListingObservationPricePerformanceCalculator();

  it('calculates exact T+0-relative price changes in schedule order', () => {
    expect(
      calculator.calculate([
        observation('T+1m', 60_000, '80'),
        observation('T+0', 0, '100'),
        observation('T+5s', 5_000, '125'),
      ]),
    ).toEqual({
      provider: 'binance',
      symbol: 'NEWUSDT',
      baselineLabel: 'T+0',
      baselinePrice: '100',
      points: [
        expect.objectContaining({
          label: 'T+0',
          lastPrice: '100',
          absolutePriceChange: '0',
          priceReturnRate: '0',
        }),
        expect.objectContaining({
          label: 'T+5s',
          lastPrice: '125',
          absolutePriceChange: '25',
          priceReturnRate: '0.25',
        }),
        expect.objectContaining({
          label: 'T+1m',
          lastPrice: '80',
          absolutePriceChange: '-20',
          priceReturnRate: '-0.2',
        }),
      ],
    });
  });

  it('returns unavailable without observations or the explicit T+0 baseline', () => {
    expect(calculator.calculate([])).toBeNull();
    expect(
      calculator.calculate([observation('T+5s', 5_000, '125')]),
    ).toBeNull();
  });

  it('rejects mixed identities, duplicate labels, and invalid schedule data', () => {
    expect(() =>
      calculator.calculate([
        observation('T+0', 0, '100'),
        { ...observation('T+5s', 5_000, '101'), symbol: 'OTHERUSDT' },
      ]),
    ).toThrow('must share one provider and symbol');
    expect(() =>
      calculator.calculate([
        observation('T+0', 0, '100'),
        observation('T+0', 0, '101'),
      ]),
    ).toThrow('checkpoint labels must be unique');
    expect(() =>
      calculator.calculate([observation('T+5s', 10_000, '101')]),
    ).toThrow('checkpoint schedule is invalid');
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
