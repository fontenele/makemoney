import Decimal from 'decimal.js';
import { PaperPosition } from '../domain/paper-position';

const ValuationDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});
const SCALE = 18;

export type CostBasedPaperPosition = Omit<
  PaperPosition,
  | 'markPrice'
  | 'grossMarketValue'
  | 'estimatedExitFee'
  | 'netLiquidationValue'
  | 'unrealizedPnl'
  | 'totalPnl'
  | 'marketDataReceivedAt'
>;

export function valuePaperPosition(
  position: CostBasedPaperPosition,
  markPrice: string | null,
  feeRate: string,
  marketDataReceivedAt: Date | null,
): PaperPosition {
  const quantity = decimal(position.quantity);
  const realizedPnl = decimal(position.realizedPnl);

  if (quantity.isZero()) {
    return {
      ...position,
      markPrice: null,
      grossMarketValue: '0',
      estimatedExitFee: '0',
      netLiquidationValue: '0',
      unrealizedPnl: '0',
      totalPnl: realizedPnl.toFixed(),
      marketDataReceivedAt: null,
    };
  }

  if (markPrice === null || marketDataReceivedAt === null) {
    throw new Error('Open paper position requires market data');
  }

  const price = positiveDecimal(markPrice);
  const rate = decimal(feeRate);
  if (rate.isNegative() || rate.greaterThanOrEqualTo(1)) {
    throw new Error('Invalid paper taker fee rate');
  }

  const grossMarketValue = rounded(quantity.times(price));
  const estimatedExitFee = rounded(grossMarketValue.times(rate));
  const netLiquidationValue = rounded(grossMarketValue.minus(estimatedExitFee));
  const unrealizedPnl = rounded(netLiquidationValue.minus(position.costBasis));

  return {
    ...position,
    markPrice: price.toFixed(),
    grossMarketValue: grossMarketValue.toFixed(),
    estimatedExitFee: estimatedExitFee.toFixed(),
    netLiquidationValue: netLiquidationValue.toFixed(),
    unrealizedPnl: unrealizedPnl.toFixed(),
    totalPnl: rounded(realizedPnl.plus(unrealizedPnl)).toFixed(),
    marketDataReceivedAt,
  };
}

function decimal(value: string): Decimal {
  const result = new ValuationDecimal(value);
  if (!result.isFinite()) throw new Error('Invalid decimal value');
  return result;
}

function positiveDecimal(value: string): Decimal {
  const result = decimal(value);
  if (result.lessThanOrEqualTo(0)) throw new Error('Invalid mark price');
  return result;
}

function rounded(value: Decimal): Decimal {
  return value.toDecimalPlaces(SCALE, Decimal.ROUND_HALF_EVEN);
}
