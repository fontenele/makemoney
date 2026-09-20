import { StoredListingTopOfBookCheckpoint } from '../domain/listing-top-of-book-observation-repository';
import { ListingTopOfBookImbalanceEvolutionCalculator } from './listing-top-of-book-imbalance-evolution-calculator';

describe('ListingTopOfBookImbalanceEvolutionCalculator', () => {
  const calculator = new ListingTopOfBookImbalanceEvolutionCalculator();

  it('reports an empty timeline as unavailable', () => {
    expect(calculator.calculate([])).toBeNull();
  });

  it('requires an available T+0 imbalance baseline', () => {
    expect(calculator.calculate([book('T+5s', 5_000, '1', '1')])).toBeNull();
    expect(calculator.calculate([book('T+0', 0, '0', '0')])).toBeNull();
  });

  it('calculates exact ordered T+0-relative imbalance changes', () => {
    expect(
      calculator.calculate([
        book('T+10s', 10_000, '0', '0'),
        book('T+5s', 5_000, '0', '1'),
        book('T+0', 0, '1', '0'),
      ]),
    ).toEqual({
      provider: 'binance',
      symbol: 'NEWUSDT',
      baselineLabel: 'T+0',
      baselineImbalanceRate: '1',
      points: [
        {
          label: 'T+0',
          offsetMs: 0,
          targetAt: new Date(1_789_348_400_000),
          imbalanceRate: '1',
          imbalanceChange: '0',
        },
        {
          label: 'T+5s',
          offsetMs: 5_000,
          targetAt: new Date(1_789_348_405_000),
          imbalanceRate: '-1',
          imbalanceChange: '-2',
        },
        {
          label: 'T+10s',
          offsetMs: 10_000,
          targetAt: new Date(1_789_348_410_000),
          imbalanceRate: null,
          imbalanceChange: null,
        },
      ],
    });
  });

  it('rejects mixed identities, duplicate labels, and invalid schedules', () => {
    const baseline = book('T+0', 0, '1', '1');
    expect(() =>
      calculator.calculate([
        baseline,
        { ...book('T+5s', 5_000, '1', '1'), symbol: 'OTHERUSDT' },
      ]),
    ).toThrow('must share one identity');
    expect(() => calculator.calculate([baseline, baseline])).toThrow(
      'labels must be unique',
    );
    expect(() =>
      calculator.calculate([book('T+5s', 10_000, '1', '1')]),
    ).toThrow('schedule is invalid');
  });

  it('rejects an invalid book before deriving evolution', () => {
    expect(() =>
      calculator.calculate([{ ...book('T+0', 0, '1', '1'), askPrice: '98' }]),
    ).toThrow('must not be crossed');
  });
});

function book(
  label: StoredListingTopOfBookCheckpoint['label'],
  offsetMs: number,
  bidQuantity: string,
  askQuantity: string,
): StoredListingTopOfBookCheckpoint {
  return {
    provider: 'binance',
    symbol: 'NEWUSDT',
    label,
    offsetMs,
    targetAt: new Date(1_789_348_400_000 + offsetMs),
    updateId: '123456',
    bidPrice: '99',
    bidQuantity,
    askPrice: '101',
    askQuantity,
    receivedAt: new Date(1_789_348_400_500 + offsetMs),
  };
}
