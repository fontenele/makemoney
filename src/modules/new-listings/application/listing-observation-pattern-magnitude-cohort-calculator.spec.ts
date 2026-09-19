import { ListingObservationPatternClassification } from '../domain/listing-observation-pattern-classification';
import { ListingObservationPatternMagnitudeCohortCalculator } from './listing-observation-pattern-magnitude-cohort-calculator';

describe('ListingObservationPatternMagnitudeCohortCalculator', () => {
  const calculator = new ListingObservationPatternMagnitudeCohortCalculator();

  it('returns explicit null medians for an empty cohort', () => {
    expect(calculator.calculate([])).toEqual({
      provider: null,
      thresholds: null,
      pumpSampleSize: 0,
      correctionSampleSize: 0,
      medianPeakReturnRate: null,
      medianCorrectionFromPeakRate: null,
    });
  });

  it('calculates exact odd-sample medians with independent denominators', () => {
    expect(
      calculator.calculate([
        classification('NOUSDT', 'no-pump-observed'),
        classification('ONEUSDT', 'pump-observed', '0.3'),
        classification('TWOUSDT', 'pump-observed', '0.5'),
        classification(
          'THREEUSDT',
          'pump-and-correction-observed',
          '0.4',
          '0.3',
        ),
      ]),
    ).toMatchObject({
      pumpSampleSize: 3,
      correctionSampleSize: 1,
      medianPeakReturnRate: '0.4',
      medianCorrectionFromPeakRate: '0.3',
    });
  });

  it('averages the two middle values for exact even-sample medians', () => {
    expect(
      calculator.calculate([
        classification(
          'ONEUSDT',
          'pump-and-correction-observed',
          '0.3',
          '0.25',
        ),
        classification(
          'TWOUSDT',
          'pump-and-correction-observed',
          '0.6',
          '0.35',
        ),
      ]),
    ).toMatchObject({
      medianPeakReturnRate: '0.45',
      medianCorrectionFromPeakRate: '0.3',
    });
  });

  it('rejects observed magnitudes below their classification thresholds', () => {
    expect(() =>
      calculator.calculate([
        classification('ONEUSDT', 'pump-observed', '0.19'),
      ]),
    ).toThrow('peak return rate is invalid');
    expect(() =>
      calculator.calculate([
        classification('ONEUSDT', 'pump-and-correction-observed', '0.3', '0.2'),
      ]),
    ).toThrow('correction from peak rate is invalid');
  });
});

function classification(
  symbol: string,
  status: ListingObservationPatternClassification['status'],
  peakReturnRate?: string,
  correctionFromPeakRate?: string,
): ListingObservationPatternClassification {
  const pumpObserved = status !== 'no-pump-observed';
  const correctionObserved = status === 'pump-and-correction-observed';
  return {
    provider: 'binance',
    symbol,
    status,
    thresholds: {
      pumpReturnRate: '0.2',
      correctionFromPeakRate: '0.25',
    },
    evaluatedThroughLabel: 'T+30s',
    pump: pumpObserved
      ? { label: 'T+5s', offsetMs: 5_000, priceReturnRate: '0.2' }
      : null,
    peak: pumpObserved
      ? {
          label: 'T+10s',
          offsetMs: 10_000,
          priceReturnRate: peakReturnRate!,
          lastPrice: '130',
        }
      : null,
    correction: correctionObserved
      ? {
          label: 'T+30s',
          offsetMs: 30_000,
          priceReturnRate: '0',
          drawdownFromPeakRate: correctionFromPeakRate!,
        }
      : null,
  };
}
