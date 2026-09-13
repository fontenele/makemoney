import { BacktestExecutionRulesValidator } from './backtest-execution-rules-validator';

describe('BacktestExecutionRulesValidator', () => {
  const validator = new BacktestExecutionRulesValidator();
  const rules = {
    minQuantity: '0.001',
    maxQuantity: '10',
    stepSize: '0.001',
    minNotional: '5',
    tickSize: '0.01',
    minPrice: '0.01',
    maxPrice: '1000000',
  };

  it('normalizes valid rules and an aligned quantity', () => {
    expect(validator.validate(rules, '0.010')).toEqual({
      minQuantity: '0.001',
      maxQuantity: '10',
      stepSize: '0.001',
      minNotional: '5',
      tickSize: '0.01',
      minPrice: '0.01',
      maxPrice: '1000000',
    });
  });

  it.each(['0.0009', '10.001'])(
    'rejects quantity outside the configured range',
    (quantity) => {
      expect(() => validator.validate(rules, quantity)).toThrow(
        'Backtest quantity is outside execution limits',
      );
    },
  );

  it('rejects quantity not aligned to the step size exactly', () => {
    expect(() => validator.validate(rules, '0.0015')).toThrow(
      'Backtest quantity is not aligned to stepSize',
    );
  });

  it.each([
    { ...rules, minQuantity: '0' },
    { ...rules, maxQuantity: '0.0001' },
    { ...rules, stepSize: '-0.001' },
    { ...rules, minNotional: 'not-a-decimal' },
    { ...rules, tickSize: '0' },
    { ...rules, minPrice: '0' },
    { ...rules, maxPrice: '0.001' },
  ])('rejects invalid or incoherent execution rules', (invalidRules) => {
    expect(() => validator.validate(invalidRules, '0.01')).toThrow();
  });

  it('compares notionals with arbitrary decimal precision', () => {
    expect(
      validator.meetsMinimumNotional(
        '5.000000000000000000000000000000000000001',
        '5.000000000000000000000000000000000000001',
      ),
    ).toBe(true);
    expect(
      validator.meetsMinimumNotional(
        '5.0000000000000000000000000000000000000001',
        '5.000000000000000000000000000000000000001',
      ),
    ).toBe(false);
  });

  it('treats both price boundaries as inclusive', () => {
    expect(validator.isPriceWithinRange('0.01', '0.01', '100')).toBe(true);
    expect(validator.isPriceWithinRange('100', '0.01', '100')).toBe(true);
    expect(validator.isPriceWithinRange('0.009', '0.01', '100')).toBe(false);
    expect(validator.isPriceWithinRange('100.001', '0.01', '100')).toBe(false);
  });
});
