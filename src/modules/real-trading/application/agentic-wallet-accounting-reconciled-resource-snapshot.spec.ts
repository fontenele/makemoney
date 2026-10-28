import {
  RealExecutionIntent,
  RealExecutionQuote,
} from '../domain/real-execution';
import { AgenticWalletAccountingLedgerReconciliation } from '../infrastructure/agentic-wallet-accounting-ledger-reconciliation';
import { prepareAgenticWalletAccountingLedgerReconciliationCommitment } from '../infrastructure/agentic-wallet-accounting-ledger-reconciliation-commitment';
import { assessAgenticWalletAccountingLedgerReconciliationFreshness } from '../infrastructure/agentic-wallet-accounting-ledger-reconciliation-freshness';
import { prepareAgenticWalletAccountingReconciledBalanceSnapshot } from '../infrastructure/agentic-wallet-accounting-reconciled-balance-snapshot';
import { prepareAgenticWalletAccountingReconciledResourceSnapshot } from './agentic-wallet-accounting-reconciled-resource-snapshot';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from './real-execution-instrument-approval';

const INITIALIZATION_ID = '00000000-0000-4000-8000-000000000029';
const RECONCILIATION_ID = '00000000-0000-4000-8000-000000000031';
const INTENT_ID = '00000000-0000-4000-8000-000000000032';
const QUOTE_ID = '00000000-0000-4000-8000-000000000033';
const { usdt, btc } = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;

describe('Agentic Wallet reconciled resource snapshot', () => {
  it('projects exact source and BNB resources without financial authority', () => {
    const result = prepareAgenticWalletAccountingReconciledResourceSnapshot(
      balanceSnapshot(),
      intent(),
      quote(),
      '0.0002000',
    );
    expect(result.reconciliationFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(result).toEqual({
      scope:
        'agentic_wallet_accounting_reconciled_resource_snapshot_assessment',
      status: 'resource_snapshot_ready',
      blockers: [],
      resourceSnapshot: {
        providerId: 'agentic_wallet',
        chainId: '56',
        intentId: INTENT_ID,
        quoteId: QUOTE_ID,
        sourceTokenAddress: usdt.tokenAddress,
        sourceSymbol: 'USDT',
        sourceAvailableQuantity: '900',
        sourceBalanceCoverage: 'complete',
        nativeGasSymbol: 'BNB',
        nativeGasAvailableQuantity: '1.9',
        nativeGasRequiredQuantity: '0.0002',
        nativeGasCoverage: 'complete',
        observedAt: new Date('2026-10-16T12:00:55.000Z'),
      },
      reconciliationId: RECONCILIATION_ID,
      reconciliationFingerprint: result.reconciliationFingerprint,
      balanceCoverageComplete: true,
      durableResourceReservation: false,
      riskApproved: false,
      quoteAuthorized: false,
      submissionAuthorized: false,
    });
  });

  it('supports the approved BTCB source direction', () => {
    const sell = intent({
      sourceAsset: { tokenAddress: btc.tokenAddress, symbol: 'BTCB' },
      targetAsset: { tokenAddress: usdt.tokenAddress, symbol: 'USDT' },
      sourceQuantity: '0.001',
    });
    const result = prepareAgenticWalletAccountingReconciledResourceSnapshot(
      balanceSnapshot(),
      sell,
      quote({ intent: sell }),
      '0.0002',
    );

    expect(result.resourceSnapshot).toMatchObject({
      sourceTokenAddress: btc.tokenAddress,
      sourceSymbol: 'BTCB',
      sourceAvailableQuantity: '0.126',
    });
  });

  it('fails closed for intent, quote, instrument, and gas divergence', () => {
    const validIntent = intent();
    expect(
      prepareAgenticWalletAccountingReconciledResourceSnapshot(
        balanceSnapshot(),
        validIntent,
        quote({
          intent: intent({ id: '00000000-0000-4000-8000-000000000034' }),
        }),
        '0',
      ),
    ).toMatchObject({
      status: 'blocked',
      blockers: ['quote_intent_mismatch', 'invalid_native_gas_requirement'],
      resourceSnapshot: null,
      riskApproved: false,
      submissionAuthorized: false,
    });

    const unsupported = intent({
      sourceAsset: {
        tokenAddress: '0x1111111111111111111111111111111111111111',
        symbol: 'OTHER',
      },
    });
    expect(
      prepareAgenticWalletAccountingReconciledResourceSnapshot(
        balanceSnapshot(),
        unsupported,
        quote({ intent: unsupported }),
        '0.0002',
      ).blockers,
    ).toEqual(['instrument_not_approved', 'source_balance_absent']);

    expect(
      prepareAgenticWalletAccountingReconciledResourceSnapshot(
        balanceSnapshot(),
        validIntent,
        quote({ providerId: 'other_provider' }),
        '0.0002',
      ).blockers,
    ).toEqual(['quote_provider_mismatch']);
  });

  it('rejects tampered reconciled evidence before projecting quantities', () => {
    const snapshot = balanceSnapshot();
    const tampered = { ...snapshot, quoteAuthorized: true };
    expect(
      prepareAgenticWalletAccountingReconciledResourceSnapshot(
        tampered as typeof snapshot,
        intent(),
        quote(),
        '0.0002',
      ),
    ).toMatchObject({
      status: 'blocked',
      blockers: ['invalid_reconciled_balance_snapshot'],
      resourceSnapshot: null,
      reconciliationId: null,
    });
  });
});

function intent(
  overrides: Partial<RealExecutionIntent> = {},
): RealExecutionIntent {
  return {
    id: INTENT_ID,
    idempotencyKey: 'resource-snapshot-1',
    kind: 'market_swap',
    chainId: '56',
    sourceAsset: { tokenAddress: usdt.tokenAddress, symbol: 'USDT' },
    targetAsset: { tokenAddress: btc.tokenAddress, symbol: 'BTCB' },
    sourceQuantity: '5',
    maxSlippageRate: '0.005',
    createdAt: new Date('2026-10-16T12:01:31.000Z'),
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
    costs: [],
    costCoverage: 'partial',
    quotedAt: new Date('2026-10-16T12:01:32.000Z'),
    expiresAt: new Date('2026-10-16T12:01:37.000Z'),
    executable: false,
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
    new Date('2026-10-16T12:01:30.000Z'),
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
