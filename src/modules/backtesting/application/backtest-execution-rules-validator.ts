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
    const tickSize = this.positive(rules.tickSize, 'tickSize');
    const minPrice = this.positive(rules.minPrice, 'minPrice');
    const maxPrice = this.positive(rules.maxPrice, 'maxPrice');
    const quantity = this.positive(quantityValue, 'quantity');

    if (maxQuantity.lessThan(minQuantity)) {
      throw new Error('Invalid backtest quantity range');
    }
    if (maxPrice.lessThan(minPrice)) {
      throw new Error('Invalid backtest price range');
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
      tickSize: tickSize.toFixed(),
      minPrice: minPrice.toFixed(),
      maxPrice: maxPrice.toFixed(),
    };
  }

  isPriceWithinRange(
    price: string,
    minPrice: string,
    maxPrice: string,
  ): boolean {
    const value = new RulesDecimal(price);
    return (
      value.greaterThanOrEqualTo(minPrice) && value.lessThanOrEqualTo(maxPrice)
    );
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
