import {
  assessAgenticWalletAccountingLedgerReconciliationFreshness,
  isValidAgenticWalletAccountingLedgerReconciliationFreshEvidence,
} from './agentic-wallet-accounting-ledger-reconciliation-freshness';
import {
  AgenticWalletAccountingLedgerReconciliation,
  isValidAgenticWalletAccountingLedgerReconciliation,
} from './agentic-wallet-accounting-ledger-reconciliation';
import { prepareAgenticWalletAccountingLedgerReconciliationCommitment } from './agentic-wallet-accounting-ledger-reconciliation-commitment';
import { StoredAgenticWalletAccountingLedgerReconciliationCommitment } from './agentic-wallet-accounting-ledger-reconciliation-commitment.store';

const INITIALIZATION_ID = '018f1f54-7b8c-7a9d-8e0f-123456789abc';
const RECONCILIATION_ID = '018f1f54-7b8c-7a9d-8e0f-123456789abd';
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';

describe('Agentic Wallet accounting ledger reconciliation freshness', () => {
  it('accepts the exact observation-age boundary and returns defensive evidence', () => {
    const stored = validStored();
    const evaluatedAt = new Date('2026-10-16T12:01:55.000Z');

    const assessment =
      assessAgenticWalletAccountingLedgerReconciliationFreshness(
        stored,
        60_000,
        evaluatedAt,
      );

    expect(assessment).toMatchObject({
      status: 'reconciliation_evidence_fresh',
      blockers: [],
      reconciliationCurrent: true,
      quoteAuthorized: false,
      submissionAuthorized: false,
    });
    expect(
      isValidAgenticWalletAccountingLedgerReconciliationFreshEvidence(
        assessment.evidence,
      ),
    ).toBe(true);
    expect(assessment.evidence?.stored).not.toBe(stored);
    expect(assessment.evidence?.stored.commitment.reconciliation).not.toBe(
      stored.commitment.reconciliation,
    );
    expect(assessment.evidence?.evaluatedAt).not.toBe(evaluatedAt);

    stored.commitment.reconciliation.walletBalances[0].currentQuantity = '999';
    evaluatedAt.setUTCFullYear(2030);
    expect(
      assessment.evidence?.stored.commitment.reconciliation.walletBalances[0]
        .currentQuantity,
    ).not.toBe('999');
    expect(assessment.evidence?.evaluatedAt.getUTCFullYear()).toBe(2026);
  });

  it('blocks evidence one millisecond beyond the authenticated observation age', () => {
    expect(
      assessAgenticWalletAccountingLedgerReconciliationFreshness(
        validStored(),
        60_000,
        new Date('2026-10-16T12:01:55.001Z'),
      ),
    ).toMatchObject({
      status: 'blocked',
      blockers: ['accounting_ledger_reconciliation_evidence_stale'],
      evidence: null,
      reconciliationCurrent: false,
    });
  });

  it('blocks consumption before the immutable evidence was recorded', () => {
    expect(
      assessAgenticWalletAccountingLedgerReconciliationFreshness(
        validStored(),
        60_000,
        new Date('2026-10-16T12:01:01.999Z'),
      ),
    ).toMatchObject({
      blockers: ['accounting_ledger_reconciliation_evidence_from_future'],
      evidence: null,
    });
  });

  it.each([0, 60_001, 1.5])(
    'rejects invalid maximum age %s',
    (maximumAgeMs) => {
      expect(
        assessAgenticWalletAccountingLedgerReconciliationFreshness(
          validStored(),
          maximumAgeMs,
          new Date('2026-10-16T12:01:30.000Z'),
        ),
      ).toMatchObject({
        blockers: [
          'invalid_accounting_ledger_reconciliation_freshness_request',
        ],
        evidence: null,
      });
    },
  );

  it('rejects an invalid evaluation clock', () => {
    expect(
      assessAgenticWalletAccountingLedgerReconciliationFreshness(
        validStored(),
        60_000,
        new Date(Number.NaN),
      ),
    ).toMatchObject({
      blockers: ['invalid_accounting_ledger_reconciliation_freshness_request'],
      evidence: null,
    });
  });

  it('rejects malformed stored commitment evidence', () => {
    const stored = validStored();
    stored.commitment.reconciliationFingerprint = 'f'.repeat(64);
    expect(
      assessAgenticWalletAccountingLedgerReconciliationFreshness(
        stored,
        60_000,
        new Date('2026-10-16T12:01:30.000Z'),
      ),
    ).toMatchObject({
      blockers: ['invalid_stored_accounting_ledger_reconciliation_commitment'],
      evidence: null,
    });
  });

  it('rejects tampered fresh-evidence claims', () => {
    const evidence = assessAgenticWalletAccountingLedgerReconciliationFreshness(
      validStored(),
      60_000,
      new Date('2026-10-16T12:01:30.000Z'),
    ).evidence;
    if (evidence === null) throw new Error('Fresh evidence was blocked');
    expect(
      isValidAgenticWalletAccountingLedgerReconciliationFreshEvidence({
        ...evidence,
        maximumAgeMs: 60_001,
      }),
    ).toBe(false);
  });
});

function validStored(): MutableStoredCommitment {
  const reconciliation = validReconciliation();
  const commitment =
    prepareAgenticWalletAccountingLedgerReconciliationCommitment(
      reconciliation,
      RECONCILIATION_ID,
      new Date('2026-10-16T12:01:01.000Z'),
    ).commitment;
  if (commitment === null) throw new Error('Commitment fixture was blocked');
  return {
    commitment,
    recordedAt: new Date('2026-10-16T12:01:02.000Z'),
  } as MutableStoredCommitment;
}

function validReconciliation(): AgenticWalletAccountingLedgerReconciliation {
  const initializedAt = new Date('2026-10-16T12:00:25.000Z');
  const evaluatedAt = new Date('2026-10-16T12:00:55.000Z');
  const updatedAt = new Date('2026-10-16T12:00:50.000Z');
  const reconciliation: AgenticWalletAccountingLedgerReconciliation = {
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
      initializedAt,
      evaluatedAt,
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
  if (!isValidAgenticWalletAccountingLedgerReconciliation(reconciliation))
    throw new Error('Reconciliation fixture is invalid');
  return reconciliation;
}

function balances(bnb: string, usdt: string, btcb: string) {
  return [
    {
      assetType: 'native' as const,
      assetSymbol: 'BNB' as const,
      currentQuantity: bnb,
    },
    {
      assetType: 'token' as const,
      assetAddress: USDT,
      currentQuantity: usdt,
    },
    {
      assetType: 'token' as const,
      assetAddress: BTCB,
      currentQuantity: btcb,
    },
  ];
}

type MutableStoredCommitment = {
  -readonly [
    Key in keyof StoredAgenticWalletAccountingLedgerReconciliationCommitment
  ]: Mutable<StoredAgenticWalletAccountingLedgerReconciliationCommitment[Key]>;
};

type Mutable<Value> = Value extends Date
  ? Date
  : Value extends readonly (infer Entry)[]
    ? Mutable<Entry>[]
    : Value extends object
      ? { -readonly [Key in keyof Value]: Mutable<Value[Key]> }
      : Value;
