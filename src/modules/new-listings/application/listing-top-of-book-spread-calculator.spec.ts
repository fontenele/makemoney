import { ListingTopOfBookObservation } from '../domain/listing-top-of-book-observation';
import { ListingTopOfBookSpreadCalculator } from './listing-top-of-book-spread-calculator';

describe('ListingTopOfBookSpreadCalculator', () => {
  const calculator = new ListingTopOfBookSpreadCalculator();

  it('calculates spread, midpoint, and basis points with exact decimals', () => {
    expect(calculator.calculate(observation('99', '101'))).toEqual({
      provider: 'binance',
      symbol: 'NEWUSDT',
      updateId: '123',
      bidPrice: '99',
      bidQuantity: '1.25',
      askPrice: '101',
      askQuantity: '0.75',
      absoluteSpread: '2',
      midPrice: '100',
      spreadBasisPoints: '200',
      receivedAt: new Date('2026-09-20T03:00:00.000Z'),
    });
  });

  it('avoids native floating-point arithmetic', () => {
    expect(calculator.calculate(observation('0.1', '0.3'))).toMatchObject({
      absoluteSpread: '0.2',
      midPrice: '0.2',
      spreadBasisPoints: '10000',
    });
  });

  it('returns zero spread for a locked positive book', () => {
    expect(calculator.calculate(observation('100', '100'))).toMatchObject({
      absoluteSpread: '0',
      midPrice: '100',
      spreadBasisPoints: '0',
    });
  });

  it('rejects invalid observations before calculation', () => {
    expect(() => calculator.calculate(observation('101', '100'))).toThrow(
      'must not be crossed',
    );
  });
});

function observation(
  bidPrice: string,
  askPrice: string,
): ListingTopOfBookObservation {
  return {
    provider: 'binance',
    symbol: 'NEWUSDT',
    updateId: '123',
    bidPrice,
    bidQuantity: '1.250',
    askPrice,
    askQuantity: '0.750',
    receivedAt: new Date('2026-09-20T03:00:00.000Z'),
  };
}
