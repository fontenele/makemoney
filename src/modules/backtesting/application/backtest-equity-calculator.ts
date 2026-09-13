import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import {
  BacktestEquityDrawdown,
  BacktestEquityPoint,
  BacktestEquityResult,
} from '../domain/backtest-equity';
import { BacktestFill } from '../domain/backtest-simulation';
import { HistoricalCandle } from '../domain/historical-candle';

const EquityDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});

interface DrawdownCandidate {
  point: BacktestEquityPoint;
  peak: Decimal;
  startedAt: Date;
}

@Injectable()
export class BacktestEquityCalculator {
  calculate(
    candles: readonly HistoricalCandle[],
    fills: readonly BacktestFill[],
    initialCapitalUsdt: string,
    feeRate: string,
  ): BacktestEquityResult {
    let cash = new EquityDecimal(initialCapitalUsdt);
    let quantity = new EquityDecimal(0);
    let peak = cash;
    let drawdownStartedAt: Date | null = null;
    let fillIndex = 0;
    let maximumAbsolute: DrawdownCandidate | null = null;
    let maximumPercentage: DrawdownCandidate | null = null;

    const curve = candles.map((candle) => {
      while (
        fillIndex < fills.length &&
        fills[fillIndex]?.filledAt.getTime() === candle.openTime.getTime()
      ) {
        const fill = fills[fillIndex];
        if (!fill) break;
        if (fill.side === 'buy') {
          cash = cash.minus(fill.totalCost);
          quantity = quantity.plus(fill.quantity);
        } else {
          cash = cash.plus(fill.netProceeds);
          quantity = quantity.minus(fill.quantity);
        }
        fillIndex += 1;
      }

      const markPrice = new EquityDecimal(candle.closePrice);
      const positionNetValue = markPrice
        .times(quantity)
        .times(new EquityDecimal(1).minus(feeRate));
      const equity = cash.plus(positionNetValue);
      if (equity.greaterThanOrEqualTo(peak)) {
        peak = equity;
        drawdownStartedAt = null;
      } else if (!drawdownStartedAt) {
        drawdownStartedAt = candle.closeTime;
      }
      const drawdown = peak.minus(equity);
      const drawdownRate = drawdown.dividedBy(peak);
      const point: BacktestEquityPoint = {
        markedAt: candle.closeTime,
        markPrice: markPrice.toFixed(),
        cashUsdt: cash.toFixed(),
        openQuantityBtc: quantity.toFixed(),
        positionNetValueUsdt: positionNetValue.toFixed(),
        equityUsdt: equity.toFixed(),
        peakEquityUsdt: peak.toFixed(),
        drawdownUsdt: drawdown.toFixed(),
        drawdownRate: drawdownRate.toFixed(),
      };
      if (
        drawdownStartedAt &&
        (!maximumAbsolute ||
          drawdown.greaterThan(maximumAbsolute.point.drawdownUsdt))
      ) {
        maximumAbsolute = { point, peak, startedAt: drawdownStartedAt };
      }
      if (
        drawdownStartedAt &&
        (!maximumPercentage ||
          drawdownRate.greaterThan(maximumPercentage.point.drawdownRate))
      ) {
        maximumPercentage = { point, peak, startedAt: drawdownStartedAt };
      }
      return point;
    });

    return {
      curve,
      maximumAbsoluteDrawdown: this.summary(maximumAbsolute, curve),
      maximumPercentageDrawdown: this.summary(maximumPercentage, curve),
    };
  }

  private summary(
    candidate: DrawdownCandidate | null,
    curve: readonly BacktestEquityPoint[],
  ): BacktestEquityDrawdown {
    if (!candidate) {
      return {
        amountUsdt: '0',
        rate: '0',
        startedAt: null,
        troughAt: null,
        recoveredAt: null,
      };
    }
    const troughIndex = curve.indexOf(candidate.point);
    const recovery = curve
      .slice(troughIndex + 1)
      .find((point) =>
        new EquityDecimal(point.equityUsdt).greaterThanOrEqualTo(
          candidate.peak,
        ),
      );
    return {
      amountUsdt: candidate.point.drawdownUsdt,
      rate: candidate.point.drawdownRate,
      startedAt: candidate.startedAt,
      troughAt: candidate.point.markedAt,
      recoveredAt: recovery?.markedAt ?? null,
    };
  }
}
