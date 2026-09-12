import Decimal from 'decimal.js';
import { CostBasedPaperPosition } from './paper-position-valuation';
import { PaperExecution } from '../domain/trading-executor';

const PositionDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});
const SCALE = 18;

export class InconsistentPaperExecutionHistoryError extends Error {
  constructor(readonly executionId: string) {
    super(
      `Paper execution history sells more BTC than the tracked position at ${executionId}`,
    );
    this.name = InconsistentPaperExecutionHistoryError.name;
  }
}

export interface PaperExecutionAccounting {
  position: CostBasedPaperPosition;
  sellPnls: string[];
}

export function calculatePaperPosition(
  executions: readonly PaperExecution[],
): CostBasedPaperPosition {
  return calculatePaperExecutionAccounting(executions).position;
}

export function calculateDailyRealizedPnl(
  executions: readonly PaperExecution[],
  now: Date,
): string {
  const accounting = calculatePaperExecutionAccounting(executions);
  const dayStart = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  const sells = executions.filter((execution) => execution.side === 'sell');

  return sells
    .reduce((total, execution, index) => {
      const executedAt = execution.executedAt.getTime();
      return executedAt >= dayStart && executedAt < dayEnd
        ? rounded(total.plus(accounting.sellPnls[index] ?? '0'))
        : total;
    }, new PositionDecimal(0))
    .toFixed();
}

export function calculatePaperExecutionAccounting(
  executions: readonly PaperExecution[],
): PaperExecutionAccounting {
  let quantity = new PositionDecimal(0);
  let costBasis = new PositionDecimal(0);
  let realizedPnl = new PositionDecimal(0);
  let totalFees = new PositionDecimal(0);
  const sellPnls: string[] = [];

  for (const execution of executions) {
    const executionQuantity = new PositionDecimal(execution.quantity);
    const fee = new PositionDecimal(execution.fee);
    totalFees = rounded(totalFees.plus(fee));

    if (execution.side === 'buy') {
      quantity = rounded(quantity.plus(executionQuantity));
      costBasis = rounded(costBasis.plus(execution.totalCost));
      continue;
    }

    if (executionQuantity.greaterThan(quantity)) {
      throw new InconsistentPaperExecutionHistoryError(execution.id);
    }
    const allocatedCost = rounded(
      costBasis.times(executionQuantity).dividedBy(quantity),
    );
    const sellPnl = rounded(
      new PositionDecimal(execution.netProceeds).minus(allocatedCost),
    );
    realizedPnl = rounded(realizedPnl.plus(sellPnl));
    sellPnls.push(sellPnl.toFixed());
    quantity = rounded(quantity.minus(executionQuantity));
    costBasis = quantity.isZero()
      ? new PositionDecimal(0)
      : rounded(costBasis.minus(allocatedCost));
  }

  return {
    position: {
      symbol: 'BTC/USDT',
      quantity: quantity.toFixed(),
      costBasis: costBasis.toFixed(),
      averageEntryPrice: quantity.isZero()
        ? null
        : rounded(costBasis.dividedBy(quantity)).toFixed(),
      realizedPnl: realizedPnl.toFixed(),
      totalFees: totalFees.toFixed(),
    },
    sellPnls,
  };
}

function rounded(value: Decimal): Decimal {
  return value.toDecimalPlaces(SCALE, Decimal.ROUND_HALF_EVEN);
}
