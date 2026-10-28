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
