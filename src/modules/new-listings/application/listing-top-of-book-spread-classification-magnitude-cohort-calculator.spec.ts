import { ListingTopOfBookSpreadClassification } from '../domain/listing-top-of-book-spread-classification';
import { ListingTopOfBookSpreadClassificationMagnitudeCohortCalculator } from './listing-top-of-book-spread-classification-magnitude-cohort-calculator';

describe('ListingTopOfBookSpreadClassificationMagnitudeCohortCalculator', () => {
  const calculator =
    new ListingTopOfBookSpreadClassificationMagnitudeCohortCalculator();

  it('returns an explicit null median for an empty cohort', () => {
    expect(calculator.calculate([])).toEqual({
      provider: null,
      thresholds: null,
      wideningSampleSize: 0,
      medianMaximumWideningBasisPoints: null,
    });
  });

  it('calculates an exact odd-sample median over observed widening only', () => {
    expect(
      calculator.calculate([
        classification('NOUSDT', 'no-widening-observed', '50'),
        classification('ONEUSDT', 'widening-observed', '300'),
        classification('TWOUSDT', 'widening-observed', '500'),
        classification('THREEUSDT', 'widening-observed', '400'),
      ]),
    ).toMatchObject({
      wideningSampleSize: 3,
      medianMaximumWideningBasisPoints: '400',
    });
  });

  it('averages the two middle values for an exact even-sample median', () => {
    expect(
      calculator.calculate([
        classification('ONEUSDT', 'widening-observed', '250'),
        classification('TWOUSDT', 'widening-observed', '350'),
      ]),
    ).toMatchObject({
      wideningSampleSize: 2,
      medianMaximumWideningBasisPoints: '300',
    });
  });

  it('rejects invalid or classification-inconsistent magnitudes', () => {
    expect(() =>
      calculator.calculate([
        classification('ONEUSDT', 'widening-observed', 'invalid'),
      ]),
    ).toThrow('maximum widening is invalid');
    expect(() =>
      calculator.calculate([
        classification('ONEUSDT', 'widening-observed', '99'),
      ]),
    ).toThrow('inconsistent with classification');
    expect(() =>
      calculator.calculate([
        classification('ONEUSDT', 'no-widening-observed', '100'),
      ]),
    ).toThrow('inconsistent with classification');
  });
});

function classification(
  symbol: string,
  status: ListingTopOfBookSpreadClassification['status'],
  maximumWidening: string,
): ListingTopOfBookSpreadClassification {
  const widening =
    status === 'widening-observed'
      ? {
          label: 'T+5s' as const,
          offsetMs: 5_000,
          spreadBasisPoints: '300',
          spreadBasisPointsChange: '100',
        }
      : null;
  return {
    provider: 'binance',
    symbol,
    status,
    thresholds: { wideningBasisPoints: '100' },
    evaluatedThroughLabel: 'T+10s',
    widening,
    maximumWidening: {
      label: 'T+10s',
      offsetMs: 10_000,
      spreadBasisPoints: '500',
      spreadBasisPointsChange: maximumWidening,
    },
  };
}
