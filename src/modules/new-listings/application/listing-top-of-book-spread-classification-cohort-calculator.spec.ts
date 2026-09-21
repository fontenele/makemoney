import { ListingTopOfBookSpreadClassification } from '../domain/listing-top-of-book-spread-classification';
import { ListingTopOfBookSpreadClassificationCohortCalculator } from './listing-top-of-book-spread-classification-cohort-calculator';

describe('ListingTopOfBookSpreadClassificationCohortCalculator', () => {
  const calculator = new ListingTopOfBookSpreadClassificationCohortCalculator();

  it('returns explicit empty counts and a nullable rate', () => {
    expect(calculator.calculate([])).toEqual({
      provider: null,
      thresholds: null,
      classificationCount: 0,
      noWideningObservedCount: 0,
      wideningObservedCount: 0,
      wideningObservedRate: null,
    });
  });

  it('aggregates observed widening counts with an exact rate', () => {
    expect(
      calculator.calculate([
        classification('AUSDT', 'no-widening-observed'),
        classification('BUSDT', 'widening-observed'),
        classification('CUSDT', 'widening-observed'),
      ]),
    ).toEqual({
      provider: 'binance',
      thresholds: { wideningBasisPoints: '100' },
      classificationCount: 3,
      noWideningObservedCount: 1,
      wideningObservedCount: 2,
      wideningObservedRate: '0.6666666666666666666666666666666666666667',
    });
  });

  it('rejects duplicate symbols, mixed thresholds, and incoherent results', () => {
    const sample = classification('AUSDT', 'widening-observed');
    expect(() => calculator.calculate([sample, sample])).toThrow(
      'cohort symbols must be unique',
    );
    expect(() =>
      calculator.calculate([
        sample,
        {
          ...classification('BUSDT', 'widening-observed'),
          thresholds: { wideningBasisPoints: '200' },
        },
      ]),
    ).toThrow('classification thresholds must match');
    expect(() => calculator.calculate([{ ...sample, widening: null }])).toThrow(
      'classification is incoherent',
    );
  });
});

function classification(
  symbol: string,
  status: ListingTopOfBookSpreadClassification['status'],
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
    maximumWidening: widening ?? {
      label: 'T+0',
      offsetMs: 0,
      spreadBasisPoints: '200',
      spreadBasisPointsChange: '0',
    },
  };
}
