import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { BacktestSimulationConfiguration } from '../domain/backtest-simulation';
import { BacktestExecutionRules } from '../domain/backtest-execution-rules';
import { BacktestExecutionRulesValidator } from './backtest-execution-rules-validator';

const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const CONFIGURATION_FIELDS = [
  'quantity',
  'feeRate',
  'spreadRate',
  'slippageRate',
  'maximumVolumeParticipationRate',
  'initialCapitalUsdt',
  'executionRules',
] as const;
const EXECUTION_RULE_FIELDS = [
  'minQuantity',
  'maxQuantity',
  'stepSize',
  'minNotional',
  'tickSize',
  'minPrice',
  'maxPrice',
] as const;

@Injectable()
export class BacktestSimulationRequestValidator {
  constructor(
    private readonly executionRulesValidator: BacktestExecutionRulesValidator,
  ) {}

  validate(value: unknown): BacktestSimulationConfiguration {
    const configuration = exactObject(value, CONFIGURATION_FIELDS);
    const quantity = positive(configuration.quantity, 'quantity');
    const feeRate = rate(configuration.feeRate, 'feeRate');
    const spreadRate = rate(configuration.spreadRate, 'spreadRate');
    const slippageRate = rate(configuration.slippageRate, 'slippageRate');
    const participationRate = positive(
      configuration.maximumVolumeParticipationRate,
      'maximumVolumeParticipationRate',
    );
    if (participationRate.greaterThan(1)) {
      throw new Error('Invalid backtest maximumVolumeParticipationRate');
    }
    if (spreadRate.dividedBy(2).plus(slippageRate).greaterThanOrEqualTo(1)) {
      throw new Error('Invalid backtest combined price impact');
    }
    const initialCapital = positive(
      configuration.initialCapitalUsdt,
      'initialCapitalUsdt',
    );
    const rules = exactObject(
      configuration.executionRules,
      EXECUTION_RULE_FIELDS,
    ) as unknown as BacktestExecutionRules;

    return {
      quantity: quantity.toFixed(),
      feeRate: feeRate.toFixed(),
      spreadRate: spreadRate.toFixed(),
      slippageRate: slippageRate.toFixed(),
      maximumVolumeParticipationRate: participationRate.toFixed(),
      initialCapitalUsdt: initialCapital.toFixed(),
      executionRules: this.executionRulesValidator.validate(
        rules,
        quantity.toFixed(),
      ),
    };
  }
}

function exactObject(
  value: unknown,
  fields: readonly string[],
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid backtest simulation configuration');
  }
  const candidate = value as Record<string, unknown>;
  const keys = Object.keys(candidate);
  if (
    keys.length !== fields.length ||
    keys.some((key) => !fields.includes(key))
  ) {
    throw new Error('Invalid backtest simulation configuration');
  }
  return candidate;
}

function positive(value: unknown, field: string): Decimal {
  const decimal = decimalValue(value, field);
  if (!decimal.greaterThan(0)) throw new Error(`Invalid backtest ${field}`);
  return decimal;
}

function rate(value: unknown, field: string): Decimal {
  const decimal = decimalValue(value, field);
  if (decimal.greaterThanOrEqualTo(1)) {
    throw new Error(`Invalid backtest ${field}`);
  }
  return decimal;
}

function decimalValue(value: unknown, field: string): Decimal {
  if (
    typeof value !== 'string' ||
    value.length > 100 ||
    !DECIMAL_PATTERN.test(value)
  ) {
    throw new Error(`Invalid backtest ${field}`);
  }
  return new Decimal(value);
}
