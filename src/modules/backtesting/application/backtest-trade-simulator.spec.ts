import {
  StrategyAction,
  StrategySignal,
} from '../../strategies/domain/strategy';
import { HistoricalCandle } from '../domain/historical-candle';
import { BacktestTradeSimulator } from './backtest-trade-simulator';
import { BacktestPerformanceCalculator } from './backtest-performance-calculator';
import { BacktestEndingValuationCalculator } from './backtest-ending-valuation-calculator';

describe('BacktestTradeSimulator', () => {
  const simulator = new BacktestTradeSimulator(
    new BacktestPerformanceCalculator(),
    new BacktestEndingValuationCalculator(),
  );

  it('fills signals only at the following candle open and includes fees', () => {
    const candles = [candle(0, '100'), candle(1, '110'), candle(2, '120')];
    const result = simulator.simulate(
      candles,
      [
        signal(candles[0], 'buy'),
        signal(candles[1], 'sell'),
        signal(candles[2]),
      ],
      { quantity: '0.5', feeRate: '0.01' },
    );

    expect(result.fills).toEqual([
      expect.objectContaining({
        side: 'buy',
        price: '110',
        notional: '55',
        fee: '0.55',
        totalCost: '55.55',
        signalTime: candles[0]?.closeTime,
        filledAt: candles[1]?.openTime,
      }),
      expect.objectContaining({
        side: 'sell',
        price: '120',
        notional: '60',
        fee: '0.6',
        netProceeds: '59.4',
        signalTime: candles[1]?.closeTime,
        filledAt: candles[2]?.openTime,
      }),
    ]);
    expect(result.closedTrades[0]?.netPnl).toBe('3.85');
    expect(result.performance).toEqual({
      fillCount: 2,
      closedTradeCount: 1,
      profitableTradeCount: 1,
      losingTradeCount: 0,
      breakEvenTradeCount: 0,
      winRate: '1',
      grossProfit: '3.85',
      grossLoss: '0',
      realizedNetPnl: '3.85',
      averageNetPnlPerClosedTrade: '3.85',
      averageProfitableTradeNetPnl: '3.85',
      averageLosingTradeNetPnl: null,
      expectancy: '3.85',
      profitFactor: null,
      unrealizedNetPnl: null,
      totalNetPnl: '3.85',
      totalFees: '1.15',
    });
    expect(result.openPosition).toBeNull();
  });

  it('keeps a final open position explicit', () => {
    const candles = [candle(0, '100'), candle(1, '101')];
    const result = simulator.simulate(
      candles,
      [signal(candles[0], 'buy'), signal(candles[1])],
      { quantity: '0.1', feeRate: '0.001' },
    );

    expect(result.openPosition).toMatchObject({
      quantity: '0.1',
      costBasis: '10.1101',
    });
    expect(result.closedTrades).toEqual([]);
    expect(result.endingValuation).toEqual({
      markedAt: candles[1]?.closeTime,
      markPrice: '101',
      grossMarketValue: '10.1',
      estimatedExitFee: '0.0101',
      netLiquidationValue: '10.0899',
      unrealizedNetPnl: '-0.0202',
    });
    expect(result.performance).toMatchObject({
      realizedNetPnl: '0',
      unrealizedNetPnl: '-0.0202',
      totalNetPnl: '-0.0202',
    });
  });

  it('ignores buys while long and sells while flat', () => {
    const candles = [
      candle(0, '100'),
      candle(1, '101'),
      candle(2, '102'),
      candle(3, '103'),
      candle(4, '104'),
    ];
    const actions: StrategyAction[] = ['sell', 'buy', 'buy', 'sell', 'hold'];
    const result = simulator.simulate(
      candles,
      candles.map((value, index) => signal(value, actions[index])),
      { quantity: '1', feeRate: '0' },
    );

    expect(result.ignoredSellSignalCount).toBe(1);
    expect(result.ignoredBuySignalCount).toBe(1);
    expect(result.fills.map((fill) => fill.side)).toEqual(['buy', 'sell']);
  });

  it('does not fill a terminal signal without a following candle', () => {
    const candles = [candle(0, '100')];
    const result = simulator.simulate(candles, [signal(candles[0], 'buy')], {
      quantity: '1',
      feeRate: '0',
    });

    expect(result.fills).toEqual([]);
    expect(result.unfilledTerminalSignalCount).toBe(1);
  });

  it('preserves deterministic arbitrary-precision calculations', () => {
    const candles = [candle(0, '1'), candle(1, '1.1234567890123456789')];
    const configuration = {
      quantity: '0.1234567890123456789',
      feeRate: '0.0001',
    };

    const first = simulator.simulate(
      candles,
      [signal(candles[0], 'buy'), signal(candles[1])],
      configuration,
    );
    const second = simulator.simulate(
      candles,
      [signal(candles[0], 'buy'), signal(candles[1])],
      configuration,
    );

    expect(second).toEqual(first);
    expect(first.fills[0]?.notional).toBe(
      '0.13869836776558451565019051998750190521',
    );
  });

  it.each([
    { quantity: '0', feeRate: '0.001' },
    { quantity: '-1', feeRate: '0.001' },
    { quantity: '1', feeRate: '-0.1' },
    { quantity: '1', feeRate: '1' },
  ])('rejects invalid simulation configuration', (configuration) => {
    expect(() => simulator.simulate([], [], configuration)).toThrow();
  });

  it('rejects a candle and signal timeline mismatch', () => {
    const candles = [candle(0, '100')];
    const mismatched = signal(candles[0]);
    mismatched.evaluatedAt = new Date(mismatched.evaluatedAt.getTime() + 1);

    expect(() =>
      simulator.simulate(candles, [mismatched], {
        quantity: '1',
        feeRate: '0',
      }),
    ).toThrow('Backtest candle and signal timeline is inconsistent');
  });
});

function candle(index: number, openPrice: string): HistoricalCandle {
  const openTime = new Date(Date.UTC(2026, 8, 13, 12, index));
  return {
    symbol: 'BTC/USDT',
    interval: '1m',
    openPrice,
    highPrice: openPrice,
    lowPrice: openPrice,
    closePrice: openPrice,
    baseVolume: '1',
    quoteVolume: '100',
    takerBuyBaseVolume: '0.5',
    takerBuyQuoteVolume: '50',
    tradeCount: 1,
    openTime,
    closeTime: new Date(openTime.getTime() + 59_999),
    isClosed: true,
  };
}

function signal(
  candle: HistoricalCandle | undefined,
  action: StrategyAction = 'hold',
): StrategySignal {
  if (!candle) throw new Error('Test candle is required');
  return {
    strategy: 'moving_average_crossover',
    symbol: 'BTC/USDT',
    action,
    reason:
      action === 'buy'
        ? 'bullish_moving_average_crossover'
        : action === 'sell'
          ? 'bearish_moving_average_crossover'
          : 'no_moving_average_crossover',
    shortPeriod: 3,
    longPeriod: 5,
    previousShortAverage: null,
    previousLongAverage: null,
    currentShortAverage: null,
    currentLongAverage: null,
    latestCandleCloseTime: candle.closeTime,
    evaluatedAt: candle.closeTime,
  };
}
