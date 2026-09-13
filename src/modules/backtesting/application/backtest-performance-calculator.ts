import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { BacktestPerformance } from '../domain/backtest-performance';
import {
  BacktestClosedTrade,
  BacktestFill,
} from '../domain/backtest-simulation';
import { BacktestEndingValuation } from '../domain/backtest-valuation';
import { BacktestRealizedDrawdownCalculator } from './backtest-realized-drawdown-calculator';

const PerformanceDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});

@Injectable()
export class BacktestPerformanceCalculator {
  constructor(
    private readonly drawdownCalculator: BacktestRealizedDrawdownCalculator,
  ) {}

  calculate(
    fills: readonly BacktestFill[],
    closedTrades: readonly BacktestClosedTrade[],
    endingValuation: BacktestEndingValuation | null = null,
  ): BacktestPerformance {
    let profitableTradeCount = 0;
    let losingTradeCount = 0;
    let breakEvenTradeCount = 0;
    let grossProfit = new PerformanceDecimal(0);
    let grossLoss = new PerformanceDecimal(0);
    let realizedNetPnl = new PerformanceDecimal(0);

    for (const trade of closedTrades) {
      const netPnl = new PerformanceDecimal(trade.netPnl);
      realizedNetPnl = realizedNetPnl.plus(netPnl);
      if (netPnl.greaterThan(0)) {
        profitableTradeCount += 1;
        grossProfit = grossProfit.plus(netPnl);
      } else if (netPnl.lessThan(0)) {
        losingTradeCount += 1;
        grossLoss = grossLoss.plus(netPnl.abs());
      } else {
        breakEvenTradeCount += 1;
      }
    }

    const closedTradeCount = closedTrades.length;
    const totalFees = fills.reduce(
      (total, fill) => total.plus(fill.fee),
      new PerformanceDecimal(0),
    );
    const averageNetPnlPerClosedTrade =
      closedTradeCount === 0
        ? null
        : realizedNetPnl.dividedBy(closedTradeCount).toFixed();
    const realizedDrawdown = this.drawdownCalculator.calculate(closedTrades);

    return {
      fillCount: fills.length,
      closedTradeCount,
      profitableTradeCount,
      losingTradeCount,
      breakEvenTradeCount,
      winRate:
        closedTradeCount === 0
          ? null
          : new PerformanceDecimal(profitableTradeCount)
              .dividedBy(closedTradeCount)
              .toFixed(),
      grossProfit: grossProfit.toFixed(),
      grossLoss: grossLoss.toFixed(),
      realizedNetPnl: realizedNetPnl.toFixed(),
      averageNetPnlPerClosedTrade,
      averageProfitableTradeNetPnl:
        profitableTradeCount === 0
          ? null
          : grossProfit.dividedBy(profitableTradeCount).toFixed(),
      averageLosingTradeNetPnl:
        losingTradeCount === 0
          ? null
          : grossLoss.dividedBy(losingTradeCount).toFixed(),
      expectancy: averageNetPnlPerClosedTrade,
      profitFactor: grossLoss.isZero()
        ? null
        : grossProfit.dividedBy(grossLoss).toFixed(),
      realizedPnlCurve: realizedDrawdown.curve,
      maximumRealizedDrawdown: realizedDrawdown.maximumDrawdown,
      unrealizedNetPnl: endingValuation?.unrealizedNetPnl ?? null,
      totalNetPnl: realizedNetPnl
        .plus(endingValuation?.unrealizedNetPnl ?? 0)
        .toFixed(),
      totalFees: totalFees.toFixed(),
    };
  }
}
