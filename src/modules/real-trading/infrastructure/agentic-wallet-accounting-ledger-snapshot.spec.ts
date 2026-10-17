import {
  ACCOUNTING_BALANCE_INITIALIZATION_ACKNOWLEDGMENT,
  AgenticWalletAccountingBalanceInitialization,
} from './agentic-wallet-accounting-balance-initialization';
import { InitializedAgenticWalletAccountingBalances } from './agentic-wallet-accounting-balance-initialization.store';
import {
  AgenticWalletAccountingLedgerBalance,
  assessAgenticWalletAccountingLedgerSnapshot,
  isValidAgenticWalletAccountingLedgerSnapshot,
} from './agentic-wallet-accounting-ledger-snapshot';

const INITIALIZATION_ID = '018f1f54-7b8c-7a9d-8e0f-123456789abc';
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';
const INITIALIZED_AT = new Date('2026-10-16T12:00:25.000Z');
const EVALUATED_AT = new Date('2026-10-16T12:01:00.000Z');

describe('Agentic Wallet accounting ledger snapshot', () => {
  it('prepares a defensive exact current-ledger snapshot', () => {
    const receipt = validReceipt();
    const balances = validBalances();

    const result = assessAgenticWalletAccountingLedgerSnapshot(
      receipt,
      balances,
      EVALUATED_AT,
    );

    expect(result).toMatchObject({
      status: 'accounting_ledger_snapshot_ready',
      blockers: [],
      snapshot: {
        initializationId: INITIALIZATION_ID,
        ledgerCoverageComplete: true,
        accountingBalancesInitialized: true,
        quoteAuthorized: false,
        submissionAuthorized: false,
      },
    });
    expect(result.snapshot?.currentBalances).toEqual(balances);
    expect(isValidAgenticWalletAccountingLedgerSnapshot(result.snapshot)).toBe(
      true,
    );
    expect(result.snapshot?.currentBalances).not.toBe(balances);
    expect(result.snapshot?.initialBalances).not.toBe(
      receipt.initialization.balances,
    );
    expect(result.snapshot?.evaluatedAt).not.toBe(EVALUATED_AT);
  });

  it.each([
    [
      'missing balance',
      (balances: AgenticWalletAccountingLedgerBalance[]) => balances.slice(1),
    ],
    [
      'extra balance',
      (balances: AgenticWalletAccountingLedgerBalance[]) => [
        ...balances,
        balances[0],
      ],
    ],
    [
      'duplicate balance',
      (balances: AgenticWalletAccountingLedgerBalance[]) => [
        balances[0],
        balances[0],
        balances[2],
      ],
    ],
  ] as const)('blocks %s coverage', (_name, mutate) => {
    const result = assessAgenticWalletAccountingLedgerSnapshot(
      validReceipt(),
      mutate(validBalances()),
      EVALUATED_AT,
    );
    expect(result.status).toBe('blocked');
    expect(result.blockers).toContain('accounting_ledger_coverage_incomplete');
    expect(result.snapshot).toBeNull();
  });

  it.each([
    [
      'unknown token',
      { assetAddress: '0x1111111111111111111111111111111111111111' },
    ],
    ['noncanonical quantity', { currentQuantity: '1.0' }],
    ['invalid date', { updatedAt: new Date('invalid') }],
    ['mixed native identity', { assetAddress: USDT }],
  ] as const)('blocks a %s', (_name, mutation) => {
    const balances = validBalances();
    balances[0] = {
      ...balances[0],
      ...mutation,
    };
    const result = assessAgenticWalletAccountingLedgerSnapshot(
      validReceipt(),
      balances,
      EVALUATED_AT,
    );
    expect(result.status).toBe('blocked');
    expect(result.blockers).toContain(
      'accounting_ledger_balance_identity_mismatch',
    );
  });

  it.each([
    ['before initialization', new Date('2026-10-16T12:00:24.999Z')],
    ['after evaluation', new Date('2026-10-16T12:01:00.001Z')],
  ] as const)('blocks balance updates %s', (_name, updatedAt) => {
    const balances = validBalances();
    balances[1] = { ...balances[1], updatedAt };
    const result = assessAgenticWalletAccountingLedgerSnapshot(
      validReceipt(),
      balances,
      EVALUATED_AT,
    );
    expect(result.blockers).toContain(
      'accounting_ledger_balance_chronology_invalid',
    );
  });

  it('blocks an evaluation before initialization', () => {
    const result = assessAgenticWalletAccountingLedgerSnapshot(
      validReceipt(),
      validBalances(),
      new Date('2026-10-16T12:00:24.999Z'),
    );
    expect(result.blockers).toContain(
      'accounting_ledger_balance_chronology_invalid',
    );
  });

  it('blocks an invalid initialization receipt and invalid request', () => {
    const receipt = {
      ...validReceipt(),
      submissionAuthorized: true,
    } as unknown as InitializedAgenticWalletAccountingBalances;
    const result = assessAgenticWalletAccountingLedgerSnapshot(
      receipt,
      validBalances(),
      new Date('invalid'),
    );
    expect(result.blockers).toEqual([
      'invalid_accounting_initialization_receipt',
      'invalid_accounting_ledger_snapshot_request',
    ]);
    expect(result.accountingBalancesInitialized).toBe(false);
  });

  it('rejects mutated output structure', () => {
    const snapshot = assessAgenticWalletAccountingLedgerSnapshot(
      validReceipt(),
      validBalances(),
      EVALUATED_AT,
    ).snapshot;
    expect(snapshot).not.toBeNull();
    expect(
      isValidAgenticWalletAccountingLedgerSnapshot({
        ...snapshot,
        quoteAuthorized: true,
      }),
    ).toBe(false);
    expect(
      isValidAgenticWalletAccountingLedgerSnapshot({
        ...snapshot,
        initializationId: 'invalid',
      }),
    ).toBe(false);
  });
});

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
    initializedAt: new Date(INITIALIZED_AT),
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
