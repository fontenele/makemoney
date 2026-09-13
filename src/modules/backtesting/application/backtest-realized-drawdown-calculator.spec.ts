import {
  BacktestBuyFill,
  BacktestClosedTrade,
  BacktestSellFill,
} from '../domain/backtest-simulation';
import { BacktestRealizedDrawdownCalculator } from './backtest-realized-drawdown-calculator';

describe('BacktestRealizedDrawdownCalculator', () => {
  const calculator = new BacktestRealizedDrawdownCalculator();

  it('returns an empty curve and zero drawdown without closed trades', () => {
    expect(calculator.calculate([])).toEqual({
      curve: [],
      maximumDrawdown: {
        amount: '0',
        startedAt: null,
        troughAt: null,
        recoveredAt: null,
      },
    });
  });

  it('tracks losses, maximum trough, recovery, and a new peak', () => {
    const trades = ['5', '-2', '-4', '6', '3'].map((pnl, index) =>
      trade(pnl, index),
    );
    const result = calculator.calculate(trades);

    expect(
      result.curve.map((point) => ({
        cumulative: point.cumulativeRealizedNetPnl,
        peak: point.peakRealizedNetPnl,
        drawdown: point.drawdown,
      })),
    ).toEqual([
      { cumulative: '5', peak: '5', drawdown: '0' },
      { cumulative: '3', peak: '5', drawdown: '2' },
      { cumulative: '-1', peak: '5', drawdown: '6' },
      { cumulative: '5', peak: '5', drawdown: '0' },
      { cumulative: '8', peak: '8', drawdown: '0' },
    ]);
    expect(result.maximumDrawdown).toEqual({
      amount: '6',
      startedAt: trades[1]?.exit.filledAt,
      troughAt: trades[2]?.exit.filledAt,
      recoveredAt: trades[3]?.exit.filledAt,
    });
  });

  it('keeps an unrecovered first-trade loss and arbitrary precision exact', () => {
    const loss = '-0.123456789012345678901234567890123456789';
    const result = calculator.calculate([trade(loss, 0), trade('0', 1)]);

    expect(result.maximumDrawdown).toEqual({
      amount: loss.slice(1),
      startedAt: new Date(1),
      troughAt: new Date(1),
      recoveredAt: null,
    });
    expect(result.curve[1]?.drawdown).toBe(loss.slice(1));
  });
});

function trade(netPnl: string, index: number): BacktestClosedTrade {
  const entry = fill('buy', index * 2) as BacktestBuyFill;
  const exit = fill('sell', index * 2 + 1) as BacktestSellFill;
  return { entry, exit, netPnl };
}

function fill(
  side: 'buy' | 'sell',
  time: number,
): BacktestBuyFill | BacktestSellFill {
  const common = {
    quantity: '1',
    price: '1',
    notional: '1',
    feeRate: '0',
    fee: '0',
    signalTime: new Date(time),
    filledAt: new Date(time),
  };
  return side === 'buy'
    ? { ...common, side, totalCost: '1' }
    : { ...common, side, netProceeds: '1' };
}
