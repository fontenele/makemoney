import {
  RealExecutionAsset,
  RealExecutionIntent,
  RealExecutionQuote,
} from '../domain/real-execution';
import { RealExecutionBudgetSnapshot } from './real-execution-budget-risk';
import { RealExecutionLocalRiskLimits } from './real-execution-local-risk-limits';
import {
  assessRealExecutionResourceRisk,
  RealExecutionResourceRiskBlocker,
  RealExecutionResourceSnapshot,
} from './real-execution-resource-risk';

const EVALUATED_AT = new Date('2026-10-01T14:00:02.000Z');
const BTCB: RealExecutionAsset = {
  tokenAddress: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
  symbol: 'BTCB',
};
const USDT: RealExecutionAsset = {
  tokenAddress: '0x55d398326f99059ff775485246999027b3197955',
  symbol: 'USDT',
};

describe('assessRealExecutionResourceRisk', () => {
  it('proves exact source and native gas sufficiency without authorizing anything', () => {
    expect(assessment()).toEqual({
      scope: 'real_execution_resource_risk',
      status: 'resources_sufficient',
      blockers: [],
      budgetRiskStatus: 'within_budget_limits',
      requiredSourceQuantity: '5.01',
      availableSourceQuantity: '6',
      requiredNativeGasQuantity: '0.0002',
      availableNativeGasQuantity: '0.001',
      sourceBalanceSufficient: true,
      nativeGasBalanceSufficient: true,
      providerQuotaEvaluated: false,
      durableResourceReservation: false,
      riskApproved: false,
      fundingAuthorized: false,
      quoteAuthorized: false,
      submissionAuthorized: false,
      evaluatedAt: EVALUATED_AT,
    });
  });

  it('accepts exact source and gas balance boundaries', () => {
    expect(
      blockers(
        resourceSnapshot({
          sourceAvailableQuantity: '5.01',
          nativeGasAvailableQuantity: '0.0002',
        }),
      ),
    ).toEqual([]);
  });

  it('adds source-denominated provider fees for the approved sell direction', () => {
    const sellIntent = intent({
      sourceAsset: BTCB,
      targetAsset: USDT,
      sourceQuantity: '0.0001',
    });
    const sellQuote = quote({
      intent: sellIntent,
      expectedTargetQuantity: '8',
      minimumTargetQuantity: '7.96',
      costs: [
        { kind: 'provider_fee', asset: BTCB, quantity: '0.0000001' },
        { kind: 'network_fee', asset: USDT, quantity: '0.1' },
      ],
    });
    const result = assessment(
      sellIntent,
      sellQuote,
      resourceSnapshot({
        sourceTokenAddress: BTCB.tokenAddress,
        sourceSymbol: 'BTCB',
        sourceAvailableQuantity: '0.0001001',
      }),
    );

    expect(result).toMatchObject({
      status: 'resources_sufficient',
      requiredSourceQuantity: '0.0001001',
      sourceBalanceSufficient: true,
    });
  });

  it('requires complete source-balance and native-gas coverage', () => {
    expect(
      blockers(
        resourceSnapshot({
          sourceBalanceCoverage: 'partial',
          nativeGasCoverage: 'partial',
        }),
      ),
    ).toEqual([
      'source_balance_coverage_incomplete',
      'native_gas_coverage_incomplete',
    ]);
  });

  it('rejects every divergent resource identity independently', () => {
    expect(
      blockers(
        resourceSnapshot({
          providerId: 'other_provider',
          chainId: '1',
          intentId: '33333333-3333-4333-8333-333333333333',
          quoteId: '44444444-4444-4444-8444-444444444444',
          sourceTokenAddress: BTCB.tokenAddress,
          sourceSymbol: 'BTCB',
          nativeGasSymbol: 'ETH',
        }),
      ),
    ).toEqual([
      'resource_provider_mismatch',
      'resource_chain_mismatch',
      'resource_intent_mismatch',
      'resource_quote_mismatch',
      'source_token_mismatch',
      'source_symbol_mismatch',
      'native_gas_asset_mismatch',
    ]);
  });

  it('rejects future or stale resource observations', () => {
    expect(
      blockers(
        resourceSnapshot({
          observedAt: new Date('2026-10-01T14:00:02.001Z'),
        }),
      ),
    ).toContain('resource_snapshot_from_future');
    expect(
      blockers(
        resourceSnapshot({
          observedAt: new Date('2026-10-01T13:59:56.999Z'),
        }),
      ),
    ).toContain('resource_snapshot_stale');
  });

  it('reports insufficient source and native gas balances independently', () => {
    expect(
      blockers(
        resourceSnapshot({
          sourceAvailableQuantity: '5.009999999999999999',
          nativeGasAvailableQuantity: '0.000199999999999999',
        }),
      ),
    ).toEqual([
      'source_balance_insufficient',
      'native_gas_balance_insufficient',
    ]);
  });

  it('fails closed before resource arithmetic when the budget assessment is blocked', () => {
    const result = assessment(
      intent(),
      quote({ costCoverage: 'partial', costs: [] }),
      resourceSnapshot(),
    );

    expect(result).toMatchObject({
      status: 'blocked',
      blockers: ['budget_risk_blocked'],
      budgetRiskStatus: 'blocked',
      requiredSourceQuantity: null,
      sourceBalanceSufficient: null,
      riskApproved: false,
    });
  });

  it('rejects malformed resource facts and freshness policies', () => {
    expect(
      blockers(
        resourceSnapshot({
          sourceAvailableQuantity: '01',
          nativeGasRequiredQuantity: '0',
        }),
      ),
    ).toEqual(['invalid_resource_snapshot']);
    expect(() =>
      assessRealExecutionResourceRisk(
        intent(),
        quote(),
        limits(),
        budgetSnapshot(),
        resourceSnapshot(),
        { budgetSnapshotMaxAgeMs: 5000, resourceSnapshotMaxAgeMs: 60_001 },
        EVALUATED_AT,
      ),
    ).toThrow('maximum ages must be between 1 and 60000 ms');
    expect(() =>
      assessRealExecutionResourceRisk(
        intent(),
        quote(),
        limits(),
        budgetSnapshot(),
        resourceSnapshot(),
        { budgetSnapshotMaxAgeMs: 5000, resourceSnapshotMaxAgeMs: 5000 },
        new Date('invalid'),
      ),
    ).toThrow('resource risk evaluation time must be valid');
  });
});

function blockers(
  snapshot: RealExecutionResourceSnapshot,
): readonly RealExecutionResourceRiskBlocker[] {
  return assessment(intent(), quote(), snapshot).blockers;
}

function assessment(
  valueIntent = intent(),
  valueQuote = quote(),
  valueResourceSnapshot = resourceSnapshot(),
) {
  return assessRealExecutionResourceRisk(
    valueIntent,
    valueQuote,
    limits(),
    budgetSnapshot(),
    valueResourceSnapshot,
    { budgetSnapshotMaxAgeMs: 5000, resourceSnapshotMaxAgeMs: 5000 },
    EVALUATED_AT,
  );
}

function resourceSnapshot(
  overrides: Partial<RealExecutionResourceSnapshot> = {},
): RealExecutionResourceSnapshot {
  return {
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: '11111111-1111-4111-8111-111111111111',
    quoteId: '22222222-2222-4222-8222-222222222222',
    sourceTokenAddress: USDT.tokenAddress,
    sourceSymbol: 'USDT',
    sourceAvailableQuantity: '6',
    sourceBalanceCoverage: 'complete',
    nativeGasSymbol: 'BNB',
    nativeGasAvailableQuantity: '0.001',
    nativeGasRequiredQuantity: '0.0002',
    nativeGasCoverage: 'complete',
    observedAt: new Date('2026-10-01T14:00:00.000Z'),
    ...overrides,
  };
}

function budgetSnapshot(): RealExecutionBudgetSnapshot {
  return {
    providerId: 'agentic_wallet',
    chainId: '56',
    utcDay: '2026-10-01',
    settledSpendUsdt: '2',
    reservedSpendUsdt: '1',
    spendCoverage: 'complete',
    bankrollValueUsdt: '12',
    bankrollCoverage: 'complete',
    observedAt: new Date('2026-10-01T14:00:00.000Z'),
  };
}

function intent(
  overrides: Partial<RealExecutionIntent> = {},
): RealExecutionIntent {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    idempotencyKey: 'resource-risk-1',
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

function limits(): RealExecutionLocalRiskLimits {
  return {
    maximumOrderNotionalUsdt: '8',
    maximumDailySpendUsdt: '20',
    maximumBankrollUsdt: '25',
    maximumProviderFeeRate: '0.01',
    maximumNetworkFeeUsdt: '0.5',
    maximumSlippageRate: '0.005',
  };
}
