import { ListingTopOfBookSpreadEvolution } from '../domain/listing-top-of-book-spread-evolution';
import { ListingTopOfBookSpreadEvolutionCohortCalculator } from './listing-top-of-book-spread-evolution-cohort-calculator';

describe('ListingTopOfBookSpreadEvolutionCohortCalculator', () => {
  const calculator = new ListingTopOfBookSpreadEvolutionCohortCalculator();

  it('returns an explicit empty cohort', () => {
    expect(calculator.calculate([])).toEqual({
      provider: null,
      detectionCount: 0,
      checkpoints: [],
    });
  });

  it('averages exact changes with independent checkpoint coverage', () => {
    const incomplete = evolution('BUSDT', '300', '100', '-200');
    incomplete.points.pop();

    expect(
      calculator.calculate([
        evolution('AUSDT', '200', '400', '200'),
        incomplete,
      ]),
    ).toEqual({
      provider: 'binance',
      detectionCount: 2,
      checkpoints: [
        {
          label: 'T+0',
          offsetMs: 0,
          sampleSize: 2,
          averageSpreadBasisPointsChange: '0',
        },
        {
          label: 'T+5s',
          offsetMs: 5_000,
          sampleSize: 1,
          averageSpreadBasisPointsChange: '200',
        },
      ],
    });
  });

  it('averages repeating decimal results without native floating point', () => {
    expect(
      calculator.calculate([
        evolution('AUSDT', '1', '2', '1'),
        evolution('BUSDT', '1', '2', '1'),
        evolution('CUSDT', '1', '1', '0'),
      ]).checkpoints[1].averageSpreadBasisPointsChange,
    ).toBe('0.6666666666666666666666666666666666666667');
  });

  it('rejects duplicate symbols and incoherent evolution points', () => {
    const sample = evolution('AUSDT', '200', '400', '200');
    expect(() => calculator.calculate([sample, sample])).toThrow(
      'symbols must be unique',
    );
    expect(() =>
      calculator.calculate([
        {
          ...sample,
          points: [
            sample.points[0],
            { ...sample.points[1], spreadBasisPointsChange: '100' },
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
  baselineSpreadBasisPoints: string,
  laterSpreadBasisPoints: string,
  laterChange: string,
): ListingTopOfBookSpreadEvolution {
  return {
    provider: 'binance',
    symbol,
    baselineLabel: 'T+0',
    baselineSpreadBasisPoints,
    points: [
      {
        label: 'T+0',
        offsetMs: 0,
        targetAt: new Date(1_789_348_400_000),
        spreadBasisPoints: baselineSpreadBasisPoints,
        spreadBasisPointsChange: '0',
      },
      {
        label: 'T+5s',
        offsetMs: 5_000,
        targetAt: new Date(1_789_348_405_000),
        spreadBasisPoints: laterSpreadBasisPoints,
        spreadBasisPointsChange: laterChange,
      },
    ],
  };
}
