import { ListingObservationPatternClassification } from '../domain/listing-observation-pattern-classification';
import { ListingObservationPatternTimingCohortCalculator } from './listing-observation-pattern-timing-cohort-calculator';

describe('ListingObservationPatternTimingCohortCalculator', () => {
  const calculator = new ListingObservationPatternTimingCohortCalculator();

  it('returns explicit null medians for an empty cohort', () => {
    expect(calculator.calculate([])).toEqual({
      provider: null,
      thresholds: null,
      pumpSampleSize: 0,
      correctionSampleSize: 0,
      medianTimeToPumpMs: null,
      medianTimeFromPeakToCorrectionMs: null,
    });
  });

  it('calculates event-specific odd-sample timing medians', () => {
    expect(
      calculator.calculate([
        classification('NOUSDT', 'no-pump-observed'),
        classification('ONEUSDT', 'pump-observed', 'T+5s', 5_000),
        classification('TWOUSDT', 'pump-observed', 'T+30s', 30_000),
        classification(
          'THREEUSDT',
          'pump-and-correction-observed',
          'T+10s',
          10_000,
          'T+1m',
          60_000,
        ),
      ]),
    ).toMatchObject({
      pumpSampleSize: 3,
      correctionSampleSize: 1,
      medianTimeToPumpMs: 10_000,
      medianTimeFromPeakToCorrectionMs: 50_000,
    });
  });

  it('averages the two middle durations for even samples', () => {
    expect(
      calculator.calculate([
        classification(
          'ONEUSDT',
          'pump-and-correction-observed',
          'T+5s',
          5_000,
          'T+30s',
          30_000,
        ),
        classification(
          'TWOUSDT',
          'pump-and-correction-observed',
          'T+10s',
          10_000,
          'T+1m',
          60_000,
        ),
      ]),
    ).toMatchObject({
      medianTimeToPumpMs: 7_500,
      medianTimeFromPeakToCorrectionMs: 37_500,
    });
  });

  it('rejects invalid checkpoint metadata and event order', () => {
    const invalidSchedule = classification(
      'ONEUSDT',
      'pump-observed',
      'T+5s',
      10_000,
    );
    expect(() => calculator.calculate([invalidSchedule])).toThrow(
      'event schedule is invalid',
    );

    const invalidOrder = classification(
      'TWOUSDT',
      'pump-and-correction-observed',
      'T+30s',
      30_000,
      'T+10s',
      10_000,
    );
    expect(() => calculator.calculate([invalidOrder])).toThrow(
      'event order is invalid',
    );
  });
});

function classification(
  symbol: string,
  status: ListingObservationPatternClassification['status'],
  pumpLabel: NonNullable<
    ListingObservationPatternClassification['pump']
  >['label'] = 'T+5s',
  pumpOffsetMs = 5_000,
  correctionLabel: NonNullable<
    ListingObservationPatternClassification['correction']
  >['label'] = 'T+30s',
  correctionOffsetMs = 30_000,
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
    evaluatedThroughLabel: 'T+1m',
    pump: pumpObserved
      ? {
          label: pumpLabel,
          offsetMs: pumpOffsetMs,
          priceReturnRate: '0.2',
        }
      : null,
    peak: pumpObserved
      ? {
          label: pumpLabel,
          offsetMs: pumpOffsetMs,
          priceReturnRate: '0.3',
          lastPrice: '130',
        }
      : null,
    correction: correctionObserved
      ? {
          label: correctionLabel,
          offsetMs: correctionOffsetMs,
          priceReturnRate: '0',
          drawdownFromPeakRate: '0.25',
        }
      : null,
  };
}
