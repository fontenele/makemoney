import { ListingTopOfBookSpreadClassification } from '../domain/listing-top-of-book-spread-classification';
import { ListingTopOfBookSpreadClassificationTimingCohortCalculator } from './listing-top-of-book-spread-classification-timing-cohort-calculator';

describe('ListingTopOfBookSpreadClassificationTimingCohortCalculator', () => {
  const calculator =
    new ListingTopOfBookSpreadClassificationTimingCohortCalculator();

  it('returns an explicit null median for an empty cohort', () => {
    expect(calculator.calculate([])).toEqual({
      provider: null,
      thresholds: null,
      wideningSampleSize: 0,
      medianTimeToWideningMs: null,
    });
  });

  it('calculates the median time to first observed widening', () => {
    expect(
      calculator.calculate([
        classification('NONEUSDT', 'no-widening-observed'),
        classification('ONEUSDT', 'widening-observed', 'T+5s', 5_000),
        classification('TWOUSDT', 'widening-observed', 'T+30s', 30_000),
        classification('THREEUSDT', 'widening-observed', 'T+10s', 10_000),
      ]),
    ).toMatchObject({
      wideningSampleSize: 3,
      medianTimeToWideningMs: 10_000,
    });
  });

  it('averages the two middle times for an even sample', () => {
    expect(
      calculator.calculate([
        classification('ONEUSDT', 'widening-observed', 'T+5s', 5_000),
        classification('TWOUSDT', 'widening-observed', 'T+10s', 10_000),
      ]),
    ).toMatchObject({
      wideningSampleSize: 2,
      medianTimeToWideningMs: 7_500,
    });
  });

  it('rejects invalid checkpoint metadata and event order', () => {
    expect(() =>
      calculator.calculate([
        classification('ONEUSDT', 'widening-observed', 'T+5s', 10_000),
      ]),
    ).toThrow('event schedule is invalid');

    const afterEvaluation = classification(
      'TWOUSDT',
      'widening-observed',
      'T+30s',
      30_000,
    );
    afterEvaluation.evaluatedThroughLabel = 'T+10s';
    expect(() => calculator.calculate([afterEvaluation])).toThrow(
      'event order is invalid',
    );
  });
});

function classification(
  symbol: string,
  status: ListingTopOfBookSpreadClassification['status'],
  wideningLabel: NonNullable<
    ListingTopOfBookSpreadClassification['widening']
  >['label'] = 'T+5s',
  wideningOffsetMs = 5_000,
): ListingTopOfBookSpreadClassification {
  const wideningObserved = status === 'widening-observed';
  const event = {
    label: wideningLabel,
    offsetMs: wideningOffsetMs,
    spreadBasisPoints: '130',
    spreadBasisPointsChange: '30',
  };
  return {
    provider: 'binance',
    symbol,
    status,
    thresholds: { wideningBasisPoints: '25' },
    evaluatedThroughLabel: 'T+1m',
    widening: wideningObserved ? event : null,
    maximumWidening: wideningObserved
      ? event
      : {
          label: 'T+0',
          offsetMs: 0,
          spreadBasisPoints: '100',
          spreadBasisPointsChange: '0',
        },
  };
}
