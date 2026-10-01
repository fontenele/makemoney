import Decimal from 'decimal.js';

const ExactDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});
const POSITIVE_DECIMAL_PATTERN = /^(?:[1-9]\d*(?:\.\d+)?|0\.\d*[1-9]\d*)$/;
const RATE_PATTERN = /^(?:0|0\.\d*[1-9]\d*|1(?:\.0+)?)$/;

export interface RealExecutionLocalRiskLimits {
  readonly maximumOrderNotionalUsdt: string | null;
  readonly maximumDailySpendUsdt: string | null;
  readonly maximumBankrollUsdt: string | null;
  readonly maximumProviderFeeRate: string | null;
  readonly maximumNetworkFeeUsdt: string | null;
  readonly maximumSlippageRate: string | null;
}

export type RealExecutionLocalRiskLimitBlocker =
  | 'maximum_order_notional_unconfigured'
  | 'maximum_daily_spend_unconfigured'
  | 'maximum_bankroll_unconfigured'
  | 'maximum_provider_fee_rate_unconfigured'
  | 'maximum_network_fee_unconfigured'
  | 'maximum_slippage_rate_unconfigured'
  | 'invalid_limit'
  | 'order_notional_exceeds_daily_spend'
  | 'daily_spend_exceeds_bankroll';

export interface RealExecutionLocalRiskLimitAssessment {
  readonly scope: 'real_execution_local_risk_limits';
  readonly status: 'defined' | 'blocked';
  readonly blockers: readonly RealExecutionLocalRiskLimitBlocker[];
  readonly limits: RealExecutionLocalRiskLimits;
  readonly providerDailyLimitUsed: false;
  readonly fundingAuthorized: false;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
}

export function assessRealExecutionLocalRiskLimits(
  limits: RealExecutionLocalRiskLimits,
): RealExecutionLocalRiskLimitAssessment {
  const blockers: RealExecutionLocalRiskLimitBlocker[] = [];
  addMissingBlockers(limits, blockers);

  if (!validLimits(limits)) {
    blockers.push('invalid_limit');
  } else if (allLimitsDefined(limits)) {
    const order = new ExactDecimal(limits.maximumOrderNotionalUsdt);
    const daily = new ExactDecimal(limits.maximumDailySpendUsdt);
    const bankroll = new ExactDecimal(limits.maximumBankrollUsdt);
    addIf(
      blockers,
      order.greaterThan(daily),
      'order_notional_exceeds_daily_spend',
    );
    addIf(
      blockers,
      daily.greaterThan(bankroll),
      'daily_spend_exceeds_bankroll',
    );
  }

  return {
    scope: 'real_execution_local_risk_limits',
    status: blockers.length === 0 ? 'defined' : 'blocked',
    blockers,
    limits: { ...limits },
    providerDailyLimitUsed: false,
    fundingAuthorized: false,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
}

function addMissingBlockers(
  limits: RealExecutionLocalRiskLimits,
  blockers: RealExecutionLocalRiskLimitBlocker[],
): void {
  addIf(
    blockers,
    limits.maximumOrderNotionalUsdt === null,
    'maximum_order_notional_unconfigured',
  );
  addIf(
    blockers,
    limits.maximumDailySpendUsdt === null,
    'maximum_daily_spend_unconfigured',
  );
  addIf(
    blockers,
    limits.maximumBankrollUsdt === null,
    'maximum_bankroll_unconfigured',
  );
  addIf(
    blockers,
    limits.maximumProviderFeeRate === null,
    'maximum_provider_fee_rate_unconfigured',
  );
  addIf(
    blockers,
    limits.maximumNetworkFeeUsdt === null,
    'maximum_network_fee_unconfigured',
  );
  addIf(
    blockers,
    limits.maximumSlippageRate === null,
    'maximum_slippage_rate_unconfigured',
  );
}

function validLimits(limits: RealExecutionLocalRiskLimits): boolean {
  return (
    nullableMatches(
      limits.maximumOrderNotionalUsdt,
      POSITIVE_DECIMAL_PATTERN,
    ) &&
    nullableMatches(limits.maximumDailySpendUsdt, POSITIVE_DECIMAL_PATTERN) &&
    nullableMatches(limits.maximumBankrollUsdt, POSITIVE_DECIMAL_PATTERN) &&
    nullableMatches(limits.maximumProviderFeeRate, RATE_PATTERN) &&
    nullableMatches(limits.maximumNetworkFeeUsdt, POSITIVE_DECIMAL_PATTERN) &&
    nullableMatches(limits.maximumSlippageRate, RATE_PATTERN)
  );
}

function allLimitsDefined(limits: RealExecutionLocalRiskLimits): limits is {
  readonly [Key in keyof RealExecutionLocalRiskLimits]: string;
} {
  return Object.values(limits).every((value) => value !== null);
}

function nullableMatches(value: string | null, pattern: RegExp): boolean {
  return value === null || (typeof value === 'string' && pattern.test(value));
}

function addIf(
  blockers: RealExecutionLocalRiskLimitBlocker[],
  condition: boolean,
  blocker: RealExecutionLocalRiskLimitBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
