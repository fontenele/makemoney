import {
  ListingTopOfBookObservation,
  validateListingTopOfBookObservation,
} from './listing-top-of-book-observation';

describe('validateListingTopOfBookObservation', () => {
  it('accepts a locked book, zero quantities, and exact decimal values', () => {
    expect(() =>
      validateListingTopOfBookObservation(
        observation({
          bidPrice: '0.00000001',
          askPrice: '0.000000010',
          bidQuantity: '0',
          askQuantity: '0.00000000',
        }),
      ),
    ).not.toThrow();
  });

  it.each([
    [{ provider: 'other' }, 'provider is unsupported'],
    [{ symbol: 'newusdt' }, 'symbol must be canonical'],
    [{ updateId: '-1' }, 'update ID must be a non-negative integer'],
    [{ updateId: '1.5' }, 'update ID must be a non-negative integer'],
    [{ bidPrice: '0' }, 'bid price must be positive'],
    [{ askPrice: '-1' }, 'ask price must be positive'],
    [{ bidQuantity: '-1' }, 'bid quantity must be non-negative'],
    [{ askQuantity: 'NaN' }, 'ask quantity must be non-negative'],
    [{ bidPrice: '10.01', askPrice: '10' }, 'must not be crossed'],
    [{ receivedAt: new Date('invalid') }, 'received time must be valid'],
  ])('rejects invalid top-of-book input %#', (override, message) => {
    expect(() =>
      validateListingTopOfBookObservation(
        observation(override as Partial<ListingTopOfBookObservation>),
      ),
    ).toThrow(message);
  });
});

function observation(
  override: Partial<ListingTopOfBookObservation> = {},
): ListingTopOfBookObservation {
  return {
    provider: 'binance',
    symbol: 'NEWUSDT',
    updateId: '123456789',
    bidPrice: '9.99',
    bidQuantity: '1000.5',
    askPrice: '10.01',
    askQuantity: '900.25',
    receivedAt: new Date('2026-09-20T03:00:00.000Z'),
    ...override,
  };
}
