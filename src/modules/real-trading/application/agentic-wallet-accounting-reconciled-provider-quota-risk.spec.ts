import {
  RealExecutionIntent,
  RealExecutionQuote,
} from '../domain/real-execution';
import { AgenticWalletCapabilityObservation } from '../infrastructure/agentic-wallet-capability.adapter';
import { AgenticWalletAccountingLedgerReconciliation } from '../infrastructure/agentic-wallet-accounting-ledger-reconciliation';
import { prepareAgenticWalletAccountingLedgerReconciliationCommitment } from '../infrastructure/agentic-wallet-accounting-ledger-reconciliation-commitment';
import { assessAgenticWalletAccountingLedgerReconciliationFreshness } from '../infrastructure/agentic-wallet-accounting-ledger-reconciliation-freshness';
import { prepareAgenticWalletAccountingReconciledBalanceSnapshot } from '../infrastructure/agentic-wallet-accounting-reconciled-balance-snapshot';
import { assessAgenticWalletAccountingReconciledProviderQuotaRisk } from './agentic-wallet-accounting-reconciled-provider-quota-risk';
import { assessAgenticWalletAccountingReconciledReservationCapacity } from './agentic-wallet-accounting-reconciled-reservation-capacity';
import { prepareAgenticWalletAccountingReconciledReservationCommand } from './agentic-wallet-accounting-reconciled-reservation-command';
import { planAgenticWalletAccountingReconciledReservation } from './agentic-wallet-accounting-reconciled-reservation-plan';
import { RealExecutionBudgetSnapshot } from './real-execution-budget-risk';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from './real-execution-instrument-approval';
import { RealExecutionLocalRiskLimits } from './real-execution-local-risk-limits';

const INITIALIZATION_ID = '00000000-0000-4000-8000-000000000029';
const RECONCILIATION_ID = '00000000-0000-4000-8000-000000000031';
const INTENT_ID = '00000000-0000-4000-8000-000000000032';
const QUOTE_ID = '00000000-0000-4000-8000-000000000033';
const EVALUATED_AT = new Date('2026-10-16T12:01:30.000Z');
const { usdt, btc } = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;

describe('Agentic Wallet reconciled provider quota risk', () => {
  it('evaluates authenticated balances and quota without granting authority', () => {
    const result = assess();

    expect(result.reconciliationFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(result).toMatchObject({
      scope:
        'agentic_wallet_accounting_reconciled_provider_quota_risk_assessment',
      status: 'provider_quota_sufficient',
      blockers: [],
      resourceSnapshotStatus: 'resource_snapshot_ready',
      providerQuotaSnapshotStatus: 'provider_quota_snapshot_ready',
      reconciliationId: RECONCILIATION_ID,
      providerObservationValidated: true,
      requirementValuationExternallySupplied: true,
      providerQuotaRisk: {
        status: 'provider_quota_sufficient',
        resourceRiskStatus: 'resources_sufficient',
        requiredProviderQuotaUsd: '5.2',
        remainingProviderQuotaUsd: '900',
        providerQuotaSufficient: true,
      },
      usdtUsdParityAssumed: false,
      providerDailyLimitAcceptedAsProjectRiskLimit: false,
      durableResourceReservation: false,
      durableQuotaReservation: false,
      riskApproved: false,
      fundingAuthorized: false,
      quoteAuthorized: false,
      submissionAuthorized: false,
    });
  });

  it('stops before quota projection and risk when reconciled resources are invalid', () => {
    const balances = balanceSnapshot();
    const result = assess({
      balances: { ...balances, quoteAuthorized: true } as typeof balances,
    });

    expect(result).toMatchObject({
      status: 'blocked',
      blockers: ['resource_snapshot_projection_blocked'],
      resourceSnapshotBlockers: ['invalid_reconciled_balance_snapshot'],
      providerQuotaSnapshotStatus: 'not_evaluated',
      providerQuotaSnapshotBlockers: [],
      providerQuotaRisk: null,
      reconciliationId: null,
      providerObservationValidated: false,
    });
  });

  it('stops before quota risk when authenticated quota projection is invalid', () => {
    const result = assess({
      observation: observation({ quota: null }),
    });

    expect(result).toMatchObject({
      status: 'blocked',
      blockers: ['provider_quota_snapshot_projection_blocked'],
      resourceSnapshotStatus: 'resource_snapshot_ready',
      providerQuotaSnapshotStatus: 'blocked',
      providerQuotaSnapshotBlockers: ['provider_quota_unavailable'],
      providerQuotaRisk: null,
      reconciliationId: RECONCILIATION_ID,
      providerObservationValidated: true,
      requirementValuationExternallySupplied: false,
    });
  });

  it('retains both provenances when established risk policy blocks', () => {
    const result = assess({ requiredUsd: '901' });

    expect(result).toMatchObject({
      status: 'blocked',
      blockers: ['provider_quota_risk_blocked'],
      resourceSnapshotStatus: 'resource_snapshot_ready',
      providerQuotaSnapshotStatus: 'provider_quota_snapshot_ready',
      reconciliationId: RECONCILIATION_ID,
      providerQuotaRisk: {
        status: 'blocked',
        blockers: ['provider_quota_insufficient'],
        resourceRiskStatus: 'resources_sufficient',
        providerQuotaSufficient: false,
      },
      riskApproved: false,
      submissionAuthorized: false,
    });
  });

  it('preserves resource blockers from the established nested policy', () => {
    const result = assess({
      budgetSnapshot: budgetSnapshot({ spendCoverage: 'partial' }),
    });

    expect(result).toMatchObject({
      status: 'blocked',
      blockers: ['provider_quota_risk_blocked'],
      providerQuotaRisk: {
        blockers: ['resource_risk_blocked'],
        resourceRiskStatus: 'blocked',
        providerQuotaSufficient: true,
      },
    });
  });
});

describe('Agentic Wallet reconciled reservation plan', () => {
  it('creates an exact inert plan only from both authenticated projections', () => {
    const result = planAssessment();

    expect(result.reconciliationFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(result).toMatchObject({
      scope: 'agentic_wallet_accounting_reconciled_reservation_plan_assessment',
      status: 'reservation_plan_ready',
      blockers: [],
      resourceSnapshotStatus: 'resource_snapshot_ready',
      providerQuotaSnapshotStatus: 'provider_quota_snapshot_ready',
      reconciliationId: RECONCILIATION_ID,
      providerObservationValidated: true,
      requirementValuationExternallySupplied: true,
      reservationPlan: {
        status: 'reservation_plan_ready',
        blockers: [],
        providerQuotaRiskStatus: 'provider_quota_sufficient',
        plan: {
          providerId: 'agentic_wallet',
          chainId: '56',
          intentId: INTENT_ID,
          quoteId: QUOTE_ID,
          idempotencyKey: 'reconciled-provider-quota-risk-1',
          utcDay: '2026-10-16',
          budgetChargeUsdt: '5.11',
          sourceTokenAddress: usdt.tokenAddress,
          sourceSymbol: 'USDT',
          sourceQuantity: '5.01',
          nativeGasSymbol: 'BNB',
          nativeGasQuantity: '0.0002',
          providerQuotaUsd: '5.2',
          expiresAt: new Date('2026-10-16T12:01:35.000Z'),
          plannedAt: EVALUATED_AT,
        },
      },
      usdtUsdParityAssumed: false,
      providerDailyLimitAcceptedAsProjectRiskLimit: false,
      durableReservationCreated: false,
      atomicEnforcement: false,
      riskApproved: false,
      fundingAuthorized: false,
      quoteAuthorized: false,
      submissionAuthorized: false,
    });
  });

  it('stops before quota projection when reconciled resources are invalid', () => {
    const balances = balanceSnapshot();
    const result = planAssessment({
      balances: { ...balances, submissionAuthorized: true } as typeof balances,
    });

    expect(result).toMatchObject({
      status: 'blocked',
      blockers: ['resource_snapshot_projection_blocked'],
      resourceSnapshotBlockers: ['invalid_reconciled_balance_snapshot'],
      providerQuotaSnapshotStatus: 'not_evaluated',
      reservationPlan: null,
      reconciliationId: null,
      durableReservationCreated: false,
    });
  });

  it('stops before planning when provider quota evidence is absent', () => {
    const result = planAssessment({
      observation: observation({ quota: null }),
    });

    expect(result).toMatchObject({
      status: 'blocked',
      blockers: ['provider_quota_snapshot_projection_blocked'],
      resourceSnapshotStatus: 'resource_snapshot_ready',
      providerQuotaSnapshotStatus: 'blocked',
      providerQuotaSnapshotBlockers: ['provider_quota_unavailable'],
      reservationPlan: null,
      reconciliationId: RECONCILIATION_ID,
    });
  });

  it('retains provenance when the established planner blocks', () => {
    const result = planAssessment({ requiredUsd: '901' });

    expect(result).toMatchObject({
      status: 'blocked',
      blockers: ['reservation_plan_blocked'],
      resourceSnapshotStatus: 'resource_snapshot_ready',
      providerQuotaSnapshotStatus: 'provider_quota_snapshot_ready',
      reconciliationId: RECONCILIATION_ID,
      providerObservationValidated: true,
      reservationPlan: {
        status: 'blocked',
        blockers: ['provider_quota_risk_blocked'],
        providerQuotaRiskStatus: 'blocked',
        plan: null,
      },
      riskApproved: false,
      submissionAuthorized: false,
    });
  });
});

describe('Agentic Wallet reconciled reservation capacity', () => {
  it('evaluates aggregate capacity from authenticated resource and quota facts', () => {
    const result = capacityAssessment();

    expect(result.reconciliationFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(result).toMatchObject({
      scope:
        'agentic_wallet_accounting_reconciled_reservation_capacity_assessment',
      status: 'reservation_capacity_available',
      blockers: [],
      resourceSnapshotStatus: 'resource_snapshot_ready',
      providerQuotaSnapshotStatus: 'provider_quota_snapshot_ready',
      reconciliationId: RECONCILIATION_ID,
      providerObservationValidated: true,
      requirementValuationExternallySupplied: true,
      reservationCapacity: {
        status: 'reservation_capacity_available',
        blockers: [],
        reservationPlanStatus: 'reservation_plan_ready',
        activeReservationCount: 1,
        proposedBudgetReservationUsdt: '6.11',
        proposedSourceReservationQuantity: '5.51',
        proposedNativeGasReservationQuantity: '0.0003',
        proposedProviderQuotaReservationUsd: '6.2',
      },
      usdtUsdParityAssumed: false,
      providerDailyLimitAcceptedAsProjectRiskLimit: false,
      durableReservationCreated: false,
      atomicEnforcement: false,
      riskApproved: false,
      fundingAuthorized: false,
      quoteAuthorized: false,
      submissionAuthorized: false,
    });
  });

  it('stops before quota and capacity when reconciled resources are invalid', () => {
    const balances = balanceSnapshot();
    const result = capacityAssessment({
      balances: { ...balances, riskApproved: true } as typeof balances,
    });

    expect(result).toMatchObject({
      status: 'blocked',
      blockers: ['resource_snapshot_projection_blocked'],
      resourceSnapshotBlockers: ['invalid_reconciled_balance_snapshot'],
      providerQuotaSnapshotStatus: 'not_evaluated',
      reservationCapacity: null,
      reconciliationId: null,
    });
  });

  it('stops before capacity when provider quota evidence is absent', () => {
    const result = capacityAssessment({
      observation: observation({ quota: null }),
    });

    expect(result).toMatchObject({
      status: 'blocked',
      blockers: ['provider_quota_snapshot_projection_blocked'],
      resourceSnapshotStatus: 'resource_snapshot_ready',
      providerQuotaSnapshotStatus: 'blocked',
      providerQuotaSnapshotBlockers: ['provider_quota_unavailable'],
      reservationCapacity: null,
      reconciliationId: RECONCILIATION_ID,
    });
  });

  it('preserves provenance when the established capacity policy blocks', () => {
    const result = capacityAssessment({
      reservationSnapshot: reservationSnapshot({ coverage: 'partial' }),
    });

    expect(result).toMatchObject({
      status: 'blocked',
      blockers: ['reservation_capacity_blocked'],
      resourceSnapshotStatus: 'resource_snapshot_ready',
      providerQuotaSnapshotStatus: 'provider_quota_snapshot_ready',
      reconciliationId: RECONCILIATION_ID,
      reservationCapacity: {
        status: 'blocked',
        blockers: ['reservation_coverage_incomplete'],
        reservationPlanStatus: 'reservation_plan_ready',
      },
      durableReservationCreated: false,
      atomicEnforcement: false,
    });
  });

  it('uses reconciled source balance for aggregate capacity', () => {
    const snapshot = reservationSnapshot();
    const result = capacityAssessment({
      reservationSnapshot: {
        ...snapshot,
        reservations: snapshot.reservations.map((reservation) => ({
          ...reservation,
          sourceQuantity: '895',
        })),
      },
    });

    expect(result).toMatchObject({
      status: 'blocked',
      blockers: ['reservation_capacity_blocked'],
      reservationCapacity: {
        blockers: ['aggregate_source_insufficient'],
        proposedSourceReservationQuantity: '900.01',
      },
      riskApproved: false,
      submissionAuthorized: false,
    });
  });
});

describe('Agentic Wallet reconciled reservation command', () => {
  it('prepares the exact durable-store command without invoking persistence', () => {
    const result = commandAssessment();

    expect(result.reconciliationFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(result).toMatchObject({
      scope:
        'agentic_wallet_accounting_reconciled_reservation_command_assessment',
      status: 'reservation_command_ready',
      blockers: [],
      resourceSnapshotStatus: 'resource_snapshot_ready',
      providerQuotaSnapshotStatus: 'provider_quota_snapshot_ready',
      reservationCapacity: {
        status: 'reservation_capacity_available',
        activeReservationCount: 1,
      },
      command: {
        intent: {
          id: INTENT_ID,
          idempotencyKey: 'reconciled-provider-quota-risk-1',
        },
        quote: { id: QUOTE_ID, providerId: 'agentic_wallet' },
        budgetSnapshot: { reservedSpendUsdt: '1' },
        resourceSnapshot: {
          sourceTokenAddress: usdt.tokenAddress,
          sourceAvailableQuantity: '900',
          nativeGasAvailableQuantity: '1.9',
          nativeGasRequiredQuantity: '0.0002',
        },
        quotaSnapshot: {
          dailyLimitUsd: '1000',
          usedUsd: '100',
          remainingUsd: '900',
          requiredUsd: '5.2',
        },
        provenance: {
          accountingReconciliationId: RECONCILIATION_ID,
          providerObservedAt: new Date('2026-10-16T12:01:28.000Z'),
          requirementValuationBasis: 'explicit_external_usd_value',
          requirementValuedAt: new Date('2026-10-16T12:01:29.000Z'),
        },
        freshness: { reservationSnapshotMaxAgeMs: 60_000 },
      },
      reconciliationId: RECONCILIATION_ID,
      providerObservationValidated: true,
      requirementValuationExternallySupplied: true,
      durableReservationCommandPrepared: true,
      durableReservationCreated: false,
      atomicEnforcement: false,
      riskApproved: false,
      submissionAuthorized: false,
    });
  });

  it('does not prepare a command from invalid reconciled evidence', () => {
    const balances = balanceSnapshot();
    const result = commandAssessment({
      balances: { ...balances, quoteAuthorized: true } as typeof balances,
    });

    expect(result).toMatchObject({
      status: 'blocked',
      blockers: ['resource_snapshot_projection_blocked'],
      providerQuotaSnapshotStatus: 'not_evaluated',
      reservationCapacity: null,
      command: null,
      durableReservationCommandPrepared: false,
    });
  });

  it('does not prepare a command without authenticated quota evidence', () => {
    const result = commandAssessment({
      observation: observation({ quota: null }),
    });

    expect(result).toMatchObject({
      status: 'blocked',
      blockers: ['provider_quota_snapshot_projection_blocked'],
      providerQuotaSnapshotBlockers: ['provider_quota_unavailable'],
      reservationCapacity: null,
      command: null,
      durableReservationCreated: false,
    });
  });

  it('does not prepare a command when aggregate capacity is blocked', () => {
    const result = commandAssessment({
      reservationSnapshot: reservationSnapshot({ coverage: 'partial' }),
    });

    expect(result).toMatchObject({
      status: 'blocked',
      blockers: ['reservation_capacity_blocked'],
      reservationCapacity: {
        status: 'blocked',
        blockers: ['reservation_coverage_incomplete'],
      },
      command: null,
      reconciliationId: RECONCILIATION_ID,
      providerObservationValidated: true,
      durableReservationCommandPrepared: false,
      atomicEnforcement: false,
    });
  });
});

function assess(
  overrides: {
    balances?: ReturnType<typeof balanceSnapshot>;
    observation?: AgenticWalletCapabilityObservation;
    intent?: RealExecutionIntent;
    quote?: RealExecutionQuote;
    requiredUsd?: string;
    budgetSnapshot?: RealExecutionBudgetSnapshot;
  } = {},
) {
  const valueIntent = overrides.intent ?? intent();
  const valueQuote = overrides.quote ?? quote({ intent: valueIntent });
  return assessAgenticWalletAccountingReconciledProviderQuotaRisk(
    overrides.balances ?? balanceSnapshot(),
    overrides.observation ?? observation(),
    valueIntent,
    valueQuote,
    '0.0002',
    overrides.requiredUsd ?? '5.2',
    new Date('2026-10-16T12:01:29.000Z'),
    limits(),
    overrides.budgetSnapshot ?? budgetSnapshot(),
    {
      budgetSnapshotMaxAgeMs: 60_000,
      resourceSnapshotMaxAgeMs: 60_000,
      quotaSnapshotMaxAgeMs: 60_000,
      requirementValuationMaxAgeMs: 60_000,
    },
    EVALUATED_AT,
  );
}

function planAssessment(
  overrides: {
    balances?: ReturnType<typeof balanceSnapshot>;
    observation?: AgenticWalletCapabilityObservation;
    intent?: RealExecutionIntent;
    quote?: RealExecutionQuote;
    requiredUsd?: string;
    budgetSnapshot?: RealExecutionBudgetSnapshot;
  } = {},
) {
  const valueIntent = overrides.intent ?? intent();
  const valueQuote = overrides.quote ?? quote({ intent: valueIntent });
  return planAgenticWalletAccountingReconciledReservation(
    overrides.balances ?? balanceSnapshot(),
    overrides.observation ?? observation(),
    valueIntent,
    valueQuote,
    '0.0002',
    overrides.requiredUsd ?? '5.2',
    new Date('2026-10-16T12:01:29.000Z'),
    limits(),
    overrides.budgetSnapshot ?? budgetSnapshot(),
    {
      budgetSnapshotMaxAgeMs: 60_000,
      resourceSnapshotMaxAgeMs: 60_000,
      quotaSnapshotMaxAgeMs: 60_000,
      requirementValuationMaxAgeMs: 60_000,
    },
    EVALUATED_AT,
  );
}

function capacityAssessment(
  overrides: {
    balances?: ReturnType<typeof balanceSnapshot>;
    observation?: AgenticWalletCapabilityObservation;
    intent?: RealExecutionIntent;
    quote?: RealExecutionQuote;
    requiredUsd?: string;
    budgetSnapshot?: RealExecutionBudgetSnapshot;
    reservationSnapshot?: ReturnType<typeof reservationSnapshot>;
  } = {},
) {
  const valueIntent = overrides.intent ?? intent();
  const valueQuote = overrides.quote ?? quote({ intent: valueIntent });
  return assessAgenticWalletAccountingReconciledReservationCapacity(
    overrides.balances ?? balanceSnapshot(),
    overrides.observation ?? observation(),
    valueIntent,
    valueQuote,
    '0.0002',
    overrides.requiredUsd ?? '5.2',
    new Date('2026-10-16T12:01:29.000Z'),
    limits(),
    overrides.budgetSnapshot ?? budgetSnapshot(),
    overrides.reservationSnapshot ?? reservationSnapshot(),
    {
      budgetSnapshotMaxAgeMs: 60_000,
      resourceSnapshotMaxAgeMs: 60_000,
      quotaSnapshotMaxAgeMs: 60_000,
      requirementValuationMaxAgeMs: 60_000,
      reservationSnapshotMaxAgeMs: 60_000,
    },
    EVALUATED_AT,
  );
}

function commandAssessment(
  overrides: {
    balances?: ReturnType<typeof balanceSnapshot>;
    observation?: AgenticWalletCapabilityObservation;
    intent?: RealExecutionIntent;
    quote?: RealExecutionQuote;
    requiredUsd?: string;
    budgetSnapshot?: RealExecutionBudgetSnapshot;
    reservationSnapshot?: ReturnType<typeof reservationSnapshot>;
  } = {},
) {
  const valueIntent = overrides.intent ?? intent();
  const valueQuote = overrides.quote ?? quote({ intent: valueIntent });
  return prepareAgenticWalletAccountingReconciledReservationCommand(
    overrides.balances ?? balanceSnapshot(),
    overrides.observation ?? observation(),
    valueIntent,
    valueQuote,
    '0.0002',
    overrides.requiredUsd ?? '5.2',
    new Date('2026-10-16T12:01:29.000Z'),
    limits(),
    overrides.budgetSnapshot ?? budgetSnapshot(),
    overrides.reservationSnapshot ?? reservationSnapshot(),
    {
      budgetSnapshotMaxAgeMs: 60_000,
      resourceSnapshotMaxAgeMs: 60_000,
      quotaSnapshotMaxAgeMs: 60_000,
      requirementValuationMaxAgeMs: 60_000,
      reservationSnapshotMaxAgeMs: 60_000,
    },
    EVALUATED_AT,
  );
}

function reservationSnapshot(
  overrides: Partial<{
    providerId: string;
    chainId: string;
    utcDay: string;
    reservations: readonly {
      id: string;
      intentId: string;
      quoteId: string;
      budgetChargeUsdt: string;
      sourceTokenAddress: string;
      sourceQuantity: string;
      nativeGasQuantity: string;
      providerQuotaUsd: string;
      expiresAt: Date;
    }[];
    coverage: 'complete' | 'partial';
    observedAt: Date;
  }> = {},
) {
  return {
    providerId: 'agentic_wallet',
    chainId: '56',
    utcDay: '2026-10-16',
    reservations: [
      {
        id: '00000000-0000-4000-8000-000000000040',
        intentId: '00000000-0000-4000-8000-000000000041',
        quoteId: '00000000-0000-4000-8000-000000000042',
        budgetChargeUsdt: '1',
        sourceTokenAddress: usdt.tokenAddress,
        sourceQuantity: '0.5',
        nativeGasQuantity: '0.0001',
        providerQuotaUsd: '1',
        expiresAt: new Date('2026-10-16T12:02:00.000Z'),
      },
    ],
    coverage: 'complete' as const,
    observedAt: new Date('2026-10-16T12:01:29.000Z'),
    ...overrides,
  };
}

function observation(
  overrides: Partial<AgenticWalletCapabilityObservation> = {},
): AgenticWalletCapabilityObservation {
  return {
    cliVersion: '1.10.0',
    requiredCliVersion: '1.10.0',
    capabilities: {
      providerId: 'agentic_wallet',
      connected: true,
      chains: [{ chainId: '56', operations: [] }],
      reads: {
        securitySettings: true,
        quota: true,
        balances: true,
        gas: true,
      },
      observedAt: new Date('2026-10-16T12:01:28.000Z'),
    },
    settings: {
      dailyLimitUsd: '1000',
      abnormalTransactionHandling: 'AutoReject',
      tradeAllTokens: false,
      predictionTradingEnabled: false,
      developerModeEnabled: false,
      sessionExpiresAt: new Date('2026-10-16T14:00:00.000Z'),
      signInMaximumAt: new Date('2027-10-16T12:00:00.000Z'),
      inactivitySignOutAt: new Date('2026-10-18T12:00:00.000Z'),
    },
    quota: { usedUsd: '100', remainingUsd: '900', date: '2026-10-16' },
    addresses: [],
    balances: [],
    gas: null,
    ...overrides,
  };
}

function intent(): RealExecutionIntent {
  return {
    id: INTENT_ID,
    idempotencyKey: 'reconciled-provider-quota-risk-1',
    kind: 'market_swap',
    chainId: '56',
    sourceAsset: { tokenAddress: usdt.tokenAddress, symbol: 'USDT' },
    targetAsset: { tokenAddress: btc.tokenAddress, symbol: 'BTCB' },
    sourceQuantity: '5',
    maxSlippageRate: '0.005',
    createdAt: new Date('2026-10-16T12:01:20.000Z'),
  };
}

function quote(
  overrides: Partial<RealExecutionQuote> = {},
): RealExecutionQuote {
  const quoteIntent = overrides.intent ?? intent();
  return {
    id: QUOTE_ID,
    providerId: 'agentic_wallet',
    providerQuoteId: null,
    intent: quoteIntent,
    expectedTargetQuantity: '0.00005',
    minimumTargetQuantity: '0.000049',
    costs: [
      {
        kind: 'provider_fee',
        asset: quoteIntent.sourceAsset,
        quantity: '0.01',
      },
      { kind: 'network_fee', asset: quoteIntent.sourceAsset, quantity: '0.1' },
    ],
    costCoverage: 'complete',
    quotedAt: new Date('2026-10-16T12:01:25.000Z'),
    expiresAt: new Date('2026-10-16T12:01:35.000Z'),
    executable: false,
    ...overrides,
  };
}

function limits(): RealExecutionLocalRiskLimits {
  return {
    maximumOrderNotionalUsdt: '10',
    maximumDailySpendUsdt: '20',
    maximumBankrollUsdt: '1000',
    maximumProviderFeeRate: '0.01',
    maximumNetworkFeeUsdt: '0.5',
    maximumSlippageRate: '0.005',
  };
}

function budgetSnapshot(
  overrides: Partial<RealExecutionBudgetSnapshot> = {},
): RealExecutionBudgetSnapshot {
  return {
    providerId: 'agentic_wallet',
    chainId: '56',
    utcDay: '2026-10-16',
    settledSpendUsdt: '1',
    reservedSpendUsdt: '1',
    spendCoverage: 'complete',
    bankrollValueUsdt: '950',
    bankrollCoverage: 'complete',
    observedAt: new Date('2026-10-16T12:01:29.000Z'),
    ...overrides,
  };
}

function balanceSnapshot() {
  const commitment =
    prepareAgenticWalletAccountingLedgerReconciliationCommitment(
      reconciliation(),
      RECONCILIATION_ID,
      new Date('2026-10-16T12:01:01.000Z'),
    ).commitment;
  if (commitment === null) throw new Error('Commitment fixture was blocked');
  const evidence = assessAgenticWalletAccountingLedgerReconciliationFreshness(
    { commitment, recordedAt: new Date('2026-10-16T12:01:02.000Z') },
    60_000,
    EVALUATED_AT,
  ).evidence;
  if (evidence === null) throw new Error('Fresh evidence fixture was blocked');
  const snapshot = prepareAgenticWalletAccountingReconciledBalanceSnapshot(
    evidence,
    INITIALIZATION_ID,
  ).snapshot;
  if (snapshot === null)
    throw new Error('Balance snapshot fixture was blocked');
  return snapshot;
}

function reconciliation(): AgenticWalletAccountingLedgerReconciliation {
  const updatedAt = new Date('2026-10-16T12:00:50.000Z');
  return {
    scope: 'agentic_wallet_accounting_ledger_reconciliation',
    initializationId: INITIALIZATION_ID,
    providerId: 'agentic_wallet',
    chainId: '56',
    ledgerSnapshot: {
      scope: 'agentic_wallet_accounting_ledger_snapshot',
      initializationId: INITIALIZATION_ID,
      providerId: 'agentic_wallet',
      chainId: '56',
      initialBalances: balances('2', '1000.5', '0.125'),
      currentBalances: balances('1.9', '900', '0.126').map((balance) => ({
        ...balance,
        updatedAt,
      })),
      initializedAt: new Date('2026-10-16T12:00:25.000Z'),
      evaluatedAt: new Date('2026-10-16T12:00:55.000Z'),
      ledgerCoverageComplete: true,
      accountingBalancesInitialized: true,
      quoteAuthorized: false,
      submissionAuthorized: false,
    },
    walletBalances: balances('1.9', '900', '0.126'),
    walletObservedAt: new Date('2026-10-16T12:00:55.000Z'),
    reconciledAt: new Date('2026-10-16T12:01:00.000Z'),
    walletObservationAuthenticated: true,
    ledgerBalancesReconciled: true,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
}

function balances(bnb: string, usdtQuantity: string, btcbQuantity: string) {
  return [
    {
      assetType: 'native' as const,
      assetSymbol: 'BNB' as const,
      currentQuantity: bnb,
    },
    {
      assetType: 'token' as const,
      assetAddress: usdt.tokenAddress,
      currentQuantity: usdtQuantity,
    },
    {
      assetType: 'token' as const,
      assetAddress: btc.tokenAddress,
      currentQuantity: btcbQuantity,
    },
  ];
}
