import Decimal from 'decimal.js';
import { PaperTradingPerformance } from '../domain/paper-trading-performance';
import { PaperExecution } from '../domain/trading-executor';
import { calculatePaperExecutionAccounting } from './paper-position-calculator';

const PerformanceDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});
const RATE_SCALE = 8;

export function calculatePaperTradingPerformance(
  executions: readonly PaperExecution[],
): PaperTradingPerformance {
  const accounting = calculatePaperExecutionAccounting(executions);
  const buyExecutionCount = executions.filter(
    (execution) => execution.side === 'buy',
  ).length;
  let profitableSellCount = 0;
  let losingSellCount = 0;
  let breakEvenSellCount = 0;

  for (const pnl of accounting.sellPnls) {
    const value = new PerformanceDecimal(pnl);
    if (value.isZero()) breakEvenSellCount += 1;
    else if (value.isPositive()) profitableSellCount += 1;
    else if (value.isNegative()) losingSellCount += 1;
  }

  const decidedSellCount = profitableSellCount + losingSellCount;

  return {
    symbol: 'BTC/USDT',
    executionCount: executions.length,
    buyExecutionCount,
    sellExecutionCount: accounting.sellPnls.length,
    profitableSellCount,
    losingSellCount,
    breakEvenSellCount,
    winRate:
      decidedSellCount === 0
        ? null
        : new PerformanceDecimal(profitableSellCount)
            .dividedBy(decidedSellCount)
            .toDecimalPlaces(RATE_SCALE, Decimal.ROUND_HALF_EVEN)
            .toFixed(),
    realizedPnl: accounting.position.realizedPnl,
    totalFees: accounting.position.totalFees,
  };
}
