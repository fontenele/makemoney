import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { BacktestRealizedDrawdownResult } from '../domain/backtest-drawdown';
import { BacktestClosedTrade } from '../domain/backtest-simulation';

const DrawdownDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});

@Injectable()
export class BacktestRealizedDrawdownCalculator {
  calculate(
    closedTrades: readonly BacktestClosedTrade[],
  ): BacktestRealizedDrawdownResult {
    let cumulative = new DrawdownDecimal(0);
    let peak = new DrawdownDecimal(0);
    let currentDrawdownStartedAt: Date | null = null;
    let maximumAmount = new DrawdownDecimal(0);
    let maximumStartedAt: Date | null = null;
    let maximumTroughAt: Date | null = null;
    let maximumRecoveredAt: Date | null = null;

    const curve = closedTrades.map((trade) => {
      cumulative = cumulative.plus(trade.netPnl);
      const exitedAt = trade.exit.filledAt;

      if (cumulative.greaterThanOrEqualTo(peak)) {
        if (
          currentDrawdownStartedAt &&
          maximumStartedAt === currentDrawdownStartedAt &&
          maximumRecoveredAt === null
        ) {
          maximumRecoveredAt = exitedAt;
        }
        peak = cumulative;
        currentDrawdownStartedAt = null;
      } else if (!currentDrawdownStartedAt) {
        currentDrawdownStartedAt = exitedAt;
      }

      const drawdown = peak.minus(cumulative);
      if (drawdown.greaterThan(maximumAmount)) {
        maximumAmount = drawdown;
        maximumStartedAt = currentDrawdownStartedAt;
        maximumTroughAt = exitedAt;
        maximumRecoveredAt = null;
      }

      return {
        exitedAt,
        tradeNetPnl: new DrawdownDecimal(trade.netPnl).toFixed(),
        cumulativeRealizedNetPnl: cumulative.toFixed(),
        peakRealizedNetPnl: peak.toFixed(),
        drawdown: drawdown.toFixed(),
      };
    });

    return {
      curve,
      maximumDrawdown: {
        amount: maximumAmount.toFixed(),
        startedAt: maximumStartedAt,
        troughAt: maximumTroughAt,
        recoveredAt: maximumRecoveredAt,
      },
    };
  }
}
