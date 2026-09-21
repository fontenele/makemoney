import { ListingCheckpointRoundTrip } from '../domain/listing-checkpoint-round-trip';
import { ListingCheckpointRoundTripCalculator } from './listing-checkpoint-round-trip-calculator';
import { ListingCheckpointRoundTripOutcomeCohortCalculator } from './listing-checkpoint-round-trip-outcome-cohort-calculator';

const selection = {
  entryLabel: 'T+0' as const,
  exitLabel: 'T+5s' as const,
  feeRate: '0',
  slippageRate: '0',
};

describe('ListingCheckpointRoundTripOutcomeCohortCalculator', () => {
  const calculator = new ListingCheckpointRoundTripOutcomeCohortCalculator();

  it('separates exact profitable, losing, break-even, and unavailable outcomes', () => {
    expect(
      calculator.calculate(selection, [
        sample('GAINONEUSDT', roundTrip('GAINONEUSDT', '100', '120')),
        sample('GAINTWOUSDT', roundTrip('GAINTWOUSDT', '100', '110')),
        sample('LOSSONEUSDT', roundTrip('LOSSONEUSDT', '100', '80')),
        sample('LOSSTWOUSDT', roundTrip('LOSSTWOUSDT', '100', '90')),
        sample('FLATUSDT', roundTrip('FLATUSDT', '100', '100')),
        sample('MISSINGUSDT', null),
      ]),
    ).toEqual({
      provider: 'binance',
      selection,
      sampleSize: 6,
      availableSampleSize: 5,
      unavailableSampleSize: 1,
      profitableAfterCostsCount: 2,
      losingAfterCostsCount: 2,
      breakEvenAfterCostsCount: 1,
      averageProfitableNetReturnRate: '0.15',
      averageLosingNetReturnRate: '-0.15',
    });
  });

  it('preserves nullable conditional averages for empty outcome classes', () => {
    expect(calculator.calculate(selection, [])).toMatchObject({
      provider: null,
      sampleSize: 0,
      averageProfitableNetReturnRate: null,
      averageLosingNetReturnRate: null,
    });
    expect(
      calculator.calculate(selection, [
        sample('FLATUSDT', roundTrip('FLATUSDT', '100', '100')),
      ]),
    ).toMatchObject({
      availableSampleSize: 1,
      profitableAfterCostsCount: 0,
      losingAfterCostsCount: 0,
      breakEvenAfterCostsCount: 1,
      averageProfitableNetReturnRate: null,
      averageLosingNetReturnRate: null,
    });
  });

  it('inherits strict fixed-configuration validation', () => {
    expect(() =>
      calculator.calculate(selection, [
        sample('GAINUSDT', {
          ...roundTrip('GAINUSDT', '100', '120'),
          netReturnRate: '0.1',
        }),
      ]),
    ).toThrow('Listing round trip cohort values are inconsistent');
  });

  it('rejects duplicate identities through the shared cohort boundary', () => {
    expect(() =>
      calculator.calculate(selection, [
        sample('SAMEUSDT', null),
        sample('SAMEUSDT', null),
      ]),
    ).toThrow('Listing round trip cohort symbols must be unique');
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
  return new ListingCheckpointRoundTripCalculator().calculate(
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
