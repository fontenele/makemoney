import { StoredListingTopOfBookCheckpoint } from '../domain/listing-top-of-book-observation-repository';
import { ListingCheckpointRoundTripCalculator } from './listing-checkpoint-round-trip-calculator';

describe('ListingCheckpointRoundTripCalculator', () => {
  const calculator = new ListingCheckpointRoundTripCalculator();

  it('calculates exact ask-to-bid returns after fees and slippage', () => {
    expect(
      calculator.calculate(
        book('T+0', 0, '99', '100'),
        book('T+5s', 5_000, '120', '121'),
        { feeRate: '0.01', slippageRate: '0.02' },
      ),
    ).toEqual({
      provider: 'binance',
      symbol: 'NEWUSDT',
      configuration: { feeRate: '0.01', slippageRate: '0.02' },
      entry: {
        label: 'T+0',
        offsetMs: 0,
        referencePrice: '100',
        executionPrice: '102',
      },
      exit: {
        label: 'T+5s',
        offsetMs: 5_000,
        referencePrice: '120',
        executionPrice: '117.6',
      },
      durationMs: 5_000,
      grossReturnRate: '0.2',
      netReturnRate: '0.130110658124635993011065812463599301107',
      profitableAfterCosts: true,
    });
  });

  it('marks a cost-adjusted losing round trip without executing anything', () => {
    expect(
      calculator.calculate(
        book('T+0', 0, '99', '100'),
        book('T+5s', 5_000, '101', '102'),
        { feeRate: '0.01', slippageRate: '0.01' },
      ),
    ).toMatchObject({
      grossReturnRate: '0.01',
      profitableAfterCosts: false,
    });
  });

  it('rejects invalid costs', () => {
    const entry = book('T+0', 0, '99', '100');
    const exit = book('T+5s', 5_000, '120', '121');
    expect(() =>
      calculator.calculate(entry, exit, {
        feeRate: '-0.01',
        slippageRate: '0',
      }),
    ).toThrow('fee rate is invalid');
    expect(() =>
      calculator.calculate(entry, exit, {
        feeRate: '0',
        slippageRate: '1',
      }),
    ).toThrow('slippage rate is invalid');
  });

  it('rejects mismatched identities and non-forward checkpoints', () => {
    const entry = book('T+0', 0, '99', '100');
    const other = { ...book('T+5s', 5_000, '120', '121'), symbol: 'OTHERUSDT' };
    expect(() =>
      calculator.calculate(entry, other, { feeRate: '0', slippageRate: '0' }),
    ).toThrow('identity must match');
    expect(() =>
      calculator.calculate(entry, entry, { feeRate: '0', slippageRate: '0' }),
    ).toThrow('checkpoint order is invalid');
  });

  it('rejects invalid or crossed stored books through the shared boundary', () => {
    expect(() =>
      calculator.calculate(
        book('T+0', 0, '101', '100'),
        book('T+5s', 5_000, '120', '121'),
        { feeRate: '0', slippageRate: '0' },
      ),
    ).toThrow('must not be crossed');
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
    updateId: `${offsetMs}`,
    bidPrice,
    bidQuantity: '100',
    askPrice,
    askQuantity: '100',
    receivedAt: new Date(1_789_348_401_000 + offsetMs),
  };
}
