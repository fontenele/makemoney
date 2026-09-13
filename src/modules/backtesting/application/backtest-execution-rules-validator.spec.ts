import { BacktestExecutionRulesValidator } from './backtest-execution-rules-validator';

describe('BacktestExecutionRulesValidator', () => {
  const validator = new BacktestExecutionRulesValidator();
  const rules = {
    minQuantity: '0.001',
    maxQuantity: '10',
    stepSize: '0.001',
    minNotional: '5',
    tickSize: '0.01',
  };

  it('normalizes valid rules and an aligned quantity', () => {
    expect(validator.validate(rules, '0.010')).toEqual({
      minQuantity: '0.001',
      maxQuantity: '10',
      stepSize: '0.001',
      minNotional: '5',
      tickSize: '0.01',
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
});
