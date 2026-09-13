import {
  BacktestBuyFill,
  BacktestClosedTrade,
  BacktestSellFill,
} from '../domain/backtest-simulation';
import { BacktestPerformanceCalculator } from './backtest-performance-calculator';

describe('BacktestPerformanceCalculator', () => {
  const calculator = new BacktestPerformanceCalculator();

  it('returns an explicit empty performance result', () => {
    expect(calculator.calculate([], [])).toEqual({
      fillCount: 0,
      closedTradeCount: 0,
      profitableTradeCount: 0,
      losingTradeCount: 0,
      breakEvenTradeCount: 0,
      winRate: null,
      grossProfit: '0',
      grossLoss: '0',
      realizedNetPnl: '0',
      unrealizedNetPnl: null,
      totalNetPnl: '0',
      totalFees: '0',
    });
  });

  it('aggregates profitable, losing, and break-even trades', () => {
    const entry = buyFill('0.1');
    const exit = sellFill('0.2');
    const trades = [
      trade(entry, exit, '4.25'),
      trade(entry, exit, '-1.5'),
      trade(entry, exit, '0'),
    ];

    expect(calculator.calculate([entry, exit], trades)).toEqual({
      fillCount: 2,
      closedTradeCount: 3,
      profitableTradeCount: 1,
      losingTradeCount: 1,
      breakEvenTradeCount: 1,
      winRate: '0.3333333333333333333333333333333333333333',
      grossProfit: '4.25',
      grossLoss: '1.5',
      realizedNetPnl: '2.75',
      unrealizedNetPnl: null,
      totalNetPnl: '2.75',
      totalFees: '0.3',
    });
  });

  it('includes the fee of an open entry without realizing PnL', () => {
    const entry = buyFill('0.123456789012345678901234567890123456789');

    expect(calculator.calculate([entry], [])).toMatchObject({
      fillCount: 1,
      closedTradeCount: 0,
      winRate: null,
      realizedNetPnl: '0',
      totalFees: '0.123456789012345678901234567890123456789',
    });
  });
});

function buyFill(fee: string): BacktestBuyFill {
  return {
    side: 'buy',
    quantity: '1',
    price: '100',
    notional: '100',
    feeRate: '0.001',
    fee,
    totalCost: '100.1',
    signalTime: new Date(0),
    filledAt: new Date(1),
  };
}

function sellFill(fee: string): BacktestSellFill {
  return {
    side: 'sell',
    quantity: '1',
    price: '105',
    notional: '105',
    feeRate: '0.001',
    fee,
    netProceeds: '104.8',
    signalTime: new Date(2),
    filledAt: new Date(3),
  };
}

function trade(
  entry: BacktestBuyFill,
  exit: BacktestSellFill,
  netPnl: string,
): BacktestClosedTrade {
  return { entry, exit, netPnl };
}
