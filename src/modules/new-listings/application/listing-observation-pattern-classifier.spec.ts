import { ListingObservationPatternClassifier } from './listing-observation-pattern-classifier';
import { ListingObservationPricePerformance } from '../domain/listing-observation-price-performance';

describe('ListingObservationPatternClassifier', () => {
  const classifier = new ListingObservationPatternClassifier();
  const thresholds = {
    pumpReturnRate: '0.2',
    correctionFromPeakRate: '0.25',
  };

  it('classifies a pump followed by a correction from the later peak', () => {
    expect(
      classifier.classify(
        performance([
          ['T+0', 0, '100', '0'],
          ['T+5s', 5_000, '120', '0.2'],
          ['T+10s', 10_000, '160', '0.6'],
          ['T+30s', 30_000, '120', '0.2'],
        ]),
        thresholds,
      ),
    ).toMatchObject({
      status: 'pump-and-correction-observed',
      evaluatedThroughLabel: 'T+30s',
      pump: { label: 'T+5s', priceReturnRate: '0.2' },
      peak: { label: 'T+10s', lastPrice: '160' },
      correction: {
        label: 'T+30s',
        drawdownFromPeakRate: '0.25',
      },
    });
  });

  it('distinguishes a pump without correction from no observed pump', () => {
    expect(
      classifier.classify(
        performance([
          ['T+0', 0, '100', '0'],
          ['T+5s', 5_000, '125', '0.25'],
        ]),
        thresholds,
      ).status,
    ).toBe('pump-observed');
    expect(
      classifier.classify(
        performance([
          ['T+0', 0, '100', '0'],
          ['T+5s', 5_000, '119', '0.19'],
        ]),
        thresholds,
      ),
    ).toMatchObject({
      status: 'no-pump-observed',
      pump: null,
      peak: null,
      correction: null,
    });
  });

  it('requires explicit valid positive thresholds', () => {
    expect(() =>
      classifier.classify(performance([['T+0', 0, '100', '0']]), {
        ...thresholds,
        pumpReturnRate: '0',
      }),
    ).toThrow('pump return rate must be a positive decimal');
    expect(() =>
      classifier.classify(performance([['T+0', 0, '100', '0']]), {
        ...thresholds,
        correctionFromPeakRate: '1.1',
      }),
    ).toThrow('Correction from peak rate must not exceed one');
  });

  it('rejects malformed or unordered performance points', () => {
    const malformed = performance([
      ['T+0', 0, '100', '0'],
      ['T+5s', 5_000, '120', '0.2'],
    ]);
    malformed.points.reverse();
    expect(() => classifier.classify(malformed, thresholds)).toThrow(
      'performance point is invalid',
    );
  });
});

function performance(
  points: Array<
    [
      ListingObservationPricePerformance['points'][number]['label'],
      number,
      string,
      string,
    ]
  >,
): ListingObservationPricePerformance {
  return {
    provider: 'binance',
    symbol: 'NEWUSDT',
    baselineLabel: 'T+0',
    baselinePrice: '100',
    points: points.map(([label, offsetMs, lastPrice, priceReturnRate]) => ({
      label,
      offsetMs,
      targetAt: new Date(1_789_348_400_000 + offsetMs),
      completedAt: new Date(1_789_348_401_000 + offsetMs),
      lastPrice,
      absolutePriceChange: '0',
      priceReturnRate,
    })),
  };
}
