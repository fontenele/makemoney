import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from '../application/real-execution-instrument-approval';
import { AgenticWalletAccountingLedgerReconciliation } from './agentic-wallet-accounting-ledger-reconciliation';
import { prepareAgenticWalletAccountingLedgerReconciliationCommitment } from './agentic-wallet-accounting-ledger-reconciliation-commitment';
import { assessAgenticWalletAccountingLedgerReconciliationFreshness } from './agentic-wallet-accounting-ledger-reconciliation-freshness';
import {
  isValidAgenticWalletAccountingReconciledBalanceSnapshot,
  prepareAgenticWalletAccountingReconciledBalanceSnapshot,
} from './agentic-wallet-accounting-reconciled-balance-snapshot';

const INITIALIZATION_ID = '00000000-0000-4000-8000-000000000029';
const OTHER_INITIALIZATION_ID = '00000000-0000-4000-8000-000000000030';
const RECONCILIATION_ID = '00000000-0000-4000-8000-000000000031';
const { usdt, btc } = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;

describe('Agentic Wallet accounting reconciled balance snapshot', () => {
  it('projects canonical complete balances from fresh reconciled evidence', () => {
    const result = prepareAgenticWalletAccountingReconciledBalanceSnapshot(
      validEvidence(),
      INITIALIZATION_ID,
    );

    expect(result).toMatchObject({
      status: 'reconciled_balances_ready',
      blockers: [],
      balanceCoverageComplete: true,
      quoteAuthorized: false,
      submissionAuthorized: false,
      snapshot: {
        initializationId: INITIALIZATION_ID,
        reconciliationId: RECONCILIATION_ID,
        providerId: 'agentic_wallet',
        chainId: '56',
        balances: [
          { assetType: 'native', assetSymbol: 'BNB', currentQuantity: '1.9' },
          {
            assetType: 'token',
            assetAddress: usdt.tokenAddress,
            currentQuantity: '900',
          },
          {
            assetType: 'token',
            assetAddress: btc.tokenAddress,
            currentQuantity: '0.126',
          },
        ],
        observedAt: new Date('2026-10-16T12:00:55.000Z'),
        evaluatedAt: new Date('2026-10-16T12:01:30.000Z'),
        balanceCoverageComplete: true,
        walletObservationAuthenticated: true,
        ledgerBalancesReconciled: true,
        quoteAuthorized: false,
        submissionAuthorized: false,
      },
    });
    expect(
      isValidAgenticWalletAccountingReconciledBalanceSnapshot(result.snapshot),
    ).toBe(true);
  });

  it('rejects malformed freshness evidence', () => {
    const evidence = validEvidence();
    evidence.maximumAgeMs = 60_001;
    expect(
      prepareAgenticWalletAccountingReconciledBalanceSnapshot(
        evidence,
        INITIALIZATION_ID,
      ),
    ).toMatchObject({
      status: 'blocked',
      blockers: ['invalid_fresh_accounting_ledger_reconciliation_evidence'],
      snapshot: null,
    });
  });

  it.each(['not-a-uuid', OTHER_INITIALIZATION_ID])(
    'blocks invalid or mismatched initialization identity %s',
    (initializationId) => {
      expect(
        prepareAgenticWalletAccountingReconciledBalanceSnapshot(
          validEvidence(),
          initializationId,
        ),
      ).toMatchObject({
        status: 'blocked',
        blockers: [
          initializationId === OTHER_INITIALIZATION_ID
            ? 'accounting_initialization_identity_mismatch'
            : 'invalid_accounting_initialization_identity',
        ],
        snapshot: null,
      });
    },
  );

  it('defensively isolates balances and dates from source mutation', () => {
    const evidence = validEvidence();
    const result = prepareAgenticWalletAccountingReconciledBalanceSnapshot(
      evidence,
      INITIALIZATION_ID,
    );
    if (result.snapshot === null) throw new Error('Snapshot was blocked');

    evidence.evaluatedAt.setTime(0);
    evidence.stored.commitment.reconciliation.walletBalances[0].currentQuantity =
      '999';
    evidence.stored.commitment.reconciliation.walletObservedAt.setTime(0);

    expect(result.snapshot.evaluatedAt).toEqual(
      new Date('2026-10-16T12:01:30.000Z'),
    );
    expect(result.snapshot.observedAt).toEqual(
      new Date('2026-10-16T12:00:55.000Z'),
    );
    expect(result.snapshot.balances[0]).toMatchObject({
      assetSymbol: 'BNB',
      currentQuantity: '1.9',
    });
  });

  it('rejects tampered projected claims', () => {
    const snapshot = prepareAgenticWalletAccountingReconciledBalanceSnapshot(
      validEvidence(),
      INITIALIZATION_ID,
    ).snapshot;
    if (snapshot === null) throw new Error('Snapshot was blocked');
    expect(
      isValidAgenticWalletAccountingReconciledBalanceSnapshot({
        ...snapshot,
        quoteAuthorized: true,
      }),
    ).toBe(false);
  });
});

function validEvidence() {
  const commitment =
    prepareAgenticWalletAccountingLedgerReconciliationCommitment(
      validReconciliation(),
      RECONCILIATION_ID,
      new Date('2026-10-16T12:01:01.000Z'),
    ).commitment;
  if (commitment === null) throw new Error('Commitment fixture was blocked');
  const evidence = assessAgenticWalletAccountingLedgerReconciliationFreshness(
    {
      commitment,
      recordedAt: new Date('2026-10-16T12:01:02.000Z'),
    },
    60_000,
    new Date('2026-10-16T12:01:30.000Z'),
  ).evidence;
  if (evidence === null) throw new Error('Fresh evidence fixture was blocked');
  return evidence as Mutable<typeof evidence>;
}

function validReconciliation(): AgenticWalletAccountingLedgerReconciliation {
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

type Mutable<Value> = Value extends Date
  ? Date
  : Value extends readonly (infer Entry)[]
    ? Mutable<Entry>[]
    : Value extends object
      ? { -readonly [Key in keyof Value]: Mutable<Value[Key]> }
      : Value;
