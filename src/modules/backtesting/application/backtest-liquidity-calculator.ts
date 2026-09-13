import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { BacktestLiquidityAssessment } from '../domain/backtest-liquidity';
import { HistoricalCandle } from '../domain/historical-candle';

const LiquidityDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});

@Injectable()
export class BacktestLiquidityCalculator {
  calculate(
    quantityValue: string,
    referenceCandle: HistoricalCandle,
    maximumParticipationRateValue: string,
  ): BacktestLiquidityAssessment {
    const quantity = new LiquidityDecimal(quantityValue);
    const referenceBaseVolume = new LiquidityDecimal(
      referenceCandle.baseVolume,
    );
    const maximumFillQuantity = referenceBaseVolume.times(
      maximumParticipationRateValue,
    );

    return {
      referenceCandleCloseTime: referenceCandle.closeTime,
      referenceBaseVolume: referenceBaseVolume.toFixed(),
      maximumFillQuantity: maximumFillQuantity.toFixed(),
      permitted: quantity.lessThanOrEqualTo(maximumFillQuantity),
    };
  }
}
