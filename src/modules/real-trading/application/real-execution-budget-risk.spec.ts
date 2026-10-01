import {
  RealExecutionAsset,
  RealExecutionIntent,
  RealExecutionQuote,
} from '../domain/real-execution';
import {
  assessRealExecutionBudgetRisk,
  RealExecutionBudgetRiskBlocker,
  RealExecutionBudgetSnapshot,
} from './real-execution-budget-risk';
import { RealExecutionLocalRiskLimits } from './real-execution-local-risk-limits';

const EVALUATED_AT = new Date('2026-10-01T14:00:02.000Z');
const BTCB: RealExecutionAsset = {
  tokenAddress: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
  symbol: 'BTCB',
};
const USDT: RealExecutionAsset = {
  tokenAddress: '0x55d398326f99059ff775485246999027b3197955',
  symbol: 'USDT',
};

describe('assessRealExecutionBudgetRisk', () => {
  it('derives a conservative exact quote charge and projected daily spend without authorization', () => {
    expect(
      assessRealExecutionBudgetRisk(
        intent(),
        quote(),
        limits(),
        snapshot(),
        5000,
        EVALUATED_AT,
      ),
    ).toEqual({
      scope: 'real_execution_budget_risk',
      status: 'within_budget_limits',
      blockers: [],
      quoteRiskStatus: 'within_quote_limits',
      currentDailySpendUsdt: '3',
      quoteBudgetChargeUsdt: '5.11',
      projectedDailySpendUsdt: '8.11',
      bankrollValueUsdt: '8',
      durableSpendEnforcement: false,
      sourceBalanceEvaluated: false,
      nativeGasBalanceEvaluated: false,
      riskApproved: false,
      fundingAuthorized: false,
      quoteAuthorized: false,
      submissionAuthorized: false,
      evaluatedAt: EVALUATED_AT,
    });
  });

  it('accepts exact daily-spend, bankroll, and available-value boundaries', () => {
    const valueSnapshot = snapshot({
      settledSpendUsdt: '0',
      reservedSpendUsdt: '0',
      bankrollValueUsdt: '5.11',
    });

    expect(
      assessmentBlockers(
        limits({
          maximumOrderNotionalUsdt: '5',
          maximumDailySpendUsdt: '5.11',
          maximumBankrollUsdt: '5.11',
        }),
        valueSnapshot,
      ),
    ).toEqual([]);
  });

  it('requires complete spend and bankroll coverage', () => {
    expect(
      assessmentBlockers(
        limits(),
        snapshot({
          spendCoverage: 'partial',
          bankrollCoverage: 'partial',
        }),
      ),
    ).toEqual(['spend_coverage_incomplete', 'bankroll_coverage_incomplete']);
  });

  it('rejects divergent identity, UTC day, and freshness facts', () => {
    expect(
      assessmentBlockers(
        limits(),
        snapshot({
          providerId: 'other_provider',
          chainId: '1',
          utcDay: '2026-09-30',
          observedAt: new Date('2026-10-01T13:59:56.999Z'),
        }),
      ),
    ).toEqual([
      'budget_provider_mismatch',
      'budget_chain_mismatch',
      'budget_day_mismatch',
      'budget_snapshot_stale',
    ]);

    expect(
      assessmentBlockers(
        limits(),
        snapshot({ observedAt: new Date('2026-10-01T14:00:02.001Z') }),
      ),
    ).toContain('budget_snapshot_from_future');
  });

  it('enforces projected daily spend, bankroll cap, and aggregate quote capacity independently', () => {
    expect(
      assessmentBlockers(
        limits({ maximumDailySpendUsdt: '8.109999999999999999' }),
        snapshot(),
      ),
    ).toContain('daily_spend_exceeds_limit');

    expect(
      assessmentBlockers(
        limits({ maximumBankrollUsdt: '10' }),
        snapshot({ bankrollValueUsdt: '10.000000000000000001' }),
      ),
    ).toContain('bankroll_exceeds_limit');

    expect(
      assessmentBlockers(
        limits(),
        snapshot({ bankrollValueUsdt: '5.109999999999999999' }),
      ),
    ).toContain('quote_charge_exceeds_bankroll');
  });

  it('fails closed when the quote-level assessment is blocked', () => {
    const result = assessRealExecutionBudgetRisk(
      intent(),
      quote({ costCoverage: 'partial', costs: [] }),
      limits(),
      snapshot(),
      5000,
      EVALUATED_AT,
    );

    expect(result).toMatchObject({
      status: 'blocked',
      blockers: ['quote_risk_blocked'],
      quoteRiskStatus: 'blocked',
      quoteBudgetChargeUsdt: null,
      projectedDailySpendUsdt: null,
      riskApproved: false,
    });
  });

  it('does not perform budget arithmetic with malformed local limits', () => {
    expect(() =>
      assessRealExecutionBudgetRisk(
        intent(),
        quote(),
        limits({ maximumDailySpendUsdt: 'invalid' }),
        snapshot(),
        5000,
        EVALUATED_AT,
      ),
    ).not.toThrow();
    expect(
      assessmentBlockers(
        limits({ maximumDailySpendUsdt: 'invalid' }),
        snapshot(),
      ),
    ).toEqual(['quote_risk_blocked']);
  });

  it('rejects malformed snapshots without performing decimal arithmetic', () => {
    expect(
      assessmentBlockers(
        limits(),
        snapshot({ utcDay: '2026-02-30', settledSpendUsdt: '01' }),
      ),
    ).toEqual(['invalid_budget_snapshot']);
  });

  it('bounds snapshot freshness policy and validates evaluation time', () => {
    expect(() =>
      assessRealExecutionBudgetRisk(
        intent(),
        quote(),
        limits(),
        snapshot(),
        60_001,
        EVALUATED_AT,
      ),
    ).toThrow('maximum age must be between 1 and 60000 ms');
    expect(() =>
      assessRealExecutionBudgetRisk(
        intent(),
        quote(),
        limits(),
        snapshot(),
        5000,
        new Date('invalid'),
      ),
    ).toThrow('budget risk evaluation time must be valid');
  });
});

function assessmentBlockers(
  valueLimits: RealExecutionLocalRiskLimits,
  valueSnapshot: RealExecutionBudgetSnapshot,
): readonly RealExecutionBudgetRiskBlocker[] {
  return assessRealExecutionBudgetRisk(
    intent(),
    quote(),
    valueLimits,
    valueSnapshot,
    5000,
    EVALUATED_AT,
  ).blockers;
}

function snapshot(
  overrides: Partial<RealExecutionBudgetSnapshot> = {},
): RealExecutionBudgetSnapshot {
  return {
    providerId: 'agentic_wallet',
    chainId: '56',
    utcDay: '2026-10-01',
    settledSpendUsdt: '2',
    reservedSpendUsdt: '1',
    spendCoverage: 'complete',
    bankrollValueUsdt: '8',
    bankrollCoverage: 'complete',
    observedAt: new Date('2026-10-01T14:00:00.000Z'),
    ...overrides,
  };
}

function intent(
  overrides: Partial<RealExecutionIntent> = {},
): RealExecutionIntent {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    idempotencyKey: 'budget-risk-1',
    kind: 'market_swap',
    chainId: '56',
    sourceAsset: USDT,
    targetAsset: BTCB,
    sourceQuantity: '5',
    maxSlippageRate: '0.005',
    createdAt: new Date('2026-10-01T13:59:59.000Z'),
    ...overrides,
  };
}

function quote(
  overrides: Partial<RealExecutionQuote> = {},
): RealExecutionQuote {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    providerId: 'agentic_wallet',
    providerQuoteId: null,
    intent: intent(),
    expectedTargetQuantity: '0.000062',
    minimumTargetQuantity: '0.00006169',
    costs: [
      { kind: 'provider_fee', asset: USDT, quantity: '0.01' },
      { kind: 'network_fee', asset: USDT, quantity: '0.1' },
    ],
    costCoverage: 'complete',
    quotedAt: new Date('2026-10-01T14:00:01.000Z'),
    expiresAt: new Date('2026-10-01T14:00:06.000Z'),
    executable: false,
    ...overrides,
  };
}

function limits(
  overrides: Partial<RealExecutionLocalRiskLimits> = {},
): RealExecutionLocalRiskLimits {
  return {
    maximumOrderNotionalUsdt: '8',
    maximumDailySpendUsdt: '10',
    maximumBankrollUsdt: '25',
    maximumProviderFeeRate: '0.01',
    maximumNetworkFeeUsdt: '0.5',
    maximumSlippageRate: '0.005',
    ...overrides,
  };
}
