import { BacktestFillPriceCalculator } from './backtest-fill-price-calculator';

describe('BacktestFillPriceCalculator', () => {
  const calculator = new BacktestFillPriceCalculator();

  it('rounds an impacted buy upward to the next tick', () => {
    expect(calculator.calculate('buy', '100', '0.00123', '0.05')).toEqual({
      referencePrice: '100',
      adjustedPrice: '100.123',
      executablePrice: '100.15',
    });
  });

  it('rounds an impacted sell downward to the prior tick', () => {
    expect(calculator.calculate('sell', '100', '0.00123', '0.05')).toEqual({
      referencePrice: '100',
      adjustedPrice: '99.877',
      executablePrice: '99.85',
    });
  });

  it('preserves an already aligned price', () => {
    expect(calculator.calculate('buy', '100', '0.001', '0.1')).toEqual({
      referencePrice: '100',
      adjustedPrice: '100.1',
      executablePrice: '100.1',
    });
  });

  it('returns no executable sell price when flooring reaches zero', () => {
    expect(calculator.calculate('sell', '0.01', '0.5', '0.01')).toMatchObject({
      adjustedPrice: '0.005',
      executablePrice: null,
    });
  });

  it('preserves arbitrary precision while quantizing', () => {
    expect(
      calculator.calculate(
        'buy',
        '1.1234567890123456789',
        '0.0000000000000000001',
        '0.0000000000000000001',
      ),
    ).toEqual({
      referencePrice: '1.1234567890123456789',
      adjustedPrice: '1.12345678901234567901234567890123456789',
      executablePrice: '1.1234567890123456791',
    });
  });
});
