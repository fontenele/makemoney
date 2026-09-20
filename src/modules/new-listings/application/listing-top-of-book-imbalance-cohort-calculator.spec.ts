import { StoredListingTopOfBookCheckpoint } from '../domain/listing-top-of-book-observation-repository';
import { ListingTopOfBookImbalanceCohortCalculator } from './listing-top-of-book-imbalance-cohort-calculator';

describe('ListingTopOfBookImbalanceCohortCalculator', () => {
  const calculator = new ListingTopOfBookImbalanceCohortCalculator();

  it('returns an explicit empty cohort', () => {
    expect(calculator.calculate([])).toEqual({
      provider: null,
      detectionCount: 0,
      checkpoints: [],
    });
  });

  it('averages available imbalance rates with explicit checkpoint coverage', () => {
    expect(
      calculator.calculate([
        [book('AUSDT', 'T+0', 0, '1', '0')],
        [
          book('BUSDT', 'T+0', 0, '0', '1'),
          book('BUSDT', 'T+5s', 5_000, '0', '0'),
        ],
      ]),
    ).toEqual({
      provider: 'binance',
      detectionCount: 2,
      checkpoints: [
        {
          label: 'T+0',
          offsetMs: 0,
          sampleSize: 2,
          imbalanceSampleSize: 2,
          unavailableImbalanceCount: 0,
          averageImbalanceRate: '0',
        },
        {
          label: 'T+5s',
          offsetMs: 5_000,
          sampleSize: 1,
          imbalanceSampleSize: 0,
          unavailableImbalanceCount: 1,
          averageImbalanceRate: null,
        },
      ],
    });
  });

  it('does not include unavailable imbalance in the average denominator', () => {
    expect(
      calculator.calculate([
        [book('AUSDT', 'T+0', 0, '1', '0')],
        [book('BUSDT', 'T+0', 0, '0', '0')],
      ]).checkpoints[0],
    ).toMatchObject({
      sampleSize: 2,
      imbalanceSampleSize: 1,
      unavailableImbalanceCount: 1,
      averageImbalanceRate: '1',
    });
  });

  it('rejects empty, duplicate-symbol, mixed-symbol, and invalid checkpoints', () => {
    expect(() => calculator.calculate([[]])).toThrow(
      'imbalance timeline must not be empty',
    );
    const sample = [book('AUSDT', 'T+0', 0, '1', '1')];
    expect(() => calculator.calculate([sample, sample])).toThrow(
      'cohort symbols must be unique',
    );
    expect(() =>
      calculator.calculate([
        [...sample, book('BUSDT', 'T+5s', 5_000, '1', '1')],
      ]),
    ).toThrow('imbalance checkpoint is invalid');
    expect(() =>
      calculator.calculate([[book('AUSDT', 'T+5s', 10_000, '1', '1')]]),
    ).toThrow('imbalance checkpoint is invalid');
    expect(() =>
      calculator.calculate([
        [
          {
            ...sample[0],
            askPrice: '98',
          },
        ],
      ]),
    ).toThrow('must not be crossed');
  });
});

function book(
  symbol: string,
  label: StoredListingTopOfBookCheckpoint['label'],
  offsetMs: number,
  bidQuantity: string,
  askQuantity: string,
): StoredListingTopOfBookCheckpoint {
  return {
    provider: 'binance',
    symbol,
    label,
    offsetMs,
    targetAt: new Date(1_789_348_400_000 + offsetMs),
    updateId: '123456',
    bidPrice: '99',
    bidQuantity,
    askPrice: '101',
    askQuantity,
    receivedAt: new Date(1_789_348_400_500 + offsetMs),
  };
}
