import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { BacktestFillPrice } from '../domain/backtest-fill-price';

const PriceDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});

@Injectable()
export class BacktestFillPriceCalculator {
  calculate(
    side: 'buy' | 'sell',
    referencePriceValue: string,
    adversePriceImpactRateValue: string,
    tickSizeValue: string,
  ): BacktestFillPrice {
    const referencePrice = new PriceDecimal(referencePriceValue);
    const adversePriceImpactRate = new PriceDecimal(
      adversePriceImpactRateValue,
    );
    const tickSize = new PriceDecimal(tickSizeValue);
    const adjustedPrice = referencePrice.times(
      side === 'buy'
        ? new PriceDecimal(1).plus(adversePriceImpactRate)
        : new PriceDecimal(1).minus(adversePriceImpactRate),
    );
    const tickCount = adjustedPrice.dividedBy(tickSize);
    const executablePrice = tickCount
      .toDecimalPlaces(
        0,
        side === 'buy' ? Decimal.ROUND_CEIL : Decimal.ROUND_FLOOR,
      )
      .times(tickSize);

    return {
      referencePrice: referencePrice.toFixed(),
      adjustedPrice: adjustedPrice.toFixed(),
      executablePrice: executablePrice.greaterThan(0)
        ? executablePrice.toFixed()
        : null,
    };
  }
}
