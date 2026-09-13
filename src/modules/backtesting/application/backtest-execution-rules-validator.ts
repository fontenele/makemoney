import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { BacktestExecutionRules } from '../domain/backtest-execution-rules';

const RulesDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});
const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

@Injectable()
export class BacktestExecutionRulesValidator {
  validate(
    rules: BacktestExecutionRules,
    quantityValue: string,
  ): BacktestExecutionRules {
    const minQuantity = this.positive(rules.minQuantity, 'minQuantity');
    const maxQuantity = this.positive(rules.maxQuantity, 'maxQuantity');
    const stepSize = this.positive(rules.stepSize, 'stepSize');
    const minNotional = this.positive(rules.minNotional, 'minNotional');
    const quantity = this.positive(quantityValue, 'quantity');

    if (maxQuantity.lessThan(minQuantity)) {
      throw new Error('Invalid backtest quantity range');
    }
    if (quantity.lessThan(minQuantity) || quantity.greaterThan(maxQuantity)) {
      throw new Error('Backtest quantity is outside execution limits');
    }
    if (!quantity.modulo(stepSize).isZero()) {
      throw new Error('Backtest quantity is not aligned to stepSize');
    }

    return {
      minQuantity: minQuantity.toFixed(),
      maxQuantity: maxQuantity.toFixed(),
      stepSize: stepSize.toFixed(),
      minNotional: minNotional.toFixed(),
    };
  }

  meetsMinimumNotional(notional: string, minNotional: string): boolean {
    return new RulesDecimal(notional).greaterThanOrEqualTo(minNotional);
  }

  private positive(value: string, name: string): Decimal {
    if (!DECIMAL_PATTERN.test(value)) {
      throw new Error(`Invalid backtest execution rule ${name}`);
    }
    const decimal = new RulesDecimal(value);
    if (!decimal.greaterThan(0)) {
      throw new Error(`Invalid backtest execution rule ${name}`);
    }
    return decimal;
  }
}
