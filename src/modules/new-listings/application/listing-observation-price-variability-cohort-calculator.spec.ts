import Decimal from 'decimal.js';
import { ListingObservationPriceVariability } from '../domain/listing-observation-price-variability';
import { ListingObservationPriceVariabilityCohortCalculator } from './listing-observation-price-variability-cohort-calculator';

describe('ListingObservationPriceVariabilityCohortCalculator', () => {
  const calculator = new ListingObservationPriceVariabilityCohortCalculator();

  it('returns explicit empty-sample semantics', () => {
    expect(calculator.calculate([])).toEqual({
      provider: null,
      sampleSize: 0,
      transitionSampleSize: 0,
      medianAverageAbsoluteReturnRate: null,
      medianMaximumAbsoluteReturnRate: null,
    });
  });

  it('calculates exact cross-asset variability medians', () => {
    expect(
      calculator.calculate([
        path('AUSDT', '0.1', '0.2'),
        path('BUSDT', '0.2', '0.3'),
        path('CUSDT', '0.4', '0.5'),
      ]),
    ).toEqual({
      provider: 'binance',
      sampleSize: 3,
      transitionSampleSize: 3,
      medianAverageAbsoluteReturnRate: '0.2',
      medianMaximumAbsoluteReturnRate: '0.3',
    });
  });

  it('averages even samples and excludes timelines without transitions', () => {
    expect(
      calculator.calculate([
        path('AUSDT', '0.1', '0.2'),
        emptyPath('FLATUSDT'),
        path('BUSDT', '0.3', '0.4'),
      ]),
    ).toEqual({
      provider: 'binance',
      sampleSize: 3,
      transitionSampleSize: 2,
      medianAverageAbsoluteReturnRate: '0.2',
      medianMaximumAbsoluteReturnRate: '0.3',
    });
  });

  it('returns null medians when no timeline has a transition', () => {
    expect(calculator.calculate([emptyPath('FLATUSDT')])).toMatchObject({
      sampleSize: 1,
      transitionSampleSize: 0,
      medianAverageAbsoluteReturnRate: null,
      medianMaximumAbsoluteReturnRate: null,
    });
  });

  it('rejects duplicate identities and inconsistent variability values', () => {
    const sample = path('AUSDT', '0.1', '0.2');
    expect(() => calculator.calculate([sample, sample])).toThrow(
      'symbols must be unique',
    );

    const invalidEmpty = emptyPath('FLATUSDT');
    invalidEmpty.averageAbsoluteReturnRate = '0';
    expect(() => calculator.calculate([invalidEmpty])).toThrow(
      'empty values are invalid',
    );

    const inconsistent = path('BUSDT', '0.1', '0.2');
    inconsistent.maximumAbsoluteReturn!.returnRate = '0.1';
    expect(() => calculator.calculate([inconsistent])).toThrow(
      'transition values are inconsistent',
    );

    const excessiveAverage = path('CUSDT', '0.3', '0.2');
    expect(() => calculator.calculate([excessiveAverage])).toThrow(
      'average exceeds maximum',
    );
  });
});

function emptyPath(symbol: string): ListingObservationPriceVariability {
  return {
    provider: 'binance',
    symbol,
    transitionCount: 0,
    averageAbsoluteReturnRate: null,
    maximumAbsoluteReturn: null,
  };
}

function path(
  symbol: string,
  averageAbsoluteReturnRate: string,
  maximumAbsoluteReturnRate: string,
): ListingObservationPriceVariability {
  const toPrice = new Decimal(100)
    .times(new Decimal(1).plus(maximumAbsoluteReturnRate))
    .toFixed();
  return {
    provider: 'binance',
    symbol,
    transitionCount: 2,
    averageAbsoluteReturnRate,
    maximumAbsoluteReturn: {
      from: { label: 'T+0', offsetMs: 0, lastPrice: '100' },
      to: { label: 'T+5s', offsetMs: 5_000, lastPrice: toPrice },
      durationMs: 5_000,
      returnRate: maximumAbsoluteReturnRate,
      absoluteReturnRate: maximumAbsoluteReturnRate,
    },
  };
}
