import { MarketTopOfBook } from '../domain/market-top-of-book';
import { SpreadCalculator } from './spread-calculator';

const createTopOfBook = (
  bidPrice: string,
  askPrice: string,
): MarketTopOfBook => ({
  provider: 'binance',
  symbol: 'BTC/USDT',
  updateId: '123',
  bidPrice,
  bidQuantity: '1.25',
  askPrice,
  askQuantity: '0.75',
  receivedAt: new Date('2026-09-11T12:00:00.000Z'),
});

describe('SpreadCalculator', () => {
  const calculator = new SpreadCalculator();

  it('calculates the absolute spread, midpoint, and basis points', () => {
    expect(calculator.calculate(createTopOfBook('99', '101'))).toEqual({
      provider: 'binance',
      symbol: 'BTC/USDT',
      updateId: '123',
      bidPrice: '99',
      askPrice: '101',
      absoluteSpread: '2',
      midPrice: '100',
      spreadBasisPoints: '200.00000000',
      receivedAt: new Date('2026-09-11T12:00:00.000Z'),
    });
  });

  it('uses decimal arithmetic rather than native floating-point arithmetic', () => {
    const spread = calculator.calculate(createTopOfBook('0.1', '0.3'));

    expect(spread).toMatchObject({
      absoluteSpread: '0.2',
      midPrice: '0.2',
      spreadBasisPoints: '10000.00000000',
    });
  });

  it('returns a zero spread for a locked positive book', () => {
    const spread = calculator.calculate(createTopOfBook('100', '100'));

    expect(spread).toMatchObject({
      absoluteSpread: '0',
      midPrice: '100',
      spreadBasisPoints: '0.00000000',
    });
  });

  it('rejects a crossed book', () => {
    expect(calculator.calculate(createTopOfBook('101', '100'))).toBeNull();
  });

  it('rejects a zero midpoint', () => {
    expect(calculator.calculate(createTopOfBook('0', '0'))).toBeNull();
  });
});
