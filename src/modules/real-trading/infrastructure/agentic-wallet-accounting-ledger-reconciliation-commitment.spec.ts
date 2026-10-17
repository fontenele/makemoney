import {
  ACCOUNTING_BALANCE_INITIALIZATION_ACKNOWLEDGMENT,
  AgenticWalletAccountingBalanceInitialization,
} from './agentic-wallet-accounting-balance-initialization';
import { InitializedAgenticWalletAccountingBalances } from './agentic-wallet-accounting-balance-initialization.store';
import {
  AgenticWalletAccountingLedgerReconciliation,
  reconcileAgenticWalletAccountingLedger,
} from './agentic-wallet-accounting-ledger-reconciliation';
import {
  isValidAgenticWalletAccountingLedgerReconciliationCommitment,
  prepareAgenticWalletAccountingLedgerReconciliationCommitment,
} from './agentic-wallet-accounting-ledger-reconciliation-commitment';
import {
  AgenticWalletAccountingLedgerBalance,
  assessAgenticWalletAccountingLedgerSnapshot,
} from './agentic-wallet-accounting-ledger-snapshot';
import { AgenticWalletCapabilityObservation } from './agentic-wallet-capability.adapter';

const INITIALIZATION_ID = '018f1f54-7b8c-7a9d-8e0f-123456789abc';
const RECONCILIATION_ID = '018f1f54-7b8c-7a9d-8e0f-123456789abd';
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';
const RECONCILED_AT = new Date('2026-10-16T12:01:00.000Z');
const PREPARED_AT = new Date('2026-10-16T12:01:01.000Z');

describe('Agentic Wallet accounting ledger reconciliation commitment', () => {
  it('prepares a canonical non-authorizing commitment', () => {
    const result = prepareAgenticWalletAccountingLedgerReconciliationCommitment(
      validReconciliation(),
      RECONCILIATION_ID,
      PREPARED_AT,
    );

    expect(result).toMatchObject({
      status: 'reconciliation_commitment_ready',
      blockers: [],
      reconciliationEvidencePrepared: true,
      walletObservationAuthenticated: true,
      ledgerBalancesReconciled: true,
      quoteAuthorized: false,
      submissionAuthorized: false,
      commitment: {
        reconciliationId: RECONCILIATION_ID,
        reconciliationEvidencePrepared: true,
        quoteAuthorized: false,
        submissionAuthorized: false,
      },
    });
    expect(result.commitment?.reconciliationFingerprint).toMatch(
      /^[0-9a-f]{64}$/,
    );
    expect(
      isValidAgenticWalletAccountingLedgerReconciliationCommitment(
        result.commitment,
      ),
    ).toBe(true);
  });

  it('canonicalizes balance order into the same fingerprint', () => {
    const reconciliation = validReconciliation();
    const reordered = {
      ...reconciliation,
      ledgerSnapshot: {
        ...reconciliation.ledgerSnapshot,
        initialBalances: [
          ...reconciliation.ledgerSnapshot.initialBalances,
        ].reverse(),
        currentBalances: [
          ...reconciliation.ledgerSnapshot.currentBalances,
        ].reverse(),
      },
      walletBalances: [...reconciliation.walletBalances].reverse(),
    };

    const first = prepareAgenticWalletAccountingLedgerReconciliationCommitment(
      reconciliation,
      RECONCILIATION_ID,
      PREPARED_AT,
    ).commitment;
    const second = prepareAgenticWalletAccountingLedgerReconciliationCommitment(
      reordered,
      RECONCILIATION_ID,
      PREPARED_AT,
    ).commitment;
    expect(second?.reconciliationFingerprint).toBe(
      first?.reconciliationFingerprint,
    );
  });

  it('defensively snapshots nested balances and dates', () => {
    const reconciliation = validReconciliation();
    const result = prepareAgenticWalletAccountingLedgerReconciliationCommitment(
      reconciliation,
      RECONCILIATION_ID,
      PREPARED_AT,
    );
    if (result.commitment === null) throw new Error('Commitment was blocked');

    expect(result.commitment.reconciliation).not.toBe(reconciliation);
    expect(result.commitment.reconciliation.walletBalances).not.toBe(
      reconciliation.walletBalances,
    );
    expect(result.commitment.preparedAt).not.toBe(PREPARED_AT);
    reconciliation.walletObservedAt.setUTCFullYear(2030);
    expect(
      result.commitment.reconciliation.walletObservedAt.toISOString(),
    ).toBe('2026-10-16T12:00:55.000Z');
  });

  it('blocks malformed reconciliation evidence', () => {
    const reconciliation = {
      ...validReconciliation(),
      ledgerBalancesReconciled: false,
    } as unknown as AgenticWalletAccountingLedgerReconciliation;
    const result = prepareAgenticWalletAccountingLedgerReconciliationCommitment(
      reconciliation,
      RECONCILIATION_ID,
      PREPARED_AT,
    );
    expect(result.blockers).toEqual([
      'invalid_accounting_ledger_reconciliation',
    ]);
    expect(result.commitment).toBeNull();
    expect(result.ledgerBalancesReconciled).toBe(false);
  });

  it.each(['invalid', INITIALIZATION_ID.toUpperCase()])(
    'blocks invalid reconciliation identity %s',
    (reconciliationId) => {
      const result =
        prepareAgenticWalletAccountingLedgerReconciliationCommitment(
          validReconciliation(),
          reconciliationId,
          PREPARED_AT,
        );
      expect(result.blockers).toContain(
        'invalid_accounting_ledger_reconciliation_identity',
      );
      expect(result.commitment).toBeNull();
    },
  );

  it('blocks an invalid preparation clock', () => {
    const result = prepareAgenticWalletAccountingLedgerReconciliationCommitment(
      validReconciliation(),
      RECONCILIATION_ID,
      new Date('invalid'),
    );
    expect(result.blockers).toContain(
      'invalid_accounting_ledger_reconciliation_prepared_at',
    );
  });

  it('blocks preparation before reconciliation', () => {
    const result = prepareAgenticWalletAccountingLedgerReconciliationCommitment(
      validReconciliation(),
      RECONCILIATION_ID,
      new Date('2026-10-16T12:00:59.999Z'),
    );
    expect(result.blockers).toContain(
      'accounting_ledger_reconciliation_preparation_predates_reconciliation',
    );
  });

  it('rejects a commitment with a changed fingerprint or authority flag', () => {
    const commitment =
      prepareAgenticWalletAccountingLedgerReconciliationCommitment(
        validReconciliation(),
        RECONCILIATION_ID,
        PREPARED_AT,
      ).commitment;
    expect(
      isValidAgenticWalletAccountingLedgerReconciliationCommitment({
        ...commitment,
        reconciliationFingerprint: '0'.repeat(64),
      }),
    ).toBe(false);
    expect(
      isValidAgenticWalletAccountingLedgerReconciliationCommitment({
        ...commitment,
        quoteAuthorized: true,
      }),
    ).toBe(false);
  });
});

function validReconciliation(): AgenticWalletAccountingLedgerReconciliation {
  const snapshot = assessAgenticWalletAccountingLedgerSnapshot(
    validReceipt(),
    validBalances(),
    new Date('2026-10-16T12:00:55.000Z'),
  ).snapshot;
  if (snapshot === null) throw new Error('Test snapshot was blocked');
  const reconciliation = reconcileAgenticWalletAccountingLedger(
    snapshot,
    validObservation(),
    { maximumObservationAgeMs: 30_000, evaluatedAt: new Date(RECONCILED_AT) },
  ).reconciliation;
  if (reconciliation === null)
    throw new Error('Test reconciliation was blocked');
  return reconciliation;
}

function validObservation(): AgenticWalletCapabilityObservation {
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
      observedAt: new Date('2026-10-16T12:00:55.000Z'),
    },
    settings: null,
    quota: null,
    addresses: [{ chainId: '56', address: '0xwallet' }],
    balances: [
      { chainId: '56', tokenAddress: USDT, symbol: 'USDT', quantity: '900' },
      { chainId: '56', tokenAddress: BTCB, symbol: 'BTCB', quantity: '0.126' },
      {
        chainId: '56',
        tokenAddress: 'native-bnb',
        symbol: 'BNB',
        quantity: '1.9',
      },
    ],
    gas: null,
  };
}

function validBalances(): AgenticWalletAccountingLedgerBalance[] {
  const updatedAt = new Date('2026-10-16T12:00:50.000Z');
  return [
    {
      assetType: 'native',
      assetSymbol: 'BNB',
      currentQuantity: '1.9',
      updatedAt,
    },
    {
      assetType: 'token',
      assetAddress: USDT,
      currentQuantity: '900',
      updatedAt,
    },
    {
      assetType: 'token',
      assetAddress: BTCB,
      currentQuantity: '0.126',
      updatedAt,
    },
  ];
}

function validReceipt(): InitializedAgenticWalletAccountingBalances {
  return {
    scope: 'initialized_agentic_wallet_accounting_balances',
    initialization: validInitialization(),
    initializedAt: new Date('2026-10-16T12:00:25.000Z'),
    accountingBalancesInitialized: true,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
}

function validInitialization(): AgenticWalletAccountingBalanceInitialization {
  return {
    scope: 'agentic_wallet_accounting_balance_initialization',
    initializationId: INITIALIZATION_ID,
    providerId: 'agentic_wallet',
    chainId: '56',
    acknowledgment: ACCOUNTING_BALANCE_INITIALIZATION_ACKNOWLEDGMENT,
    balances: [
      { assetType: 'native', assetSymbol: 'BNB', currentQuantity: '2' },
      { assetType: 'token', assetAddress: USDT, currentQuantity: '1000.5' },
      { assetType: 'token', assetAddress: BTCB, currentQuantity: '0.125' },
    ],
    balanceCoverageComplete: true,
    walletObservedAt: new Date('2026-10-16T12:00:00.000Z'),
    maximumObservationAgeMs: 30_000,
    preparedAt: new Date('2026-10-16T12:00:20.000Z'),
    accountingBalanceInitializationPrepared: true,
    accountingBalancesInitialized: false,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
}
