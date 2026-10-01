import {
  assessRealExecutionLocalRiskLimits,
  RealExecutionLocalRiskLimits,
} from './real-execution-local-risk-limits';

describe('assessRealExecutionLocalRiskLimits', () => {
  it('accepts a coherent complete envelope without authorizing financial behavior', () => {
    expect(assessRealExecutionLocalRiskLimits(limits())).toEqual({
      scope: 'real_execution_local_risk_limits',
      status: 'defined',
      blockers: [],
      limits: limits(),
      providerDailyLimitUsed: false,
      fundingAuthorized: false,
      quoteAuthorized: false,
      submissionAuthorized: false,
    });
  });

  it('reports every absent independent limit', () => {
    expect(
      assessRealExecutionLocalRiskLimits({
        maximumOrderNotionalUsdt: null,
        maximumDailySpendUsdt: null,
        maximumBankrollUsdt: null,
        maximumProviderFeeRate: null,
        maximumNetworkFeeUsdt: null,
        maximumSlippageRate: null,
      }).blockers,
    ).toEqual([
      'maximum_order_notional_unconfigured',
      'maximum_daily_spend_unconfigured',
      'maximum_bankroll_unconfigured',
      'maximum_provider_fee_rate_unconfigured',
      'maximum_network_fee_unconfigured',
      'maximum_slippage_rate_unconfigured',
    ]);
  });

  it('rejects malformed and out-of-range exact decimals', () => {
    expect(
      assessRealExecutionLocalRiskLimits(
        limits({ maximumSlippageRate: '1.01' }),
      ).blockers,
    ).toEqual(['invalid_limit']);
    expect(
      assessRealExecutionLocalRiskLimits(limits({ maximumNetworkFeeUsdt: '0' }))
        .blockers,
    ).toEqual(['invalid_limit']);
    expect(
      assessRealExecutionLocalRiskLimits(
        limits({ maximumOrderNotionalUsdt: '01' }),
      ).blockers,
    ).toEqual(['invalid_limit']);
  });

  it('requires exact order, daily-spend, and bankroll containment', () => {
    expect(
      assessRealExecutionLocalRiskLimits(
        limits({
          maximumOrderNotionalUsdt: '11',
          maximumDailySpendUsdt: '10',
          maximumBankrollUsdt: '9',
        }),
      ).blockers,
    ).toEqual([
      'order_notional_exceeds_daily_spend',
      'daily_spend_exceeds_bankroll',
    ]);
  });
});

function limits(
  overrides: Partial<RealExecutionLocalRiskLimits> = {},
): RealExecutionLocalRiskLimits {
  return {
    maximumOrderNotionalUsdt: '5',
    maximumDailySpendUsdt: '10',
    maximumBankrollUsdt: '25',
    maximumProviderFeeRate: '0.01',
    maximumNetworkFeeUsdt: '1',
    maximumSlippageRate: '0.005',
    ...overrides,
  };
}
