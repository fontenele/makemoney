import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { StrategySignal } from '../../strategies/domain/strategy';
import {
  BacktestBuyFill,
  BacktestClosedTrade,
  BacktestFill,
  BacktestOpenPosition,
  BacktestSellFill,
  BacktestSimulationConfiguration,
  BacktestSimulationResult,
} from '../domain/backtest-simulation';
import { HistoricalCandle } from '../domain/historical-candle';
import { BacktestPerformanceCalculator } from './backtest-performance-calculator';
import { BacktestEndingValuationCalculator } from './backtest-ending-valuation-calculator';

const SimulationDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});
const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

@Injectable()
export class BacktestTradeSimulator {
  constructor(
    private readonly performanceCalculator: BacktestPerformanceCalculator,
    private readonly endingValuationCalculator: BacktestEndingValuationCalculator,
  ) {}

  simulate(
    candles: readonly HistoricalCandle[],
    signals: readonly StrategySignal[],
    configuration: BacktestSimulationConfiguration,
  ): BacktestSimulationResult {
    const quantity = this.positiveDecimal(configuration.quantity, 'quantity');
    const feeRate = this.feeRate(configuration.feeRate);
    this.validateTimeline(candles, signals);

    const fills: BacktestFill[] = [];
    const closedTrades: BacktestClosedTrade[] = [];
    let entry: BacktestBuyFill | null = null;
    let ignoredBuySignalCount = 0;
    let ignoredSellSignalCount = 0;

    for (let index = 1; index < candles.length; index += 1) {
      const signal = signals[index - 1];
      const candle = candles[index];
      if (!signal || !candle || signal.action === 'hold') continue;

      if (signal.action === 'buy') {
        if (entry) {
          ignoredBuySignalCount += 1;
          continue;
        }
        entry = this.buyFill(candle, signal, quantity, feeRate);
        fills.push(entry);
        continue;
      }

      if (!entry) {
        ignoredSellSignalCount += 1;
        continue;
      }
      const exit = this.sellFill(candle, signal, quantity, feeRate);
      fills.push(exit);
      closedTrades.push({
        entry,
        exit,
        netPnl: new SimulationDecimal(exit.netProceeds)
          .minus(entry.totalCost)
          .toFixed(),
      });
      entry = null;
    }

    const terminalSignal = signals.at(-1);
    const openPosition: BacktestOpenPosition | null = entry
      ? { entry, quantity: entry.quantity, costBasis: entry.totalCost }
      : null;
    const endingValuation = this.endingValuationCalculator.calculate(
      openPosition,
      candles.at(-1),
      feeRate.toFixed(),
    );
    return {
      symbol: 'BTC/USDT',
      executionModel: 'next_candle_open',
      quantity: quantity.toFixed(),
      feeRate: feeRate.toFixed(),
      fills,
      closedTrades,
      performance: this.performanceCalculator.calculate(
        fills,
        closedTrades,
        endingValuation,
      ),
      openPosition,
      endingValuation,
      ignoredBuySignalCount,
      ignoredSellSignalCount,
      unfilledTerminalSignalCount:
        terminalSignal && terminalSignal.action !== 'hold' ? 1 : 0,
    };
  }

  private buyFill(
    candle: HistoricalCandle,
    signal: StrategySignal,
    quantity: Decimal,
    feeRate: Decimal,
  ): BacktestBuyFill {
    const price = new SimulationDecimal(candle.openPrice);
    const notional = price.times(quantity);
    const fee = notional.times(feeRate);
    return {
      side: 'buy',
      quantity: quantity.toFixed(),
      price: price.toFixed(),
      notional: notional.toFixed(),
      feeRate: feeRate.toFixed(),
      fee: fee.toFixed(),
      totalCost: notional.plus(fee).toFixed(),
      signalTime: signal.evaluatedAt,
      filledAt: candle.openTime,
    };
  }

  private sellFill(
    candle: HistoricalCandle,
    signal: StrategySignal,
    quantity: Decimal,
    feeRate: Decimal,
  ): BacktestSellFill {
    const price = new SimulationDecimal(candle.openPrice);
    const notional = price.times(quantity);
    const fee = notional.times(feeRate);
    return {
      side: 'sell',
      quantity: quantity.toFixed(),
      price: price.toFixed(),
      notional: notional.toFixed(),
      feeRate: feeRate.toFixed(),
      fee: fee.toFixed(),
      netProceeds: notional.minus(fee).toFixed(),
      signalTime: signal.evaluatedAt,
      filledAt: candle.openTime,
    };
  }

  private validateTimeline(
    candles: readonly HistoricalCandle[],
    signals: readonly StrategySignal[],
  ): void {
    if (candles.length !== signals.length) {
      throw new Error('Backtest candles and signals must have equal length');
    }
    for (let index = 0; index < candles.length; index += 1) {
      const candle = candles[index];
      const signal = signals[index];
      if (
        !candle ||
        !signal ||
        signal.symbol !== candle.symbol ||
        signal.latestCandleCloseTime?.getTime() !==
          candle.closeTime.getTime() ||
        signal.evaluatedAt.getTime() !== candle.closeTime.getTime()
      ) {
        throw new Error('Backtest candle and signal timeline is inconsistent');
      }
    }
  }

  private positiveDecimal(value: string, name: string): Decimal {
    if (!DECIMAL_PATTERN.test(value)) {
      throw new Error(`Invalid backtest ${name}`);
    }
    const decimal = new SimulationDecimal(value);
    if (!decimal.greaterThan(0)) throw new Error(`Invalid backtest ${name}`);
    return decimal;
  }

  private feeRate(value: string): Decimal {
    if (!DECIMAL_PATTERN.test(value))
      throw new Error('Invalid backtest feeRate');
    const feeRate = new SimulationDecimal(value);
    if (feeRate.greaterThanOrEqualTo(1)) {
      throw new Error('Invalid backtest feeRate');
    }
    return feeRate;
  }
}
