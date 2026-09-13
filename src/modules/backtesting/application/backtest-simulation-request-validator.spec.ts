import { BacktestExecutionRulesValidator } from './backtest-execution-rules-validator';
import { BacktestSimulationRequestValidator } from './backtest-simulation-request-validator';

describe('BacktestSimulationRequestValidator', () => {
  const validator = new BacktestSimulationRequestValidator(
    new BacktestExecutionRulesValidator(),
  );

  it('returns a normalized complete explicit configuration', () => {
    expect(validator.validate(configuration())).toEqual(configuration());
  });

  it.each([
    { quantity: '0' },
    { feeRate: '1' },
    { spreadRate: '0.5', slippageRate: '0.75' },
    { maximumVolumeParticipationRate: '1.1' },
    { initialCapitalUsdt: '-1' },
    { initialCapitalUsdt: '1'.repeat(101) },
    { extra: 'field' },
    { executionRules: { ...rules(), extra: 'field' } },
    { executionRules: { ...rules(), stepSize: '0.00003' } },
  ])('rejects invalid configuration %#', (change) => {
    const value = {
      ...configuration(),
      ...change,
    };
    expect(() => validator.validate(value)).toThrow();
  });
});

function configuration() {
  return {
    quantity: '0.001',
    feeRate: '0.001',
    spreadRate: '0.0002',
    slippageRate: '0.0001',
    maximumVolumeParticipationRate: '0.1',
    initialCapitalUsdt: '1000',
    executionRules: rules(),
  };
}

function rules() {
  return {
    minQuantity: '0.00001',
    maxQuantity: '1000',
    stepSize: '0.00001',
    minNotional: '5',
    tickSize: '0.01',
    minPrice: '0.01',
    maxPrice: '1000000',
  };
}
