import { ListingCheckpointRoundTrip } from '../domain/listing-checkpoint-round-trip';
import { ListingCheckpointRoundTripCalculator } from './listing-checkpoint-round-trip-calculator';
import { ListingCheckpointRoundTripCohortCalculator } from './listing-checkpoint-round-trip-cohort-calculator';

const selection = {
  entryLabel: 'T+0' as const,
  exitLabel: 'T+5s' as const,
  feeRate: '0',
  slippageRate: '0',
};

describe('ListingCheckpointRoundTripCohortCalculator', () => {
  const calculator = new ListingCheckpointRoundTripCohortCalculator();

  it('aggregates exact returns and availability for one fixed configuration', () => {
    expect(
      calculator.calculate(selection, [
        sample('GAINUSDT', roundTrip('GAINUSDT', '100', '120')),
        sample('LOSSUSDT', roundTrip('LOSSUSDT', '100', '80')),
        sample('MISSINGUSDT', null),
      ]),
    ).toEqual({
      provider: 'binance',
      selection,
      sampleSize: 3,
      availableSampleSize: 2,
      unavailableSampleSize: 1,
      profitableAfterCostsCount: 1,
      nonProfitableAfterCostsCount: 1,
      profitableAfterCostsRate: '0.5',
      averageGrossReturnRate: '0',
      averageNetReturnRate: '0',
      medianNetReturnRate: '0',
    });
  });

  it('preserves explicit empty and all-unavailable semantics', () => {
    expect(calculator.calculate(selection, [])).toMatchObject({
      provider: null,
      sampleSize: 0,
      availableSampleSize: 0,
      profitableAfterCostsRate: null,
      averageNetReturnRate: null,
      medianNetReturnRate: null,
    });
    expect(
      calculator.calculate(selection, [sample('MISSINGUSDT', null)]),
    ).toMatchObject({
      provider: 'binance',
      sampleSize: 1,
      availableSampleSize: 0,
      unavailableSampleSize: 1,
      profitableAfterCostsRate: null,
    });
  });

  it('rejects invalid selection before reading samples', () => {
    expect(() =>
      calculator.calculate(
        { ...selection, entryLabel: 'T+5s', exitLabel: 'T+0' },
        [],
      ),
    ).toThrow('Listing round trip checkpoint selection is invalid');
  });

  it('rejects duplicate or invalid sample identities', () => {
    expect(() =>
      calculator.calculate(selection, [
        sample('SAMEUSDT', null),
        sample('SAMEUSDT', null),
      ]),
    ).toThrow('Listing round trip cohort symbols must be unique');
    expect(() =>
      calculator.calculate(selection, [sample('bad', null)]),
    ).toThrow('Listing round trip cohort identity is invalid');
  });

  it('rejects a round trip from another sample or configuration', () => {
    expect(() =>
      calculator.calculate(selection, [
        sample('OTHERUSDT', roundTrip('SOURCEUSDT', '100', '120')),
      ]),
    ).toThrow('Listing round trip cohort configuration is inconsistent');
    expect(() =>
      calculator.calculate(selection, [
        sample('GAINUSDT', {
          ...roundTrip('GAINUSDT', '100', '120'),
          configuration: { feeRate: '0.001', slippageRate: '0' },
        }),
      ]),
    ).toThrow('Listing round trip cohort configuration is inconsistent');
  });

  it('rejects inconsistent calculated values and profitability', () => {
    const result = roundTrip('GAINUSDT', '100', '120');
    expect(() =>
      calculator.calculate(selection, [
        sample('GAINUSDT', { ...result, netReturnRate: '0.1' }),
      ]),
    ).toThrow('Listing round trip cohort values are inconsistent');
    expect(() =>
      calculator.calculate(selection, [
        sample('GAINUSDT', { ...result, profitableAfterCosts: false }),
      ]),
    ).toThrow('Listing round trip cohort values are inconsistent');
  });
});

function sample(
  symbol: string,
  roundTripValue: ListingCheckpointRoundTrip | null,
) {
  return { provider: 'binance' as const, symbol, roundTrip: roundTripValue };
}

function roundTrip(
  symbol: string,
  entryAsk: string,
  exitBid: string,
): ListingCheckpointRoundTrip {
  const calculator = new ListingCheckpointRoundTripCalculator();
  return calculator.calculate(
    book(symbol, 'T+0', 0, '99', entryAsk),
    book(symbol, 'T+5s', 5_000, exitBid, '121'),
    selection,
  );
}

function book(
  symbol: string,
  label: 'T+0' | 'T+5s',
  offsetMs: number,
  bidPrice: string,
  askPrice: string,
) {
  return {
    provider: 'binance' as const,
    symbol,
    label,
    offsetMs,
    targetAt: new Date(1_789_352_400_000 + offsetMs),
    updateId: '42',
    bidPrice,
    bidQuantity: '1',
    askPrice,
    askQuantity: '1',
    receivedAt: new Date(1_789_352_401_000 + offsetMs),
  };
}
