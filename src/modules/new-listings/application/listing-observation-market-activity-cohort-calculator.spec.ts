import { ListingObservationMarketActivityCohortCalculator } from './listing-observation-market-activity-cohort-calculator';
import { CompletedListingObservationCheckpoint } from '../domain/listing-observation-schedule';

describe('ListingObservationMarketActivityCohortCalculator', () => {
  const calculator = new ListingObservationMarketActivityCohortCalculator();

  it('returns an explicit empty cohort', () => {
    expect(calculator.calculate([])).toEqual({
      provider: null,
      detectionCount: 0,
      checkpoints: [],
    });
  });

  it('groups unequal checkpoint samples and calculates exact averages', () => {
    expect(
      calculator.calculate([
        [observation('AUSDT', 'T+0', 0, '10', '100', 2)],
        [
          observation('BUSDT', 'T+0', 0, '20', '200', 3),
          observation('BUSDT', 'T+5s', 5_000, '4', '10', 2),
        ],
        [
          observation('CUSDT', 'T+0', 0, '0', '0', 0),
          observation('CUSDT', 'T+5s', 5_000, '1', '5', 1),
        ],
      ]),
    ).toEqual({
      provider: 'binance',
      detectionCount: 3,
      checkpoints: [
        {
          label: 'T+0',
          offsetMs: 0,
          sampleSize: 3,
          averageBaseVolume: '10',
          averageQuoteVolume: '100',
          averageTradeCount: '1.666666666666666666666666666666666666667',
        },
        {
          label: 'T+5s',
          offsetMs: 5_000,
          sampleSize: 2,
          averageBaseVolume: '2.5',
          averageQuoteVolume: '7.5',
          averageTradeCount: '1.5',
        },
      ],
    });
  });

  it('rejects empty, duplicate, mixed-symbol, and invalid checkpoints', () => {
    expect(() => calculator.calculate([[]])).toThrow(
      'activity timeline must not be empty',
    );
    const sample = [observation('AUSDT', 'T+0', 0, '1', '2', 3)];
    expect(() => calculator.calculate([sample, sample])).toThrow(
      'activity symbols must be unique',
    );
    expect(() =>
      calculator.calculate([
        [...sample, observation('BUSDT', 'T+5s', 5_000, '1', '2', 3)],
      ]),
    ).toThrow('activity checkpoint is invalid');
    expect(() =>
      calculator.calculate([
        [observation('AUSDT', 'T+5s', 10_000, '1', '2', 3)],
      ]),
    ).toThrow('activity checkpoint is invalid');
    expect(() =>
      calculator.calculate([
        [
          {
            ...observation('AUSDT', 'T+0', 0, '1', '2', 3),
            completedAt: new Date(0),
          },
        ],
      ]),
    ).toThrow('activity checkpoint is invalid');
  });
});

function observation(
  symbol: string,
  label: CompletedListingObservationCheckpoint['label'],
  offsetMs: number,
  baseVolume: string,
  quoteVolume: string,
  tradeCount: number,
): CompletedListingObservationCheckpoint {
  const targetAt = new Date(1_789_348_400_000 + offsetMs);
  return {
    provider: 'binance',
    symbol,
    label,
    offsetMs,
    targetAt,
    completedAt: new Date(targetAt.getTime() + 1_000),
    lastPrice: '100',
    baseVolume,
    quoteVolume,
    tradeCount,
    windowOpenTime: new Date(targetAt.getTime() - 86_400_000),
    windowCloseTime: targetAt,
    receivedAt: new Date(targetAt.getTime() + 500),
  };
}
