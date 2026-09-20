import { StoredListingTopOfBookCheckpoint } from '../domain/listing-top-of-book-observation-repository';
import { ListingTopOfBookSpreadEvolutionCalculator } from './listing-top-of-book-spread-evolution-calculator';

describe('ListingTopOfBookSpreadEvolutionCalculator', () => {
  const calculator = new ListingTopOfBookSpreadEvolutionCalculator();

  it('reports an empty timeline or missing T+0 as unavailable', () => {
    expect(calculator.calculate([])).toBeNull();
    expect(calculator.calculate([book('T+5s', 5_000, '98', '102')])).toBeNull();
  });

  it('calculates exact ordered T+0-relative spread changes', () => {
    expect(
      calculator.calculate([
        book('T+10s', 10_000, '100', '100'),
        book('T+5s', 5_000, '98', '102'),
        book('T+0', 0, '99', '101'),
      ]),
    ).toEqual({
      provider: 'binance',
      symbol: 'NEWUSDT',
      baselineLabel: 'T+0',
      baselineSpreadBasisPoints: '200',
      points: [
        {
          label: 'T+0',
          offsetMs: 0,
          targetAt: new Date(1_789_348_400_000),
          spreadBasisPoints: '200',
          spreadBasisPointsChange: '0',
        },
        {
          label: 'T+5s',
          offsetMs: 5_000,
          targetAt: new Date(1_789_348_405_000),
          spreadBasisPoints: '400',
          spreadBasisPointsChange: '200',
        },
        {
          label: 'T+10s',
          offsetMs: 10_000,
          targetAt: new Date(1_789_348_410_000),
          spreadBasisPoints: '0',
          spreadBasisPointsChange: '-200',
        },
      ],
    });
  });

  it('rejects mixed identities, duplicate labels, and invalid schedules', () => {
    const baseline = book('T+0', 0, '99', '101');
    expect(() =>
      calculator.calculate([
        baseline,
        { ...book('T+5s', 5_000, '99', '101'), symbol: 'OTHERUSDT' },
      ]),
    ).toThrow('must share one identity');
    expect(() => calculator.calculate([baseline, baseline])).toThrow(
      'labels must be unique',
    );
    expect(() =>
      calculator.calculate([book('T+5s', 10_000, '99', '101')]),
    ).toThrow('schedule is invalid');
  });

  it('rejects an invalid book before deriving evolution', () => {
    expect(() => calculator.calculate([book('T+0', 0, '101', '99')])).toThrow(
      'must not be crossed',
    );
  });
});

function book(
  label: StoredListingTopOfBookCheckpoint['label'],
  offsetMs: number,
  bidPrice: string,
  askPrice: string,
): StoredListingTopOfBookCheckpoint {
  return {
    provider: 'binance',
    symbol: 'NEWUSDT',
    label,
    offsetMs,
    targetAt: new Date(1_789_348_400_000 + offsetMs),
    updateId: '123456',
    bidPrice,
    bidQuantity: '1',
    askPrice,
    askQuantity: '1',
    receivedAt: new Date(1_789_348_400_500 + offsetMs),
  };
}
