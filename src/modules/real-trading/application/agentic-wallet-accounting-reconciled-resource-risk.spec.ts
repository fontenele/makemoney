import {
  RealExecutionIntent,
  RealExecutionQuote,
} from '../domain/real-execution';
import { AgenticWalletAccountingLedgerReconciliation } from '../infrastructure/agentic-wallet-accounting-ledger-reconciliation';
import { prepareAgenticWalletAccountingLedgerReconciliationCommitment } from '../infrastructure/agentic-wallet-accounting-ledger-reconciliation-commitment';
import { assessAgenticWalletAccountingLedgerReconciliationFreshness } from '../infrastructure/agentic-wallet-accounting-ledger-reconciliation-freshness';
import { prepareAgenticWalletAccountingReconciledBalanceSnapshot } from '../infrastructure/agentic-wallet-accounting-reconciled-balance-snapshot';
import { assessAgenticWalletAccountingReconciledResourceRisk } from './agentic-wallet-accounting-reconciled-resource-risk';
import { RealExecutionBudgetSnapshot } from './real-execution-budget-risk';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from './real-execution-instrument-approval';
import { RealExecutionLocalRiskLimits } from './real-execution-local-risk-limits';

const INITIALIZATION_ID = '00000000-0000-4000-8000-000000000029';
const RECONCILIATION_ID = '00000000-0000-4000-8000-000000000031';
const INTENT_ID = '00000000-0000-4000-8000-000000000032';
const QUOTE_ID = '00000000-0000-4000-8000-000000000033';
const EVALUATED_AT = new Date('2026-10-16T12:01:30.000Z');
const { usdt, btc } = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;

describe('Agentic Wallet reconciled resource risk', () => {
  it('evaluates reconciled source and gas balances without granting authority', () => {
    const result = assess();

    expect(result.reconciliationFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(result).toMatchObject({
      scope: 'agentic_wallet_accounting_reconciled_resource_risk_assessment',
      status: 'resources_sufficient',
      blockers: [],
      resourceSnapshotStatus: 'resource_snapshot_ready',
      resourceSnapshotBlockers: [],
      reconciliationId: RECONCILIATION_ID,
      resourceRisk: {
        status: 'resources_sufficient',
        blockers: [],
        requiredSourceQuantity: '5.01',
        availableSourceQuantity: '900',
        requiredNativeGasQuantity: '0.0002',
        availableNativeGasQuantity: '1.9',
        sourceBalanceSufficient: true,
        nativeGasBalanceSufficient: true,
      },
      durableResourceReservation: false,
      riskApproved: false,
      fundingAuthorized: false,
      quoteAuthorized: false,
      submissionAuthorized: false,
    });
  });

  it('retains reconciliation provenance when downstream budget risk blocks', () => {
    const result = assess({
      budgetSnapshot: budgetSnapshot({ spendCoverage: 'partial' }),
    });

    expect(result).toMatchObject({
      status: 'blocked',
      blockers: ['resource_risk_blocked'],
      resourceSnapshotStatus: 'resource_snapshot_ready',
      reconciliationId: RECONCILIATION_ID,
      resourceRisk: {
        status: 'blocked',
        blockers: ['budget_risk_blocked'],
        sourceBalanceSufficient: null,
      },
      riskApproved: false,
      submissionAuthorized: false,
    });
  });

  it('reports reconciled balance insufficiency through the established risk policy', () => {
    const result = assess({
      intent: intent({ sourceQuantity: '900' }),
      limits: limits({
        maximumOrderNotionalUsdt: '1000',
        maximumDailySpendUsdt: '2000',
        maximumBankrollUsdt: '3000',
      }),
    });

    expect(result).toMatchObject({
      status: 'blocked',
      blockers: ['resource_risk_blocked'],
      resourceRisk: {
        blockers: ['source_balance_insufficient'],
        requiredSourceQuantity: '900.01',
        availableSourceQuantity: '900',
        sourceBalanceSufficient: false,
      },
    });
  });

  it('stops before risk evaluation when reconciled projection is blocked', () => {
    const snapshot = balanceSnapshot();
    const result = assess({
      balances: { ...snapshot, quoteAuthorized: true } as typeof snapshot,
      nativeGasRequiredQuantity: '0',
    });

    expect(result).toEqual({
      scope: 'agentic_wallet_accounting_reconciled_resource_risk_assessment',
      status: 'blocked',
      blockers: ['resource_snapshot_projection_blocked'],
      resourceSnapshotStatus: 'blocked',
      resourceSnapshotBlockers: [
        'invalid_reconciled_balance_snapshot',
        'invalid_native_gas_requirement',
      ],
      resourceRisk: null,
      reconciliationId: null,
      reconciliationFingerprint: null,
      durableResourceReservation: false,
      riskApproved: false,
      fundingAuthorized: false,
      quoteAuthorized: false,
      submissionAuthorized: false,
    });
  });
});

function assess(
  overrides: {
    balances?: ReturnType<typeof balanceSnapshot>;
    intent?: RealExecutionIntent;
    quote?: RealExecutionQuote;
    nativeGasRequiredQuantity?: string;
    budgetSnapshot?: RealExecutionBudgetSnapshot;
    limits?: RealExecutionLocalRiskLimits;
  } = {},
) {
  const valueIntent = overrides.intent ?? intent();
  const valueQuote = overrides.quote ?? quote({ intent: valueIntent });
  return assessAgenticWalletAccountingReconciledResourceRisk(
    overrides.balances ?? balanceSnapshot(),
    valueIntent,
    valueQuote,
    overrides.nativeGasRequiredQuantity ?? '0.0002',
    overrides.limits ?? limits(),
    overrides.budgetSnapshot ?? budgetSnapshot(),
    { budgetSnapshotMaxAgeMs: 60_000, resourceSnapshotMaxAgeMs: 60_000 },
    EVALUATED_AT,
  );
}

function intent(
  overrides: Partial<RealExecutionIntent> = {},
): RealExecutionIntent {
  return {
    id: INTENT_ID,
    idempotencyKey: 'reconciled-resource-risk-1',
    kind: 'market_swap',
    chainId: '56',
    sourceAsset: { tokenAddress: usdt.tokenAddress, symbol: 'USDT' },
    targetAsset: { tokenAddress: btc.tokenAddress, symbol: 'BTCB' },
    sourceQuantity: '5',
    maxSlippageRate: '0.005',
    createdAt: new Date('2026-10-16T12:01:20.000Z'),
    ...overrides,
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

function limits(
  overrides: Partial<RealExecutionLocalRiskLimits> = {},
): RealExecutionLocalRiskLimits {
  return {
    maximumOrderNotionalUsdt: '10',
    maximumDailySpendUsdt: '20',
    maximumBankrollUsdt: '1000',
    maximumProviderFeeRate: '0.01',
    maximumNetworkFeeUsdt: '0.5',
    maximumSlippageRate: '0.005',
    ...overrides,
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
