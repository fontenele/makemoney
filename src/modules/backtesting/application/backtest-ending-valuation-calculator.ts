import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { BacktestOpenPosition } from '../domain/backtest-simulation';
import { BacktestEndingValuation } from '../domain/backtest-valuation';
import { HistoricalCandle } from '../domain/historical-candle';

const ValuationDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});

@Injectable()
export class BacktestEndingValuationCalculator {
  calculate(
    position: BacktestOpenPosition | null,
    finalCandle: HistoricalCandle | undefined,
    feeRate: string,
  ): BacktestEndingValuation | null {
    if (!position) return null;
    if (!finalCandle) {
      throw new Error('An open backtest position requires a final candle');
    }

    const markPrice = new ValuationDecimal(finalCandle.closePrice);
    const grossMarketValue = markPrice.times(position.quantity);
    const estimatedExitFee = grossMarketValue.times(feeRate);
    const netLiquidationValue = grossMarketValue.minus(estimatedExitFee);

    return {
      markedAt: finalCandle.closeTime,
      markPrice: markPrice.toFixed(),
      grossMarketValue: grossMarketValue.toFixed(),
      estimatedExitFee: estimatedExitFee.toFixed(),
      netLiquidationValue: netLiquidationValue.toFixed(),
      unrealizedNetPnl: netLiquidationValue.minus(position.costBasis).toFixed(),
    };
  }
}
