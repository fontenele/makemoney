import Decimal from 'decimal.js';
import { PaperPosition } from '../domain/paper-position';
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

export function calculatePaperPosition(
  executions: readonly PaperExecution[],
): PaperPosition {
  let quantity = new PositionDecimal(0);
  let costBasis = new PositionDecimal(0);
  let realizedPnl = new PositionDecimal(0);
  let totalFees = new PositionDecimal(0);

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
    realizedPnl = rounded(
      realizedPnl.plus(
        new PositionDecimal(execution.netProceeds).minus(allocatedCost),
      ),
    );
    quantity = rounded(quantity.minus(executionQuantity));
    costBasis = quantity.isZero()
      ? new PositionDecimal(0)
      : rounded(costBasis.minus(allocatedCost));
  }

  return {
    symbol: 'BTC/USDT',
    quantity: quantity.toFixed(),
    costBasis: costBasis.toFixed(),
    averageEntryPrice: quantity.isZero()
      ? null
      : rounded(costBasis.dividedBy(quantity)).toFixed(),
    realizedPnl: realizedPnl.toFixed(),
    totalFees: totalFees.toFixed(),
  };
}

function rounded(value: Decimal): Decimal {
  return value.toDecimalPlaces(SCALE, Decimal.ROUND_HALF_EVEN);
}
