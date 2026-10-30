import Decimal from 'decimal.js';
import { AgenticWalletMarketFeeEvidence } from '../infrastructure/agentic-wallet-market-fee-evidence.adapter';
import { RealExecutionLocalRiskLimits } from './real-execution-local-risk-limits';

const ExactDecimal = Decimal.clone({
  precision: 80,
  rounding: Decimal.ROUND_UP,
  toExpNeg: -80,
  toExpPos: 80,
});
const POSITIVE = /^(?:[1-9]\d{0,29}(?:\.\d{1,30})?|0\.\d{0,29}[1-9]\d{0,29})$/;

export interface ExplicitMarketUsdValuation {
  readonly usdtUsd: string;
  readonly bnbUsd: string;
  readonly observedAt: Date;
  readonly source: string;
}

export class InvalidMarketCostAnalysisRequestError extends Error {}

export function validMarketUsdValuation(
  valuation: ExplicitMarketUsdValuation,
  at: Date,
): boolean {
  return (
    valuation !== null &&
    typeof valuation === 'object' &&
    typeof valuation.usdtUsd === 'string' &&
    valuation.usdtUsd.length <= 61 &&
    POSITIVE.test(valuation.usdtUsd) &&
    typeof valuation.bnbUsd === 'string' &&
    valuation.bnbUsd.length <= 61 &&
    POSITIVE.test(valuation.bnbUsd) &&
    typeof valuation.source === 'string' &&
    /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,127}$/.test(valuation.source) &&
    valuation.observedAt instanceof Date &&
    Number.isFinite(valuation.observedAt.getTime()) &&
    at instanceof Date &&
    Number.isFinite(at.getTime()) &&
    valuation.observedAt <= at &&
    at.getTime() - valuation.observedAt.getTime() <= 60000
  );
}

/** Display estimates only: an external valuation never authenticates a token debit. */
export function analyzeMarketCostEstimates(
  fees: AgenticWalletMarketFeeEvidence,
  valuation: ExplicitMarketUsdValuation,
  limits: RealExecutionLocalRiskLimits,
  evaluatedAt: Date,
) {
  if (!validMarketUsdValuation(valuation, evaluatedAt))
    throw new InvalidMarketCostAnalysisRequestError(
      'Explicit USD valuation is invalid or older than 60 seconds',
    );
  if (
    fees.coverage !== 'provider_display_estimate' ||
    !(fees.observedAt instanceof Date) ||
    !Number.isFinite(fees.observedAt.getTime()) ||
    fees.observedAt > evaluatedAt ||
    evaluatedAt.getTime() - fees.observedAt.getTime() > 5000
  )
    throw new InvalidMarketCostAnalysisRequestError(
      'Market fee evidence is stale or invalid',
    );
  for (const quantity of [
    fees.providerFeeRate,
    fees.providerFeeUsd,
    fees.estimatedNetworkFeeUsd,
    fees.sourceQuantity,
  ]) {
    if (
      typeof quantity !== 'string' ||
      quantity.length > 61 ||
      !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(quantity)
    )
      throw new InvalidMarketCostAnalysisRequestError(
        'Market fee quantity is invalid',
      );
  }
  const fee = new ExactDecimal(fees.providerFeeUsd);
  const gas = new ExactDecimal(fees.estimatedNetworkFeeUsd);
  const feeUsdt = fee
    .div(valuation.usdtUsd)
    .toDecimalPlaces(18, Decimal.ROUND_UP)
    .toFixed();
  const networkUsdt = gas
    .div(valuation.usdtUsd)
    .toDecimalPlaces(18, Decimal.ROUND_UP)
    .toFixed();
  const gasBnb = gas.isZero()
    ? null
    : gas.div(valuation.bnbUsd).toDecimalPlaces(18, Decimal.ROUND_UP).toFixed();
  const limitBlockers: string[] = [];
  if (
    limits.maximumProviderFeeRate === null ||
    limits.maximumNetworkFeeUsdt === null
  )
    limitBlockers.push('fee_limits_unconfigured');
  else {
    if (
      new ExactDecimal(fees.providerFeeRate).greaterThan(
        limits.maximumProviderFeeRate,
      )
    )
      limitBlockers.push('provider_fee_rate_exceeds_limit');
    if (new ExactDecimal(networkUsdt).greaterThan(limits.maximumNetworkFeeUsdt))
      limitBlockers.push('network_fee_estimate_exceeds_limit');
  }
  if (new ExactDecimal(fees.providerFeeRate).isZero() !== fee.isZero())
    limitBlockers.push('provider_fee_display_inconsistent');
  return {
    scope: 'agentic_wallet_market_cost_estimate_analysis' as const,
    status: limitBlockers.length
      ? ('estimate_limits_blocked' as const)
      : ('estimate_limits_satisfied' as const),
    limitBlockers,
    providerFeeUsd: fee.toFixed(),
    estimatedNetworkFeeUsd: gas.toFixed(),
    displayedTotalCostUsd: fee.plus(gas).toFixed(),
    estimatedProviderFeeUsdt: feeUsdt,
    estimatedNetworkFeeUsdt: networkUsdt,
    estimatedNativeGasBnb: gasBnb,
    nativeGasQuantityVerified: false,
    zeroGasDisplayProvesFreeTransaction: false,
    usdtUsdParityAssumed: false,
    valuation: { ...valuation, observedAt: new Date(valuation.observedAt) },
    valuationAuthenticated: false,
    valuationBasis: 'explicit_external_usd_values' as const,
    providerFeeTokenDebitVerified: false,
    exactCostCoverageComplete: false,
    riskApproved: false,
    reservationCreated: false,
    submissionAuthorized: false,
    evaluatedAt: new Date(evaluatedAt),
  };
}
