import { ListingTopOfBookObservation } from '../domain/listing-top-of-book-observation';
import { ListingTopOfBookImbalanceCalculator } from './listing-top-of-book-imbalance-calculator';

describe('ListingTopOfBookImbalanceCalculator', () => {
  const calculator = new ListingTopOfBookImbalanceCalculator();

  it('calculates exact displayed quote notionals and normalized imbalance', () => {
    expect(
      calculator.calculate(
        book({
          bidPrice: '99',
          bidQuantity: '2',
          askPrice: '101',
          askQuantity: '1',
        }),
      ),
    ).toMatchObject({
      bidQuoteNotional: '198',
      askQuoteNotional: '101',
      imbalanceRate: '0.3244147157190635451505016722408026755853',
    });
  });

  it.each([
    ['2', '0', '1'],
    ['0', '2', '-1'],
  ])(
    'preserves the exact boundary when only one displayed side has quantity',
    (bidQuantity, askQuantity, imbalanceRate) => {
      expect(
        calculator.calculate(book({ bidQuantity, askQuantity })),
      ).toMatchObject({ imbalanceRate });
    },
  );

  it('reports imbalance unavailable when both displayed quantities are zero', () => {
    expect(
      calculator.calculate(book({ bidQuantity: '0', askQuantity: '0' })),
    ).toMatchObject({
      bidQuoteNotional: '0',
      askQuoteNotional: '0',
      imbalanceRate: null,
    });
  });

  it('rejects an invalid top-of-book observation', () => {
    expect(() => calculator.calculate(book({ askPrice: '98' }))).toThrow(
      'must not be crossed',
    );
  });
});

function book(
  overrides: Partial<ListingTopOfBookObservation> = {},
): ListingTopOfBookObservation {
  return {
    provider: 'binance',
    symbol: 'NEWUSDT',
    updateId: '42',
    bidPrice: '99',
    bidQuantity: '1',
    askPrice: '101',
    askQuantity: '1',
    receivedAt: new Date('2026-09-20T12:00:00.000Z'),
    ...overrides,
  };
}
