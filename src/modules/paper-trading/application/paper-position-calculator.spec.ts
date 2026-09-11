import { PaperExecution } from '../domain/trading-executor';
import {
  calculatePaperPosition,
  InconsistentPaperExecutionHistoryError,
} from './paper-position-calculator';

describe('calculatePaperPosition', () => {
  it('returns an empty position for empty history', () => {
    expect(calculatePaperPosition([])).toEqual({
      symbol: 'BTC/USDT',
      quantity: '0',
      costBasis: '0',
      averageEntryPrice: null,
      realizedPnl: '0',
      totalFees: '0',
    });
  });

  it('uses fee-inclusive weighted-average cost for multiple buys', () => {
    expect(
      calculatePaperPosition([
        buy('b1', '0.001', '50', '0.05'),
        buy('b2', '0.001', '60', '0.06'),
      ]),
    ).toEqual({
      symbol: 'BTC/USDT',
      quantity: '0.002',
      costBasis: '110.11',
      averageEntryPrice: '55055',
      realizedPnl: '0',
      totalFees: '0.11',
    });
  });

  it('calculates realized profit and remaining cost after a partial sell', () => {
    const position = calculatePaperPosition([
      buy('b1', '0.001', '50', '0.05'),
      buy('b2', '0.001', '60', '0.06'),
      sell('s1', '0.001', '70', '0.07'),
    ]);

    expect(position).toEqual({
      symbol: 'BTC/USDT',
      quantity: '0.001',
      costBasis: '55.055',
      averageEntryPrice: '55055',
      realizedPnl: '14.875',
      totalFees: '0.18',
    });
  });

  it('clears cost basis when the position is closed at a loss', () => {
    expect(
      calculatePaperPosition([
        buy('b1', '0.001', '50', '0.05'),
        sell('s1', '0.001', '49', '0.049'),
      ]),
    ).toMatchObject({
      quantity: '0',
      costBasis: '0',
      averageEntryPrice: null,
      realizedPnl: '-1.099',
      totalFees: '0.099',
    });
  });

  it('rejects a sell larger than the execution-tracked position', () => {
    expect(() =>
      calculatePaperPosition([sell('s1', '0.001', '50', '0.05')]),
    ).toThrow(InconsistentPaperExecutionHistoryError);
  });
});

function buy(
  id: string,
  quantity: string,
  notional: string,
  fee: string,
): PaperExecution {
  return {
    ...base(id, quantity, notional, fee),
    side: 'buy',
    totalCost: newNumber(notional, fee, 'plus'),
  };
}

function sell(
  id: string,
  quantity: string,
  notional: string,
  fee: string,
): PaperExecution {
  return {
    ...base(id, quantity, notional, fee),
    side: 'sell',
    netProceeds: newNumber(notional, fee, 'minus'),
  };
}

function base(id: string, quantity: string, notional: string, fee: string) {
  return {
    id,
    symbol: 'BTC/USDT' as const,
    quantity,
    price: '1',
    notional,
    feeRate: '0.001',
    fee,
    quotedAt: new Date(0),
    marketDataReceivedAt: new Date(0),
    executedAt: new Date(0),
    replayed: false,
  };
}

function newNumber(left: string, right: string, operation: 'plus' | 'minus') {
  const [leftWhole, leftFraction = ''] = left.split('.');
  const [rightWhole, rightFraction = ''] = right.split('.');
  const scale = Math.max(leftFraction.length, rightFraction.length);
  const leftInteger = BigInt(leftWhole + leftFraction.padEnd(scale, '0'));
  const rightInteger = BigInt(rightWhole + rightFraction.padEnd(scale, '0'));
  const result =
    operation === 'plus'
      ? leftInteger + rightInteger
      : leftInteger - rightInteger;
  const digits = result.toString().padStart(scale + 1, '0');
  return scale === 0
    ? digits
    : `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
}
