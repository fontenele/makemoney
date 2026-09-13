export interface BacktestLiquidityAssessment {
  referenceCandleCloseTime: Date;
  referenceBaseVolume: string;
  maximumFillQuantity: string;
  permitted: boolean;
}
