import { PaperExecution } from '../domain/trading-executor';
import { InconsistentPaperExecutionHistoryError } from './paper-position-calculator';
import { calculatePaperTradingPerformance } from './paper-trading-performance-calculator';

describe('calculatePaperTradingPerformance', () => {
  it('returns an empty performance summary', () => {
    expect(calculatePaperTradingPerformance([])).toEqual({
      symbol: 'BTC/USDT',
      executionCount: 0,
      buyExecutionCount: 0,
      sellExecutionCount: 0,
      profitableSellCount: 0,
      losingSellCount: 0,
      breakEvenSellCount: 0,
      winRate: null,
      realizedPnl: '0',
      totalFees: '0',
    });
  });

  it('classifies net sell outcomes and excludes break-even from win rate', () => {
    expect(
      calculatePaperTradingPerformance([
        execution('buy', '3', '300'),
        execution('sell', '1', '110'),
        execution('sell', '1', '90'),
        execution('sell', '1', '100'),
      ]),
    ).toEqual({
      symbol: 'BTC/USDT',
      executionCount: 4,
      buyExecutionCount: 1,
      sellExecutionCount: 3,
      profitableSellCount: 1,
      losingSellCount: 1,
      breakEvenSellCount: 1,
      winRate: '0.5',
      realizedPnl: '0',
      totalFees: '0',
    });
  });

  it('rejects inconsistent sell history', () => {
    expect(() =>
      calculatePaperTradingPerformance([execution('sell', '1', '100')]),
    ).toThrow(InconsistentPaperExecutionHistoryError);
  });
});

function execution(
  side: 'buy' | 'sell',
  quantity: string,
  settlement: string,
): PaperExecution {
  const common = {
    id: `${side}-${quantity}-${settlement}`,
    symbol: 'BTC/USDT' as const,
    side,
    quantity,
    price: '100',
    notional: settlement,
    feeRate: '0',
    fee: '0',
    quotedAt: new Date(0),
    marketDataReceivedAt: new Date(0),
    executedAt: new Date(0),
    replayed: false,
  };
  return side === 'buy'
    ? { ...common, side, totalCost: settlement }
    : { ...common, side, netProceeds: settlement };
}
