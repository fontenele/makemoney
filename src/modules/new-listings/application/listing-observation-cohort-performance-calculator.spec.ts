import { ListingObservationCohortPerformanceCalculator } from './listing-observation-cohort-performance-calculator';
import { ListingObservationPricePerformance } from '../domain/listing-observation-price-performance';

describe('ListingObservationCohortPerformanceCalculator', () => {
  const calculator = new ListingObservationCohortPerformanceCalculator();

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
        performance('AUSDT', [
          ['T+0', 0, '0'],
          ['T+5s', 5_000, '0.2'],
          ['T+1m', 60_000, '-0.1'],
        ]),
        performance('BUSDT', [
          ['T+0', 0, '0'],
          ['T+5s', 5_000, '-0.1'],
        ]),
        performance('CUSDT', [
          ['T+0', 0, '0'],
          ['T+5s', 5_000, '0'],
        ]),
      ]),
    ).toEqual({
      provider: 'binance',
      detectionCount: 3,
      checkpoints: [
        {
          label: 'T+0',
          offsetMs: 0,
          sampleSize: 3,
          positiveReturnCount: 0,
          negativeReturnCount: 0,
          flatReturnCount: 3,
          averagePriceReturnRate: '0',
        },
        {
          label: 'T+5s',
          offsetMs: 5_000,
          sampleSize: 3,
          positiveReturnCount: 1,
          negativeReturnCount: 1,
          flatReturnCount: 1,
          averagePriceReturnRate: '0.03333333333333333333333333333333333333333',
        },
        {
          label: 'T+1m',
          offsetMs: 60_000,
          sampleSize: 1,
          positiveReturnCount: 0,
          negativeReturnCount: 1,
          flatReturnCount: 0,
          averagePriceReturnRate: '-0.1',
        },
      ],
    });
  });

  it('rejects duplicate detections and invalid checkpoint points', () => {
    const sample = performance('AUSDT', [['T+0', 0, '0']]);
    expect(() => calculator.calculate([sample, sample])).toThrow(
      'cohort symbols must be unique',
    );
    expect(() =>
      calculator.calculate([
        performance('AUSDT', [
          ['T+0', 0, '0'],
          ['T+5s', 10_000, '0.1'],
        ]),
      ]),
    ).toThrow('performance point is invalid');
  });
});

function performance(
  symbol: string,
  points: Array<
    [
      ListingObservationPricePerformance['points'][number]['label'],
      number,
      string,
    ]
  >,
): ListingObservationPricePerformance {
  return {
    provider: 'binance',
    symbol,
    baselineLabel: 'T+0',
    baselinePrice: '100',
    points: points.map(([label, offsetMs, priceReturnRate]) => ({
      label,
      offsetMs,
      targetAt: new Date(1_789_348_400_000 + offsetMs),
      completedAt: new Date(1_789_348_401_000 + offsetMs),
      lastPrice: '100',
      absolutePriceChange: '0',
      priceReturnRate,
    })),
  };
}
