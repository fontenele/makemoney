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
import { BacktestEquityCalculator } from './backtest-equity-calculator';
import { BacktestTimeMetricsCalculator } from './backtest-time-metrics-calculator';
import { BacktestExecutionRulesValidator } from './backtest-execution-rules-validator';
import { BacktestFillPriceCalculator } from './backtest-fill-price-calculator';

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
    private readonly equityCalculator: BacktestEquityCalculator,
    private readonly timeMetricsCalculator: BacktestTimeMetricsCalculator,
    private readonly executionRulesValidator: BacktestExecutionRulesValidator,
    private readonly fillPriceCalculator: BacktestFillPriceCalculator,
  ) {}

  simulate(
    candles: readonly HistoricalCandle[],
    signals: readonly StrategySignal[],
    configuration: BacktestSimulationConfiguration,
  ): BacktestSimulationResult {
    const quantity = this.positiveDecimal(configuration.quantity, 'quantity');
    const feeRate = this.feeRate(configuration.feeRate);
    const spreadRate = this.rate(configuration.spreadRate, 'spreadRate');
    const slippageRate = this.rate(configuration.slippageRate, 'slippageRate');
    const adversePriceImpactRate = spreadRate.dividedBy(2).plus(slippageRate);
    if (adversePriceImpactRate.greaterThanOrEqualTo(1)) {
      throw new Error('Invalid backtest combined price impact');
    }
    const initialCapital = this.positiveDecimal(
      configuration.initialCapitalUsdt,
      'initialCapitalUsdt',
    );
    const executionRules = this.executionRulesValidator.validate(
      configuration.executionRules,
      quantity.toFixed(),
    );
    this.validateTimeline(candles, signals);

    const fills: BacktestFill[] = [];
    const closedTrades: BacktestClosedTrade[] = [];
    let entry: BacktestBuyFill | null = null;
    let ignoredBuySignalCount = 0;
    let ignoredSellSignalCount = 0;
    let insufficientCapitalBuySignalCount = 0;
    let minimumNotionalUnfilledSignalCount = 0;
    let pricePrecisionUnfilledSignalCount = 0;
    let cash = initialCapital;

    for (let index = 1; index < candles.length; index += 1) {
      const signal = signals[index - 1];
      const candle = candles[index];
      if (!signal || !candle || signal.action === 'hold') continue;

      if (signal.action === 'buy') {
        if (entry) {
          ignoredBuySignalCount += 1;
          continue;
        }
        const candidateEntry = this.buyFill(
          candle,
          signal,
          quantity,
          feeRate,
          adversePriceImpactRate,
          executionRules.tickSize,
        );
        if (!candidateEntry) {
          pricePrecisionUnfilledSignalCount += 1;
          continue;
        }
        if (
          !this.executionRulesValidator.meetsMinimumNotional(
            candidateEntry.notional,
            executionRules.minNotional,
          )
        ) {
          minimumNotionalUnfilledSignalCount += 1;
          continue;
        }
        if (new SimulationDecimal(candidateEntry.totalCost).greaterThan(cash)) {
          insufficientCapitalBuySignalCount += 1;
          continue;
        }
        entry = candidateEntry;
        cash = cash.minus(entry.totalCost);
        fills.push(entry);
        continue;
      }

      if (!entry) {
        ignoredSellSignalCount += 1;
        continue;
      }
      const exit = this.sellFill(
        candle,
        signal,
        quantity,
        feeRate,
        adversePriceImpactRate,
        executionRules.tickSize,
      );
      if (!exit) {
        pricePrecisionUnfilledSignalCount += 1;
        continue;
      }
      if (
        !this.executionRulesValidator.meetsMinimumNotional(
          exit.notional,
          executionRules.minNotional,
        )
      ) {
        minimumNotionalUnfilledSignalCount += 1;
        continue;
      }
      cash = cash.plus(exit.netProceeds);
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
    const endingPositionNetValue = new SimulationDecimal(
      endingValuation?.netLiquidationValue ?? 0,
    );
    const finalEquity = cash.plus(endingPositionNetValue);
    const totalNetReturn = finalEquity.minus(initialCapital);
    const equity = this.equityCalculator.calculate(
      candles,
      fills,
      initialCapital.toFixed(),
      feeRate.toFixed(),
    );
    return {
      symbol: 'BTC/USDT',
      executionModel: 'next_candle_open',
      quantity: quantity.toFixed(),
      feeRate: feeRate.toFixed(),
      spreadRate: spreadRate.toFixed(),
      slippageRate: slippageRate.toFixed(),
      executionRules,
      capital: {
        initialCapitalUsdt: initialCapital.toFixed(),
        finalCashUsdt: cash.toFixed(),
        endingPositionNetValueUsdt: endingPositionNetValue.toFixed(),
        finalEquityUsdt: finalEquity.toFixed(),
        totalNetReturnUsdt: totalNetReturn.toFixed(),
        totalRoi: totalNetReturn.dividedBy(initialCapital).toFixed(),
      },
      equity,
      timeMetrics: this.timeMetricsCalculator.calculate(
        candles,
        closedTrades,
        openPosition,
      ),
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
      insufficientCapitalBuySignalCount,
      minimumNotionalUnfilledSignalCount,
      pricePrecisionUnfilledSignalCount,
      unfilledTerminalSignalCount:
        terminalSignal && terminalSignal.action !== 'hold' ? 1 : 0,
    };
  }

  private buyFill(
    candle: HistoricalCandle,
    signal: StrategySignal,
    quantity: Decimal,
    feeRate: Decimal,
    adversePriceImpactRate: Decimal,
    tickSize: string,
  ): BacktestBuyFill | null {
    const fillPrice = this.fillPriceCalculator.calculate(
      'buy',
      candle.openPrice,
      adversePriceImpactRate.toFixed(),
      tickSize,
    );
    if (!fillPrice.executablePrice) return null;
    const price = new SimulationDecimal(fillPrice.executablePrice);
    const notional = price.times(quantity);
    const fee = notional.times(feeRate);
    return {
      side: 'buy',
      quantity: quantity.toFixed(),
      referencePrice: fillPrice.referencePrice,
      adjustedPrice: fillPrice.adjustedPrice,
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
    adversePriceImpactRate: Decimal,
    tickSize: string,
  ): BacktestSellFill | null {
    const fillPrice = this.fillPriceCalculator.calculate(
      'sell',
      candle.openPrice,
      adversePriceImpactRate.toFixed(),
      tickSize,
    );
    if (!fillPrice.executablePrice) return null;
    const price = new SimulationDecimal(fillPrice.executablePrice);
    const notional = price.times(quantity);
    const fee = notional.times(feeRate);
    return {
      side: 'sell',
      quantity: quantity.toFixed(),
      referencePrice: fillPrice.referencePrice,
      adjustedPrice: fillPrice.adjustedPrice,
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

  private rate(value: string, name: string): Decimal {
    if (!DECIMAL_PATTERN.test(value)) {
      throw new Error(`Invalid backtest ${name}`);
    }
    const rate = new SimulationDecimal(value);
    if (rate.greaterThanOrEqualTo(1)) {
      throw new Error(`Invalid backtest ${name}`);
    }
    return rate;
  }
}
