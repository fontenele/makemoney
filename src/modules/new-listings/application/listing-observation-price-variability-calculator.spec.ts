import { CompletedListingObservationCheckpoint } from '../domain/listing-observation-schedule';
import { ListingObservationPriceVariabilityCalculator } from './listing-observation-price-variability-calculator';

describe('ListingObservationPriceVariabilityCalculator', () => {
  const calculator = new ListingObservationPriceVariabilityCalculator();

  it('calculates exact consecutive-return variability and maximum movement', () => {
    expect(
      calculator.calculate([
        observation('T+10s', 10_000, '90'),
        observation('T+0', 0, '100'),
        observation('T+5s', 5_000, '120'),
        observation('T+30s', 30_000, '90'),
      ]),
    ).toEqual({
      provider: 'binance',
      symbol: 'NEWUSDT',
      transitionCount: 3,
      averageAbsoluteReturnRate: '0.15',
      maximumAbsoluteReturn: {
        from: { label: 'T+5s', offsetMs: 5_000, lastPrice: '120' },
        to: { label: 'T+10s', offsetMs: 10_000, lastPrice: '90' },
        durationMs: 5_000,
        returnRate: '-0.25',
        absoluteReturnRate: '0.25',
      },
    });
  });

  it('retains the earliest maximum when absolute movements tie', () => {
    expect(
      calculator.calculate([
        observation('T+0', 0, '100'),
        observation('T+5s', 5_000, '110'),
        observation('T+10s', 10_000, '99'),
      ]),
    ).toMatchObject({
      maximumAbsoluteReturn: {
        from: { label: 'T+0' },
        to: { label: 'T+5s' },
        absoluteReturnRate: '0.1',
      },
    });
  });

  it('reports no variability transition when only T+0 is available', () => {
    expect(calculator.calculate([observation('T+0', 0, '100')])).toEqual({
      provider: 'binance',
      symbol: 'NEWUSDT',
      transitionCount: 0,
      averageAbsoluteReturnRate: null,
      maximumAbsoluteReturn: null,
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
