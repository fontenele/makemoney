import { ListingTopOfBookSpreadEvolution } from '../domain/listing-top-of-book-spread-evolution';
import { ListingTopOfBookSpreadClassifier } from './listing-top-of-book-spread-classifier';

describe('ListingTopOfBookSpreadClassifier', () => {
  const classifier = new ListingTopOfBookSpreadClassifier();
  const thresholds = { wideningBasisPoints: '100' };

  it('classifies the first threshold crossing and maximum widening', () => {
    expect(
      classifier.classify(
        evolution([
          ['T+0', 0, '200', '0'],
          ['T+5s', 5_000, '300', '100'],
          ['T+10s', 10_000, '450', '250'],
          ['T+30s', 30_000, '250', '50'],
        ]),
        thresholds,
      ),
    ).toEqual({
      provider: 'binance',
      symbol: 'NEWUSDT',
      status: 'widening-observed',
      thresholds,
      evaluatedThroughLabel: 'T+30s',
      widening: {
        label: 'T+5s',
        offsetMs: 5_000,
        spreadBasisPoints: '300',
        spreadBasisPointsChange: '100',
      },
      maximumWidening: {
        label: 'T+10s',
        offsetMs: 10_000,
        spreadBasisPoints: '450',
        spreadBasisPointsChange: '250',
      },
    });
  });

  it('keeps an explicit no-widening result and the largest observed change', () => {
    expect(
      classifier.classify(
        evolution([
          ['T+0', 0, '200', '0'],
          ['T+5s', 5_000, '150', '-50'],
        ]),
        thresholds,
      ),
    ).toMatchObject({
      status: 'no-widening-observed',
      evaluatedThroughLabel: 'T+5s',
      widening: null,
      maximumWidening: {
        label: 'T+0',
        spreadBasisPointsChange: '0',
      },
    });
  });

  it('requires an explicit positive decimal threshold', () => {
    expect(() =>
      classifier.classify(evolution([['T+0', 0, '200', '0']]), {
        wideningBasisPoints: '0',
      }),
    ).toThrow('threshold must be a positive decimal');
    expect(() =>
      classifier.classify(evolution([['T+0', 0, '200', '0']]), {
        wideningBasisPoints: 'invalid',
      }),
    ).toThrow('threshold must be a positive decimal');
  });

  it('rejects unordered or incoherent evolution points', () => {
    const unordered = evolution([
      ['T+0', 0, '200', '0'],
      ['T+5s', 5_000, '300', '100'],
    ]);
    unordered.points.reverse();
    expect(() => classifier.classify(unordered, thresholds)).toThrow(
      'evolution point is invalid',
    );

    const incoherent = evolution([
      ['T+0', 0, '200', '0'],
      ['T+5s', 5_000, '300', '99'],
    ]);
    expect(() => classifier.classify(incoherent, thresholds)).toThrow(
      'evolution point is invalid',
    );
  });
});

function evolution(
  points: Array<
    [
      ListingTopOfBookSpreadEvolution['points'][number]['label'],
      number,
      string,
      string,
    ]
  >,
): ListingTopOfBookSpreadEvolution {
  return {
    provider: 'binance',
    symbol: 'NEWUSDT',
    baselineLabel: 'T+0',
    baselineSpreadBasisPoints: '200',
    points: points.map(
      ([label, offsetMs, spreadBasisPoints, spreadBasisPointsChange]) => ({
        label,
        offsetMs,
        targetAt: new Date(1_789_348_400_000 + offsetMs),
        spreadBasisPoints,
        spreadBasisPointsChange,
      }),
    ),
  };
}
