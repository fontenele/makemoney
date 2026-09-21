import Decimal from 'decimal.js';
import { ListingObservationPricePathStatistics } from '../domain/listing-observation-price-path-statistics';
import { ListingObservationPricePathCohortCalculator } from './listing-observation-price-path-cohort-calculator';

describe('ListingObservationPricePathCohortCalculator', () => {
  const calculator = new ListingObservationPricePathCohortCalculator();

  it('returns explicit empty-sample semantics', () => {
    expect(calculator.calculate([])).toEqual({
      provider: null,
      sampleSize: 0,
      medianObservedHighOffsetMs: null,
      medianObservedLowOffsetMs: null,
      drawdownSampleSize: 0,
      medianMaximumDrawdownRate: null,
      medianMaximumDrawdownDurationMs: null,
    });
  });

  it('calculates comparable timing and drawdown medians', () => {
    expect(
      calculator.calculate([
        path('AUSDT', 'T+5s', 5_000, 'T+30s', 30_000, '120', '90'),
        path('BUSDT', 'T+10s', 10_000, 'T+1m', 60_000, '200', '150'),
        path('CUSDT', 'T+30s', 30_000, 'T+5m', 300_000, '100', '90'),
      ]),
    ).toEqual({
      provider: 'binance',
      sampleSize: 3,
      medianObservedHighOffsetMs: 10_000,
      medianObservedLowOffsetMs: 60_000,
      drawdownSampleSize: 3,
      medianMaximumDrawdownRate: '0.25',
      medianMaximumDrawdownDurationMs: 50_000,
    });
  });

  it('averages even samples with exact decimal arithmetic', () => {
    expect(
      calculator.calculate([
        path('AUSDT', 'T+5s', 5_000, 'T+10s', 10_000, '100', '90'),
        path('BUSDT', 'T+10s', 10_000, 'T+30s', 30_000, '100', '80'),
      ]),
    ).toMatchObject({
      medianObservedHighOffsetMs: 7_500,
      medianObservedLowOffsetMs: 20_000,
      medianMaximumDrawdownRate: '0.15',
      medianMaximumDrawdownDurationMs: 12_500,
    });
  });

  it('keeps zero-drawdown paths outside the positive drawdown sample', () => {
    const result = calculator.calculate([
      path('FLATUSDT', 'T+0', 0, 'T+0', 0, '100', '100'),
    ]);

    expect(result).toMatchObject({
      sampleSize: 1,
      drawdownSampleSize: 0,
      medianMaximumDrawdownRate: null,
      medianMaximumDrawdownDurationMs: null,
    });
  });

  it('rejects duplicate symbols, invalid schedules, and inconsistent drawdowns', () => {
    const sample = path('AUSDT', 'T+5s', 5_000, 'T+10s', 10_000, '100', '90');
    expect(() => calculator.calculate([sample, sample])).toThrow(
      'symbols must be unique',
    );

    const invalidSchedule = structuredClone(sample);
    invalidSchedule.observedHigh.offsetMs = 10_000;
    expect(() => calculator.calculate([invalidSchedule])).toThrow(
      'event schedule is invalid',
    );

    const inconsistent = structuredClone(sample);
    inconsistent.maximumDrawdown.priceDrawdownRate = '0.2';
    expect(() => calculator.calculate([inconsistent])).toThrow(
      'drawdown values are inconsistent',
    );

    const zeroPrice = structuredClone(sample);
    zeroPrice.observedLow.lastPrice = '0';
    expect(() => calculator.calculate([zeroPrice])).toThrow('price is invalid');
  });
});

function path(
  symbol: string,
  peakLabel: ListingObservationPricePathStatistics['observedHigh']['label'],
  peakOffset: number,
  troughLabel: ListingObservationPricePathStatistics['observedLow']['label'],
  troughOffset: number,
  peakPrice: string,
  troughPrice: string,
): ListingObservationPricePathStatistics {
  const absolute = new Decimal(peakPrice).minus(troughPrice);
  const rate = absolute.dividedBy(peakPrice);
  return {
    provider: 'binance',
    symbol,
    observedHigh: {
      label: peakLabel,
      offsetMs: peakOffset,
      lastPrice: peakPrice,
    },
    observedLow: {
      label: troughLabel,
      offsetMs: troughOffset,
      lastPrice: troughPrice,
    },
    maximumDrawdown: {
      peak: { label: peakLabel, offsetMs: peakOffset, lastPrice: peakPrice },
      trough: {
        label: troughLabel,
        offsetMs: troughOffset,
        lastPrice: troughPrice,
      },
      absolutePriceDrawdown: absolute.toFixed(),
      priceDrawdownRate: rate.toFixed(),
    },
  };
}
