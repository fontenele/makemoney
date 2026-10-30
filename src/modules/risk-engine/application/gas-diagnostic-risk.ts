import Decimal from 'decimal.js';

const D = Decimal.clone({ precision: 80, toExpNeg: -80, toExpPos: 80 });
const Q = /^(?:0|[1-9]\d{0,19})(?:\.\d{1,30})?$/;

export interface GasDiagnosticRiskInput {
  sourceUsdt: string;
  availableUsdt: string;
  availableBnb: string;
  bnbUsdt: string;
  walletValueUsdt: string;
  maximumOrderUsdt: string;
  maximumDailySpendUsdt: string;
  networkBudgetUsdt: string;
  maximumBankrollUsdt: string;
  maximumDailyLossUsdt: string;
  quotaUsedUsd: string;
  quotaRemainingUsd: string;
  emergencyStop: boolean;
  restrictiveWallet: boolean;
}

/** One diagnostic only. No claimed precision for unknown network fees. */
export function assessGasDiagnosticRisk(input: GasDiagnosticRiskInput) {
  const numbers = [
    input.sourceUsdt,
    input.availableUsdt,
    input.availableBnb,
    input.bnbUsdt,
    input.walletValueUsdt,
    input.maximumOrderUsdt,
    input.maximumDailySpendUsdt,
    input.networkBudgetUsdt,
    input.maximumBankrollUsdt,
    input.maximumDailyLossUsdt,
    input.quotaUsedUsd,
    input.quotaRemainingUsd,
  ];
  if (numbers.some((value) => typeof value !== 'string' || !Q.test(value)))
    return {
      decision: 'rejected' as const,
      blockers: ['invalid_diagnostic_risk_input'],
      maximumPotentialLossUsdt: null,
    };
  const blockers: string[] = [];
  if (
    !new D(input.networkBudgetUsdt).gt(0) ||
    new D(input.networkBudgetUsdt).plus(1).gt(input.maximumDailySpendUsdt)
  )
    blockers.push('diagnostic_network_budget_exceeds_daily_spend');
  if (input.emergencyStop) blockers.push('emergency_stop_active');
  if (!input.restrictiveWallet) blockers.push('wallet_security_blocked');
  if (
    input.sourceUsdt !== '1' ||
    new D(input.maximumOrderUsdt).lt(1) ||
    new D(input.maximumDailySpendUsdt).lt(1)
  )
    blockers.push('diagnostic_amount_outside_limits');
  if (
    new D(input.availableUsdt).lt(1) ||
    !new D(input.availableBnb).gt(0) ||
    !new D(input.bnbUsdt).gt(0)
  )
    blockers.push('diagnostic_funding_insufficient');
  if (new D(input.walletValueUsdt).gt(input.maximumBankrollUsdt))
    blockers.push('bankroll_limit_exceeded');
  if (
    !new D(input.quotaUsedUsd).isZero() ||
    new D(input.quotaRemainingUsd).lt(2)
  )
    blockers.push('fresh_unused_provider_quota_required');
  // A deliberately conservative current-value loss envelope: the USDT input
  // plus ALL currently available BNB, not an invented precise gas estimate.
  const loss = new D(input.availableBnb).times(input.bnbUsdt).plus(1);
  if (loss.gt(input.maximumDailyLossUsdt))
    blockers.push('diagnostic_loss_envelope_exceeds_limit');
  return {
    decision: blockers.length ? ('rejected' as const) : ('approved' as const),
    blockers,
    maximumPotentialLossUsdt: loss
      .toDecimalPlaces(18, Decimal.ROUND_UP)
      .toFixed(),
  };
}
