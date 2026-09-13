import {
  StrategyAction,
  StrategySignal,
} from '../../strategies/domain/strategy';
import { HistoricalCandle } from '../domain/historical-candle';
import { BacktestTradeSimulator } from './backtest-trade-simulator';
import { BacktestPerformanceCalculator } from './backtest-performance-calculator';
import { BacktestEndingValuationCalculator } from './backtest-ending-valuation-calculator';
import { BacktestRealizedDrawdownCalculator } from './backtest-realized-drawdown-calculator';
import { BacktestEquityCalculator } from './backtest-equity-calculator';
import { BacktestTimeMetricsCalculator } from './backtest-time-metrics-calculator';
import { BacktestExecutionRulesValidator } from './backtest-execution-rules-validator';
import { BacktestFillPriceCalculator } from './backtest-fill-price-calculator';
import { BacktestLiquidityCalculator } from './backtest-liquidity-calculator';

const EXECUTION_RULES = {
  minQuantity: '0.00001',
  maxQuantity: '1000',
  stepSize: '0.00001',
  minNotional: '0.00001',
  tickSize: '0.0000000000000000001',
  minPrice: '0.0000000000000000001',
  maxPrice: '1000000000',
};

describe('BacktestTradeSimulator', () => {
  const simulator = new BacktestTradeSimulator(
    new BacktestPerformanceCalculator(new BacktestRealizedDrawdownCalculator()),
    new BacktestEndingValuationCalculator(),
    new BacktestEquityCalculator(),
    new BacktestTimeMetricsCalculator(),
    new BacktestExecutionRulesValidator(),
    new BacktestFillPriceCalculator(),
    new BacktestLiquidityCalculator(),
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
      {
        quantity: '0.5',
        feeRate: '0.01',
        spreadRate: '0',
        slippageRate: '0',
        maximumVolumeParticipationRate: '1',
        executionRules: EXECUTION_RULES,
        initialCapitalUsdt: '100',
      },
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
      realizedPnlCurve: [
        {
          exitedAt: candles[2]?.openTime,
          tradeNetPnl: '3.85',
          cumulativeRealizedNetPnl: '3.85',
          peakRealizedNetPnl: '3.85',
          drawdown: '0',
        },
      ],
      maximumRealizedDrawdown: {
        amount: '0',
        startedAt: null,
        troughAt: null,
        recoveredAt: null,
      },
      unrealizedNetPnl: null,
      totalNetPnl: '3.85',
      totalFees: '1.15',
    });
    expect(result.openPosition).toBeNull();
    expect(result.capital).toEqual({
      initialCapitalUsdt: '100',
      finalCashUsdt: '103.85',
      endingPositionNetValueUsdt: '0',
      finalEquityUsdt: '103.85',
      totalNetReturnUsdt: '3.85',
      totalRoi: '0.0385',
    });
    expect(result.equity.curve.at(-1)?.equityUsdt).toBe(
      result.capital.finalEquityUsdt,
    );
    expect(result.timeMetrics).toMatchObject({
      periodDurationMs: 179_999,
      timeInMarketMs: 60_000,
      closedTradeHoldingDurations: [
        {
          enteredAt: candles[1]?.openTime,
          exitedAt: candles[2]?.openTime,
          durationMs: 60_000,
        },
      ],
      averageClosedTradeHoldingDurationMs: '60000',
    });
  });

  it('keeps a final open position explicit', () => {
    const candles = [candle(0, '100'), candle(1, '101')];
    const result = simulator.simulate(
      candles,
      [signal(candles[0], 'buy'), signal(candles[1])],
      {
        quantity: '0.1',
        feeRate: '0.001',
        spreadRate: '0',
        slippageRate: '0',
        maximumVolumeParticipationRate: '1',
        executionRules: EXECUTION_RULES,
        initialCapitalUsdt: '100',
      },
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
    expect(result.capital).toEqual({
      initialCapitalUsdt: '100',
      finalCashUsdt: '89.8899',
      endingPositionNetValueUsdt: '10.0899',
      finalEquityUsdt: '99.9798',
      totalNetReturnUsdt: '-0.0202',
      totalRoi: '-0.000202',
    });
    expect(result.equity.curve.at(-1)?.equityUsdt).toBe(
      result.capital.finalEquityUsdt,
    );
    expect(result.timeMetrics).toMatchObject({
      periodDurationMs: 119_999,
      timeInMarketMs: 59_999,
      averageClosedTradeHoldingDurationMs: null,
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
      {
        quantity: '1',
        feeRate: '0',
        spreadRate: '0',
        slippageRate: '0',
        maximumVolumeParticipationRate: '1',
        executionRules: EXECUTION_RULES,
        initialCapitalUsdt: '1000',
      },
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
      spreadRate: '0',
      slippageRate: '0',
      maximumVolumeParticipationRate: '1',
      executionRules: EXECUTION_RULES,
      initialCapitalUsdt: '1000',
    });

    expect(result.fills).toEqual([]);
    expect(result.unfilledTerminalSignalCount).toBe(1);
  });

  it('preserves deterministic arbitrary-precision calculations', () => {
    const candles = [candle(0, '1'), candle(1, '1.1234567890123456789')];
    const configuration = {
      quantity: '0.1234567890123456789',
      feeRate: '0.0001',
      spreadRate: '0',
      slippageRate: '0',
      maximumVolumeParticipationRate: '1',
      executionRules: {
        ...EXECUTION_RULES,
        stepSize: '0.1234567890123456789',
      },
      initialCapitalUsdt: '1000',
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

  it('applies half the spread and slippage adversely to both fill sides', () => {
    const candles = [candle(0, '100'), candle(1, '100'), candle(2, '100')];
    const result = simulator.simulate(
      candles,
      [
        signal(candles[0], 'buy'),
        signal(candles[1], 'sell'),
        signal(candles[2]),
      ],
      {
        quantity: '1',
        feeRate: '0',
        spreadRate: '0.02',
        slippageRate: '0.005',
        maximumVolumeParticipationRate: '1',
        executionRules: EXECUTION_RULES,
        initialCapitalUsdt: '1000',
      },
    );

    expect(result).toMatchObject({
      spreadRate: '0.02',
      slippageRate: '0.005',
      capital: {
        finalCashUsdt: '997',
        finalEquityUsdt: '997',
        totalNetReturnUsdt: '-3',
        totalRoi: '-0.003',
      },
    });
    expect(result.fills).toEqual([
      expect.objectContaining({
        side: 'buy',
        referencePrice: '100',
        price: '101.5',
        totalCost: '101.5',
      }),
      expect.objectContaining({
        side: 'sell',
        referencePrice: '100',
        price: '98.5',
        netProceeds: '98.5',
      }),
    ]);
    expect(result.closedTrades[0]?.netPnl).toBe('-3');
    expect(result.equity.curve.at(-1)?.equityUsdt).toBe('997');
  });

  it('rejects a buy made unaffordable by spread and slippage', () => {
    const candles = [candle(0, '100'), candle(1, '100')];
    const result = simulator.simulate(
      candles,
      [signal(candles[0], 'buy'), signal(candles[1])],
      {
        quantity: '1',
        feeRate: '0',
        spreadRate: '0.02',
        slippageRate: '0.005',
        maximumVolumeParticipationRate: '1',
        executionRules: EXECUTION_RULES,
        initialCapitalUsdt: '101',
      },
    );

    expect(result.fills).toEqual([]);
    expect(result.insufficientCapitalBuySignalCount).toBe(1);
    expect(result.capital.finalEquityUsdt).toBe('101');
  });

  it.each([
    {
      quantity: '0',
      feeRate: '0.001',
      spreadRate: '0',
      slippageRate: '0',
      maximumVolumeParticipationRate: '1',
      executionRules: EXECUTION_RULES,
      initialCapitalUsdt: '1000',
    },
    {
      quantity: '-1',
      feeRate: '0.001',
      spreadRate: '0',
      slippageRate: '0',
      maximumVolumeParticipationRate: '1',
      executionRules: EXECUTION_RULES,
      initialCapitalUsdt: '1000',
    },
    {
      quantity: '1',
      feeRate: '-0.1',
      spreadRate: '0',
      slippageRate: '0',
      maximumVolumeParticipationRate: '1',
      executionRules: EXECUTION_RULES,
      initialCapitalUsdt: '1000',
    },
    {
      quantity: '1',
      feeRate: '1',
      spreadRate: '0',
      slippageRate: '0',
      maximumVolumeParticipationRate: '1',
      executionRules: EXECUTION_RULES,
      initialCapitalUsdt: '1000',
    },
    {
      quantity: '1',
      feeRate: '0',
      spreadRate: '0',
      slippageRate: '0',
      maximumVolumeParticipationRate: '1',
      executionRules: EXECUTION_RULES,
      initialCapitalUsdt: '0',
    },
    {
      quantity: '1',
      feeRate: '0',
      spreadRate: '-0.1',
      slippageRate: '0',
      maximumVolumeParticipationRate: '1',
      executionRules: EXECUTION_RULES,
      initialCapitalUsdt: '1000',
    },
    {
      quantity: '1',
      feeRate: '0',
      spreadRate: '0',
      slippageRate: '1',
      maximumVolumeParticipationRate: '1',
      executionRules: EXECUTION_RULES,
      initialCapitalUsdt: '1000',
    },
    {
      quantity: '1',
      feeRate: '0',
      spreadRate: '0.8',
      slippageRate: '0.6',
      maximumVolumeParticipationRate: '1',
      executionRules: EXECUTION_RULES,
      initialCapitalUsdt: '1000',
    },
    {
      quantity: '1',
      feeRate: '0',
      spreadRate: '0',
      slippageRate: '0',
      maximumVolumeParticipationRate: '0',
      executionRules: EXECUTION_RULES,
      initialCapitalUsdt: '1000',
    },
    {
      quantity: '1',
      feeRate: '0',
      spreadRate: '0',
      slippageRate: '0',
      maximumVolumeParticipationRate: '1.0001',
      executionRules: EXECUTION_RULES,
      initialCapitalUsdt: '1000',
    },
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
        spreadRate: '0',
        slippageRate: '0',
        maximumVolumeParticipationRate: '1',
        executionRules: EXECUTION_RULES,
        initialCapitalUsdt: '1000',
      }),
    ).toThrow('Backtest candle and signal timeline is inconsistent');
  });

  it('rejects a hypothetical buy without enough cash', () => {
    const candles = [candle(0, '100'), candle(1, '101')];
    const result = simulator.simulate(
      candles,
      [signal(candles[0], 'buy'), signal(candles[1])],
      {
        quantity: '1',
        feeRate: '0.001',
        spreadRate: '0',
        slippageRate: '0',
        maximumVolumeParticipationRate: '1',
        executionRules: EXECUTION_RULES,
        initialCapitalUsdt: '100',
      },
    );

    expect(result.fills).toEqual([]);
    expect(result.openPosition).toBeNull();
    expect(result.insufficientCapitalBuySignalCount).toBe(1);
    expect(result.capital).toMatchObject({
      finalCashUsdt: '100',
      finalEquityUsdt: '100',
      totalNetReturnUsdt: '0',
      totalRoi: '0',
    });
  });

  it('leaves a below-minimum-notional buy unfilled', () => {
    const candles = [candle(0, '4'), candle(1, '4')];
    const result = simulator.simulate(
      candles,
      [signal(candles[0], 'buy'), signal(candles[1])],
      {
        quantity: '1',
        feeRate: '0',
        spreadRate: '0',
        slippageRate: '0',
        maximumVolumeParticipationRate: '1',
        initialCapitalUsdt: '100',
        executionRules: { ...EXECUTION_RULES, minNotional: '5' },
      },
    );

    expect(result.fills).toEqual([]);
    expect(result.minimumNotionalUnfilledSignalCount).toBe(1);
    expect(result.insufficientCapitalBuySignalCount).toBe(0);
    expect(result.capital.finalEquityUsdt).toBe('100');
  });

  it('keeps the position open when a sell is below minimum notional', () => {
    const candles = [candle(0, '100'), candle(1, '100'), candle(2, '40')];
    const result = simulator.simulate(
      candles,
      [
        signal(candles[0], 'buy'),
        signal(candles[1], 'sell'),
        signal(candles[2]),
      ],
      {
        quantity: '1',
        feeRate: '0',
        spreadRate: '0',
        slippageRate: '0',
        maximumVolumeParticipationRate: '1',
        initialCapitalUsdt: '1000',
        executionRules: { ...EXECUTION_RULES, minNotional: '50' },
      },
    );

    expect(result.fills.map((fill) => fill.side)).toEqual(['buy']);
    expect(result.closedTrades).toEqual([]);
    expect(result.openPosition).not.toBeNull();
    expect(result.minimumNotionalUnfilledSignalCount).toBe(1);
    expect(result.capital.finalCashUsdt).toBe('900');
    expect(result.capital.finalEquityUsdt).toBe('940');
  });

  it('uses adverse tick-rounded prices throughout financial results', () => {
    const candles = [candle(0, '100'), candle(1, '100'), candle(2, '100')];
    const result = simulator.simulate(
      candles,
      [
        signal(candles[0], 'buy'),
        signal(candles[1], 'sell'),
        signal(candles[2]),
      ],
      {
        quantity: '1',
        feeRate: '0',
        spreadRate: '0.00246',
        slippageRate: '0',
        maximumVolumeParticipationRate: '1',
        initialCapitalUsdt: '1000',
        executionRules: { ...EXECUTION_RULES, tickSize: '0.05' },
      },
    );

    expect(result.fills).toEqual([
      expect.objectContaining({
        side: 'buy',
        referencePrice: '100',
        adjustedPrice: '100.123',
        price: '100.15',
        notional: '100.15',
      }),
      expect.objectContaining({
        side: 'sell',
        referencePrice: '100',
        adjustedPrice: '99.877',
        price: '99.85',
        notional: '99.85',
      }),
    ]);
    expect(result.closedTrades[0]?.netPnl).toBe('-0.3');
    expect(result.capital.finalEquityUsdt).toBe('999.7');
  });

  it('leaves a position open when sell tick flooring reaches zero', () => {
    const candles = [candle(0, '1'), candle(1, '1'), candle(2, '0.01')];
    const result = simulator.simulate(
      candles,
      [
        signal(candles[0], 'buy'),
        signal(candles[1], 'sell'),
        signal(candles[2]),
      ],
      {
        quantity: '1',
        feeRate: '0',
        spreadRate: '0',
        slippageRate: '0.5',
        maximumVolumeParticipationRate: '1',
        initialCapitalUsdt: '1000',
        executionRules: { ...EXECUTION_RULES, tickSize: '0.01' },
      },
    );

    expect(result.fills.map((fill) => fill.side)).toEqual(['buy']);
    expect(result.openPosition).not.toBeNull();
    expect(result.pricePrecisionUnfilledSignalCount).toBe(1);
    expect(result.minimumNotionalUnfilledSignalCount).toBe(0);
  });

  it('leaves a buy above the maximum executable price unfilled', () => {
    const candles = [candle(0, '101'), candle(1, '101')];
    const result = simulator.simulate(
      candles,
      [signal(candles[0], 'buy'), signal(candles[1])],
      {
        quantity: '1',
        feeRate: '0',
        spreadRate: '0',
        slippageRate: '0',
        maximumVolumeParticipationRate: '1',
        initialCapitalUsdt: '1000',
        executionRules: { ...EXECUTION_RULES, maxPrice: '100' },
      },
    );

    expect(result.fills).toEqual([]);
    expect(result.priceRangeUnfilledSignalCount).toBe(1);
    expect(result.capital.finalCashUsdt).toBe('1000');
    expect(result.capital.finalEquityUsdt).toBe('1000');
  });

  it('keeps the position open when a sell is below the minimum price', () => {
    const candles = [candle(0, '100'), candle(1, '100'), candle(2, '49')];
    const result = simulator.simulate(
      candles,
      [
        signal(candles[0], 'buy'),
        signal(candles[1], 'sell'),
        signal(candles[2]),
      ],
      {
        quantity: '1',
        feeRate: '0',
        spreadRate: '0',
        slippageRate: '0',
        maximumVolumeParticipationRate: '1',
        initialCapitalUsdt: '1000',
        executionRules: { ...EXECUTION_RULES, minPrice: '50' },
      },
    );

    expect(result.fills.map((fill) => fill.side)).toEqual(['buy']);
    expect(result.closedTrades).toEqual([]);
    expect(result.openPosition).not.toBeNull();
    expect(result.priceRangeUnfilledSignalCount).toBe(1);
    expect(result.minimumNotionalUnfilledSignalCount).toBe(0);
    expect(result.capital.finalCashUsdt).toBe('900');
  });

  it('rejects a buy using only the closed signal candle volume', () => {
    const candles = [candle(0, '100', '0.5'), candle(1, '100', '100')];
    const result = simulator.simulate(
      candles,
      [signal(candles[0], 'buy'), signal(candles[1])],
      {
        quantity: '1',
        feeRate: '0',
        spreadRate: '0',
        slippageRate: '0',
        maximumVolumeParticipationRate: '1',
        initialCapitalUsdt: '1000',
        executionRules: EXECUTION_RULES,
      },
    );

    expect(result.fills).toEqual([]);
    expect(result.liquidityUnfilledSignalCount).toBe(1);
    expect(result.capital.finalCashUsdt).toBe('1000');
  });

  it('keeps a position open when causal reference volume cannot support the sell', () => {
    const candles = [
      candle(0, '100', '1'),
      candle(1, '100', '0.5'),
      candle(2, '100', '100'),
    ];
    const result = simulator.simulate(
      candles,
      [
        signal(candles[0], 'buy'),
        signal(candles[1], 'sell'),
        signal(candles[2]),
      ],
      {
        quantity: '1',
        feeRate: '0',
        spreadRate: '0',
        slippageRate: '0',
        maximumVolumeParticipationRate: '1',
        initialCapitalUsdt: '1000',
        executionRules: EXECUTION_RULES,
      },
    );

    expect(result.fills).toHaveLength(1);
    expect(result.fills[0]).toMatchObject({
      side: 'buy',
      liquidityReferenceCandleCloseTime: candles[0]?.closeTime,
      liquidityReferenceBaseVolume: '1',
      maximumLiquidityFillQuantity: '1',
    });
    expect(result.openPosition).not.toBeNull();
    expect(result.liquidityUnfilledSignalCount).toBe(1);
  });
});

function candle(
  index: number,
  openPrice: string,
  baseVolume = '1',
): HistoricalCandle {
  const openTime = new Date(Date.UTC(2026, 8, 13, 12, index));
  return {
    symbol: 'BTC/USDT',
    interval: '1m',
    openPrice,
    highPrice: openPrice,
    lowPrice: openPrice,
    closePrice: openPrice,
    baseVolume,
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
