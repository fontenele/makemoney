import { ListingTopOfBookImbalanceEvolution } from '../domain/listing-top-of-book-imbalance-evolution';
import { ListingTopOfBookImbalanceEvolutionCohortCalculator } from './listing-top-of-book-imbalance-evolution-cohort-calculator';

describe('ListingTopOfBookImbalanceEvolutionCohortCalculator', () => {
  const calculator = new ListingTopOfBookImbalanceEvolutionCohortCalculator();

  it('returns an explicit empty cohort', () => {
    expect(calculator.calculate([])).toEqual({
      provider: null,
      detectionCount: 0,
      checkpoints: [],
    });
  });

  it('averages exact available changes with independent checkpoint coverage', () => {
    expect(
      calculator.calculate([
        evolution('AUSDT', '0.25', '0.75', '0.5'),
        evolution('BUSDT', '-0.25', '-0.75', '-0.5'),
      ]),
    ).toEqual({
      provider: 'binance',
      detectionCount: 2,
      checkpoints: [
        {
          label: 'T+0',
          offsetMs: 0,
          sampleSize: 2,
          changeSampleSize: 2,
          unavailableChangeCount: 0,
          averageImbalanceChange: '0',
        },
        {
          label: 'T+5s',
          offsetMs: 5_000,
          sampleSize: 2,
          changeSampleSize: 2,
          unavailableChangeCount: 0,
          averageImbalanceChange: '0',
        },
      ],
    });
  });

  it('excludes unavailable changes from the average denominator', () => {
    const unavailable = evolution('BUSDT', '-0.25', '-0.75', '-0.5');
    unavailable.points[1] = {
      ...unavailable.points[1],
      imbalanceRate: null,
      imbalanceChange: null,
    };

    expect(
      calculator.calculate([
        evolution('AUSDT', '0.25', '0.75', '0.5'),
        unavailable,
      ]).checkpoints[1],
    ).toEqual({
      label: 'T+5s',
      offsetMs: 5_000,
      sampleSize: 2,
      changeSampleSize: 1,
      unavailableChangeCount: 1,
      averageImbalanceChange: '0.5',
    });
  });

  it('rejects duplicate symbols and incoherent evolution points', () => {
    const sample = evolution('AUSDT', '0.25', '0.75', '0.5');
    expect(() => calculator.calculate([sample, sample])).toThrow(
      'symbols must be unique',
    );
    expect(() =>
      calculator.calculate([
        {
          ...sample,
          points: [
            sample.points[0],
            { ...sample.points[1], imbalanceChange: '0.4' },
          ],
        },
      ]),
    ).toThrow('evolution point is invalid');
    expect(() =>
      calculator.calculate([{ ...sample, points: sample.points.slice(1) }]),
    ).toThrow('must include T+0');
  });
});

function evolution(
  symbol: string,
  baselineImbalanceRate: string,
  laterImbalanceRate: string,
  laterChange: string,
): ListingTopOfBookImbalanceEvolution {
  return {
    provider: 'binance',
    symbol,
    baselineLabel: 'T+0',
    baselineImbalanceRate,
    points: [
      {
        label: 'T+0',
        offsetMs: 0,
        targetAt: new Date(1_789_348_400_000),
        imbalanceRate: baselineImbalanceRate,
        imbalanceChange: '0',
      },
      {
        label: 'T+5s',
        offsetMs: 5_000,
        targetAt: new Date(1_789_348_405_000),
        imbalanceRate: laterImbalanceRate,
        imbalanceChange: laterChange,
      },
    ],
  };
}
