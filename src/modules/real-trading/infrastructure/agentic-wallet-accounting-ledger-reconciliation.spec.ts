import {
  ACCOUNTING_BALANCE_INITIALIZATION_ACKNOWLEDGMENT,
  AgenticWalletAccountingBalanceInitialization,
} from './agentic-wallet-accounting-balance-initialization';
import { InitializedAgenticWalletAccountingBalances } from './agentic-wallet-accounting-balance-initialization.store';
import {
  isValidAgenticWalletAccountingLedgerReconciliation,
  reconcileAgenticWalletAccountingLedger,
} from './agentic-wallet-accounting-ledger-reconciliation';
import {
  AgenticWalletAccountingLedgerBalance,
  AgenticWalletAccountingLedgerSnapshot,
  assessAgenticWalletAccountingLedgerSnapshot,
} from './agentic-wallet-accounting-ledger-snapshot';
import { AgenticWalletCapabilityObservation } from './agentic-wallet-capability.adapter';

const INITIALIZATION_ID = '018f1f54-7b8c-7a9d-8e0f-123456789abc';
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';
const RECONCILED_AT = new Date('2026-10-16T12:01:00.000Z');

describe('Agentic Wallet accounting ledger reconciliation', () => {
  it('reconciles the complete ledger with a fresh authenticated wallet observation', () => {
    const snapshot = validSnapshot();
    const observation = validObservation();
    const result = reconcileAgenticWalletAccountingLedger(
      snapshot,
      observation,
      validRequest(),
    );

    expect(result).toMatchObject({
      status: 'accounting_ledger_reconciled',
      blockers: [],
      reconciliation: {
        initializationId: INITIALIZATION_ID,
        walletObservationAuthenticated: true,
        ledgerBalancesReconciled: true,
        quoteAuthorized: false,
        submissionAuthorized: false,
      },
      ledgerBalancesReconciled: true,
      quoteAuthorized: false,
      submissionAuthorized: false,
    });
    expect(
      isValidAgenticWalletAccountingLedgerReconciliation(result.reconciliation),
    ).toBe(true);
  });

  it.each([
    ['USDT', 0, '899.999'],
    ['BTCB', 1, '0.124'],
    ['BNB', 2, '1.899'],
  ] as const)('blocks a mismatched %s quantity', (_name, index, quantity) => {
    const observation = validObservation();
    observation.balances[index] = {
      ...observation.balances[index],
      quantity,
    };
    const result = reconcileAgenticWalletAccountingLedger(
      validSnapshot(),
      observation,
      validRequest(),
    );

    expect(result.blockers).toContain('wallet_accounting_balance_mismatch');
    expect(result.reconciliation).toBeNull();
    expect(result.ledgerBalancesReconciled).toBe(false);
  });

  it('accepts numerically equal noncanonical provider decimal spellings', () => {
    const observation = validObservation();
    observation.balances[0] = {
      ...observation.balances[0],
      quantity: '900.0000',
    };
    expect(
      reconcileAgenticWalletAccountingLedger(
        validSnapshot(),
        observation,
        validRequest(),
      ).status,
    ).toBe('accounting_ledger_reconciled');
  });

  it.each([
    ['disconnected wallet', false, true],
    ['balance read unavailable', true, false],
  ] as const)('blocks a %s observation', (_name, connected, balances) => {
    const observation = validObservation();
    observation.capabilities = {
      ...observation.capabilities,
      connected,
      reads: {
        ...observation.capabilities.reads,
        balances,
      },
    };
    expect(
      reconcileAgenticWalletAccountingLedger(
        validSnapshot(),
        observation,
        validRequest(),
      ).blockers,
    ).toContain('wallet_observation_invalid_or_unavailable');
  });

  it.each([
    ['future', new Date('2026-10-16T12:01:00.001Z')],
    ['stale', new Date('2026-10-16T12:00:29.999Z')],
  ] as const)('blocks a %s wallet observation', (_name, observedAt) => {
    const observation = validObservation();
    observation.capabilities.observedAt = observedAt;
    expect(
      reconcileAgenticWalletAccountingLedger(
        validSnapshot(),
        observation,
        validRequest(),
      ).blockers,
    ).toContain('wallet_observation_invalid_or_unavailable');
  });

  it('blocks a wallet observation made before the latest ledger update', () => {
    const observation = validObservation();
    observation.capabilities.observedAt = new Date('2026-10-16T12:00:49.999Z');
    const result = reconcileAgenticWalletAccountingLedger(
      validSnapshot(),
      observation,
      validRequest(),
    );
    expect(result.blockers).toContain('wallet_observation_predates_ledger');
  });

  it('blocks reconciliation evaluation before the ledger snapshot evaluation', () => {
    const request = {
      ...validRequest(),
      evaluatedAt: new Date('2026-10-16T12:00:54.999Z'),
    };
    const observation = validObservation();
    observation.capabilities.observedAt = new Date('2026-10-16T12:00:54.000Z');
    expect(
      reconcileAgenticWalletAccountingLedger(
        validSnapshot(),
        observation,
        request,
      ).blockers,
    ).toContain('accounting_ledger_reconciliation_chronology_invalid');
  });

  it.each([
    ['invalid age', { maximumObservationAgeMs: 60_001 }],
    ['invalid clock', { evaluatedAt: new Date('invalid') }],
  ] as const)('rejects an %s request', (_name, mutation) => {
    const result = reconcileAgenticWalletAccountingLedger(
      validSnapshot(),
      validObservation(),
      { ...validRequest(), ...mutation },
    );
    expect(result.blockers).toContain(
      'invalid_accounting_ledger_reconciliation_request',
    );
  });

  it('rejects a malformed ledger snapshot', () => {
    const snapshot = {
      ...validSnapshot(),
      submissionAuthorized: true,
    } as unknown as AgenticWalletAccountingLedgerSnapshot;
    expect(
      reconcileAgenticWalletAccountingLedger(
        snapshot,
        validObservation(),
        validRequest(),
      ).blockers,
    ).toEqual(['invalid_accounting_ledger_snapshot']);
  });

  it('returns defensive snapshots and rejects mutated output', () => {
    const snapshot = validSnapshot();
    const observation = validObservation();
    const reconciliation = reconcileAgenticWalletAccountingLedger(
      snapshot,
      observation,
      validRequest(),
    ).reconciliation;
    if (reconciliation === null) throw new Error('Reconciliation was blocked');

    expect(reconciliation.ledgerSnapshot).not.toBe(snapshot);
    expect(reconciliation.walletBalances).not.toBe(observation.balances);
    expect(reconciliation.walletObservedAt).not.toBe(
      observation.capabilities.observedAt,
    );
    expect(
      isValidAgenticWalletAccountingLedgerReconciliation({
        ...reconciliation,
        quoteAuthorized: true,
      }),
    ).toBe(false);
    expect(
      isValidAgenticWalletAccountingLedgerReconciliation({
        ...reconciliation,
        walletBalances: reconciliation.walletBalances.map((balance, index) =>
          index === 0 ? { ...balance, assetSymbol: 'USDT' } : balance,
        ),
      }),
    ).toBe(false);
  });
});

function validRequest() {
  return {
    maximumObservationAgeMs: 30_000,
    evaluatedAt: new Date(RECONCILED_AT),
  };
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
      {
        chainId: '56',
        tokenAddress: BTCB,
        symbol: 'BTCB',
        quantity: '0.126',
      },
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

function validSnapshot(): AgenticWalletAccountingLedgerSnapshot {
  const snapshot = assessAgenticWalletAccountingLedgerSnapshot(
    validReceipt(),
    validBalances(),
    new Date('2026-10-16T12:00:55.000Z'),
  ).snapshot;
  if (snapshot === null) throw new Error('Test snapshot was blocked');
  return snapshot;
}

function validBalances(): AgenticWalletAccountingLedgerBalance[] {
  return [
    {
      assetType: 'native',
      assetSymbol: 'BNB',
      currentQuantity: '1.9',
      updatedAt: new Date('2026-10-16T12:00:50.000Z'),
    },
    {
      assetType: 'token',
      assetAddress: USDT,
      currentQuantity: '900',
      updatedAt: new Date('2026-10-16T12:00:50.000Z'),
    },
    {
      assetType: 'token',
      assetAddress: BTCB,
      currentQuantity: '0.126',
      updatedAt: new Date('2026-10-16T12:00:50.000Z'),
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
