import Decimal from 'decimal.js';

const Exact = Decimal.clone({ precision: 100, toExpNeg: -100, toExpPos: 100 });
const AMOUNT = /^(?:0|[1-9]\d{0,29})(?:\.\d{1,18})?$/;

/** All amounts are USDT; proceeds must already reflect adverse spread/slippage. */
export interface EstimatedNetProfitInput {
  investmentUsdt: string;
  expectedExitProceedsUsdt: string;
  entryTradingFeeUsdt: string;
  exitTradingFeeUsdt: string;
  entryGasEstimateUsdt: string;
  exitGasEstimateUsdt: string;
  gasSafetyMultiplier: string;
  observedAt: Date;
  evaluatedAt: Date;
}

/** Estimate-only screening, with no provider, reservation or execution authority. */
export function assessEstimatedNetProfit(input: EstimatedNetProfitInput) {
  const blocked = (reason: string) => ({
    status: 'blocked' as const,
    reason,
    submissionAuthorized: false as const,
    riskApproved: false as const,
  });
  const amounts = [
    input.investmentUsdt,
    input.expectedExitProceedsUsdt,
    input.entryTradingFeeUsdt,
    input.exitTradingFeeUsdt,
    input.entryGasEstimateUsdt,
    input.exitGasEstimateUsdt,
    input.gasSafetyMultiplier,
  ];
  if (amounts.some((value) => typeof value !== 'string' || !AMOUNT.test(value)))
    return blocked('invalid_profitability_input');
  if (
    !(input.observedAt instanceof Date) ||
    !(input.evaluatedAt instanceof Date) ||
    !Number.isFinite(input.observedAt.getTime()) ||
    !Number.isFinite(input.evaluatedAt.getTime()) ||
    input.observedAt > input.evaluatedAt ||
    input.evaluatedAt.getTime() - input.observedAt.getTime() > 5000
  )
    return blocked('stale_or_invalid_profitability_evidence');
  const investment = new Exact(input.investmentUsdt);
  const entryGas = new Exact(input.entryGasEstimateUsdt);
  const exitGas = new Exact(input.exitGasEstimateUsdt);
  const multiplier = new Exact(input.gasSafetyMultiplier);
  if (
    investment.isZero() ||
    entryGas.isZero() ||
    exitGas.isZero() ||
    multiplier.lte(1) ||
    multiplier.gt(10)
  )
    return blocked('positive_gas_estimates_and_safety_margin_required');
  const gas = entryGas
    .plus(exitGas)
    .times(multiplier)
    .toDecimalPlaces(18, Decimal.ROUND_UP);
  const fees = new Exact(input.entryTradingFeeUsdt).plus(
    input.exitTradingFeeUsdt,
  );
  const net = new Exact(input.expectedExitProceedsUsdt)
    .minus(investment)
    .minus(fees)
    .minus(gas);
  return {
    status: net.gt(0)
      ? ('positive_expected_net_profit' as const)
      : ('blocked' as const),
    reason: net.gt(0) ? null : 'non_positive_expected_net_profit',
    investmentUsdt: investment.toFixed(),
    bufferedGasUsdt: gas.toFixed(),
    gasPercentageOfInvestment: gas
      .div(investment)
      .times(100)
      .toDecimalPlaces(18, Decimal.ROUND_UP)
      .toFixed(),
    expectedNetProfitUsdt: net.toFixed(),
    expectedNetReturnPercentage: net
      .div(investment)
      .times(100)
      .toDecimalPlaces(18, Decimal.ROUND_FLOOR)
      .toFixed(),
    costBasis: 'estimated_round_trip_with_gas_margin' as const,
    guaranteedGasCeiling: false as const,
    submissionAuthorized: false as const,
    riskApproved: false as const,
  };
}
