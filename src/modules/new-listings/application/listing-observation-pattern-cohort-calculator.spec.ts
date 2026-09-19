import { ListingObservationPatternClassification } from '../domain/listing-observation-pattern-classification';
import { ListingObservationPatternCohortCalculator } from './listing-observation-pattern-cohort-calculator';

describe('ListingObservationPatternCohortCalculator', () => {
  const calculator = new ListingObservationPatternCohortCalculator();

  it('returns explicit empty counts and nullable rates', () => {
    expect(calculator.calculate([])).toEqual({
      provider: null,
      thresholds: null,
      classificationCount: 0,
      noPumpObservedCount: 0,
      pumpObservedCount: 0,
      correctionObservedCount: 0,
      pumpObservedRate: null,
      correctionObservedRate: null,
      correctionAmongPumpsRate: null,
    });
  });

  it('aggregates observed pump and correction counts with exact rates', () => {
    expect(
      calculator.calculate([
        classification('AUSDT', 'no-pump-observed'),
        classification('BUSDT', 'pump-observed'),
        classification('CUSDT', 'pump-and-correction-observed'),
      ]),
    ).toEqual({
      provider: 'binance',
      thresholds: {
        pumpReturnRate: '0.2',
        correctionFromPeakRate: '0.25',
      },
      classificationCount: 3,
      noPumpObservedCount: 1,
      pumpObservedCount: 2,
      correctionObservedCount: 1,
      pumpObservedRate: '0.6666666666666666666666666666666666666667',
      correctionObservedRate: '0.3333333333333333333333333333333333333333',
      correctionAmongPumpsRate: '0.5',
    });
  });

  it('rejects duplicate symbols, mixed thresholds, and incoherent results', () => {
    const sample = classification('AUSDT', 'pump-observed');
    expect(() => calculator.calculate([sample, sample])).toThrow(
      'cohort symbols must be unique',
    );
    expect(() =>
      calculator.calculate([
        sample,
        {
          ...classification('BUSDT', 'pump-observed'),
          thresholds: {
            pumpReturnRate: '0.3',
            correctionFromPeakRate: '0.25',
          },
        },
      ]),
    ).toThrow('pattern thresholds must match');
    expect(() => calculator.calculate([{ ...sample, pump: null }])).toThrow(
      'classification is incoherent',
    );
  });
});

function classification(
  symbol: string,
  status: ListingObservationPatternClassification['status'],
): ListingObservationPatternClassification {
  const pump =
    status === 'no-pump-observed'
      ? null
      : { label: 'T+5s' as const, offsetMs: 5_000, priceReturnRate: '0.25' };
  const peak = pump ? { ...pump, lastPrice: '125' } : null;
  const correction =
    status === 'pump-and-correction-observed'
      ? {
          label: 'T+10s' as const,
          offsetMs: 10_000,
          priceReturnRate: '-0.0625',
          drawdownFromPeakRate: '0.25',
        }
      : null;
  return {
    provider: 'binance',
    symbol,
    status,
    thresholds: {
      pumpReturnRate: '0.2',
      correctionFromPeakRate: '0.25',
    },
    evaluatedThroughLabel: 'T+10s',
    pump,
    peak,
    correction,
  };
}
