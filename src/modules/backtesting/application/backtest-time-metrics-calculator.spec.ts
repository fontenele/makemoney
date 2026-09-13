import {
  BacktestBuyFill,
  BacktestClosedTrade,
  BacktestOpenPosition,
  BacktestSellFill,
} from '../domain/backtest-simulation';
import { HistoricalCandle } from '../domain/historical-candle';
import { BacktestTimeMetricsCalculator } from './backtest-time-metrics-calculator';

describe('BacktestTimeMetricsCalculator', () => {
  const calculator = new BacktestTimeMetricsCalculator();

  it('returns explicit unavailable ratios for an empty period', () => {
    expect(calculator.calculate([], [], null)).toEqual({
      periodStartedAt: null,
      periodEndedAt: null,
      periodDurationMs: 0,
      timeInMarketMs: 0,
      exposureRate: null,
      closedTradeHoldingDurations: [],
      averageClosedTradeHoldingDurationMs: null,
    });
  });

  it('measures closed trades and their average holding duration', () => {
    const candles = [candle(0), candle(1), candle(2), candle(3), candle(4)];
    const trades = [
      closedTrade(candles[1], candles[2]),
      closedTrade(candles[3], candles[4]),
    ];

    const result = calculator.calculate(candles, trades, null);

    expect(result).toEqual({
      periodStartedAt: candles[0]?.openTime,
      periodEndedAt: candles[4]?.closeTime,
      periodDurationMs: 300_000,
      timeInMarketMs: 120_000,
      exposureRate: '0.4',
      closedTradeHoldingDurations: [
        {
          enteredAt: candles[1]?.openTime,
          exitedAt: candles[2]?.openTime,
          durationMs: 60_000,
        },
        {
          enteredAt: candles[3]?.openTime,
          exitedAt: candles[4]?.openTime,
          durationMs: 60_000,
        },
      ],
      averageClosedTradeHoldingDurationMs: '60000',
    });
  });

  it('counts an ending open position through the final candle close', () => {
    const candles = [candle(0), candle(1), candle(2)];
    const entry = buyFill(candles[1]);
    const openPosition: BacktestOpenPosition = {
      entry,
      quantity: entry.quantity,
      costBasis: entry.totalCost,
    };

    expect(calculator.calculate(candles, [], openPosition)).toMatchObject({
      periodDurationMs: 180_000,
      timeInMarketMs: 120_000,
      exposureRate: '0.6666666666666666666666666666666666666667',
      averageClosedTradeHoldingDurationMs: null,
    });
  });

  it('rejects an invalid temporal interval', () => {
    const invalid = candle(0);
    invalid.closeTime = new Date(invalid.openTime.getTime() - 1);

    expect(() => calculator.calculate([invalid], [], null)).toThrow(
      'Invalid backtest time interval',
    );
  });
});

function candle(index: number): HistoricalCandle {
  const openTime = new Date(index * 60_000);
  return {
    symbol: 'BTC/USDT',
    interval: '1m',
    openPrice: '100',
    highPrice: '100',
    lowPrice: '100',
    closePrice: '100',
    baseVolume: '1',
    quoteVolume: '100',
    takerBuyBaseVolume: '0.5',
    takerBuyQuoteVolume: '50',
    tradeCount: 1,
    openTime,
    closeTime: new Date(openTime.getTime() + 60_000),
    isClosed: true,
  };
}

function closedTrade(
  entryCandle: HistoricalCandle | undefined,
  exitCandle: HistoricalCandle | undefined,
): BacktestClosedTrade {
  const entry = buyFill(entryCandle);
  const exit = sellFill(exitCandle);
  return { entry, exit, netPnl: '0' };
}

function buyFill(candle: HistoricalCandle | undefined): BacktestBuyFill {
  if (!candle) throw new Error('Test candle is required');
  return {
    side: 'buy',
    quantity: '1',
    referencePrice: '100',
    adjustedPrice: '100',
    price: '100',
    notional: '100',
    feeRate: '0',
    fee: '0',
    totalCost: '100',
    signalTime: candle.openTime,
    filledAt: candle.openTime,
  };
}

function sellFill(candle: HistoricalCandle | undefined): BacktestSellFill {
  if (!candle) throw new Error('Test candle is required');
  return {
    side: 'sell',
    quantity: '1',
    referencePrice: '100',
    adjustedPrice: '100',
    price: '100',
    notional: '100',
    feeRate: '0',
    fee: '0',
    netProceeds: '100',
    signalTime: candle.openTime,
    filledAt: candle.openTime,
  };
}
