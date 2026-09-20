import { StoredListingTopOfBookCheckpoint } from '../domain/listing-top-of-book-observation-repository';
import { ListingTopOfBookCohortCalculator } from './listing-top-of-book-cohort-calculator';

describe('ListingTopOfBookCohortCalculator', () => {
  const calculator = new ListingTopOfBookCohortCalculator();

  it('returns an explicit empty cohort', () => {
    expect(calculator.calculate([])).toEqual({
      provider: null,
      detectionCount: 0,
      checkpoints: [],
    });
  });

  it('calculates exact checkpoint spread and displayed quote-notional averages', () => {
    expect(
      calculator.calculate([
        [book('AUSDT', 'T+0', 0, '99', '2', '101', '3')],
        [
          book('BUSDT', 'T+0', 0, '198', '1', '202', '2'),
          book('BUSDT', 'T+5s', 5_000, '49.5', '4', '50.5', '6'),
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
          averageSpreadBasisPoints: '200',
          averageBidQuoteNotional: '198',
          averageAskQuoteNotional: '353.5',
        },
        {
          label: 'T+5s',
          offsetMs: 5_000,
          sampleSize: 1,
          averageSpreadBasisPoints: '200',
          averageBidQuoteNotional: '198',
          averageAskQuoteNotional: '303',
        },
      ],
    });
  });

  it('rejects empty, duplicate-symbol, mixed-symbol, and invalid checkpoints', () => {
    expect(() => calculator.calculate([[]])).toThrow(
      'cohort timeline must not be empty',
    );
    const sample = [book('AUSDT', 'T+0', 0, '99', '1', '101', '1')];
    expect(() => calculator.calculate([sample, sample])).toThrow(
      'cohort symbols must be unique',
    );
    expect(() =>
      calculator.calculate([
        [...sample, book('BUSDT', 'T+5s', 5_000, '99', '1', '101', '1')],
      ]),
    ).toThrow('cohort checkpoint is invalid');
    expect(() =>
      calculator.calculate([
        [book('AUSDT', 'T+5s', 10_000, '99', '1', '101', '1')],
      ]),
    ).toThrow('cohort checkpoint is invalid');
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
  bidPrice: string,
  bidQuantity: string,
  askPrice: string,
  askQuantity: string,
): StoredListingTopOfBookCheckpoint {
  return {
    provider: 'binance',
    symbol,
    label,
    offsetMs,
    targetAt: new Date(1_789_348_400_000 + offsetMs),
    updateId: '123456',
    bidPrice,
    bidQuantity,
    askPrice,
    askQuantity,
    receivedAt: new Date(1_789_348_400_500 + offsetMs),
  };
}
