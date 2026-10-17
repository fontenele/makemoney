import { jest } from '@jest/globals';

import {
  ACCOUNTING_BALANCE_INITIALIZATION_ACKNOWLEDGMENT,
  AgenticWalletAccountingBalanceInitialization,
} from './agentic-wallet-accounting-balance-initialization';
import { InitializedAgenticWalletAccountingBalances } from './agentic-wallet-accounting-balance-initialization.store';
import {
  AgenticWalletAccountingLedgerReconciliationRequestError,
  AgenticWalletAccountingLedgerReconciliationService,
} from './agentic-wallet-accounting-ledger-reconciliation.service';
import {
  AgenticWalletAccountingLedgerBalance,
  AgenticWalletAccountingLedgerSnapshot,
  assessAgenticWalletAccountingLedgerSnapshot,
} from './agentic-wallet-accounting-ledger-snapshot';
import { AgenticWalletAccountingLedgerSnapshotReadStore } from './agentic-wallet-accounting-ledger-snapshot.store';
import { AgenticWalletCapabilityObservation } from './agentic-wallet-capability.adapter';

const INITIALIZATION_ID = '018f1f54-7b8c-7a9d-8e0f-123456789abc';
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';
const EVALUATED_AT = new Date('2026-10-16T12:01:00.000Z');

describe('Agentic Wallet accounting ledger reconciliation service', () => {
  it('loads durable current balances and applies the reconciliation policy', async () => {
    const harness = serviceHarness(validSnapshot());
    const request = validRequest();

    await expect(
      harness.service.reconcile(INITIALIZATION_ID, validObservation(), request),
    ).resolves.toMatchObject({
      status: 'accounting_ledger_reconciled',
      blockers: [],
      reconciliation: {
        initializationId: INITIALIZATION_ID,
        ledgerBalancesReconciled: true,
        quoteAuthorized: false,
        submissionAuthorized: false,
      },
    });
    expect(harness.getByInitializationId).toHaveBeenCalledWith(
      INITIALIZATION_ID,
      EVALUATED_AT,
    );
    expect(harness.getByInitializationId.mock.calls[0][1]).not.toBe(
      request.evaluatedAt,
    );
  });

  it('returns explicit absence without fabricating reconciliation state', async () => {
    await expect(
      serviceHarness(null).service.reconcile(
        INITIALIZATION_ID,
        validObservation(),
        validRequest(),
      ),
    ).resolves.toBeNull();
  });

  it.each([
    ['invalid identity', 'invalid', validRequest()],
    [
      'invalid request',
      INITIALIZATION_ID,
      { ...validRequest(), maximumObservationAgeMs: 60_001 },
    ],
  ] as const)(
    'rejects %s before durable access',
    async (_name, id, request) => {
      const harness = serviceHarness(null);
      await expect(
        harness.service.reconcile(id, validObservation(), request),
      ).rejects.toBeInstanceOf(
        AgenticWalletAccountingLedgerReconciliationRequestError,
      );
      expect(harness.getByInitializationId).not.toHaveBeenCalled();
    },
  );

  it('returns the pure policy blocker when wallet quantities diverge', async () => {
    const observation = validObservation();
    const balances = observation.balances.map((balance) =>
      balance.symbol === 'USDT' ? { ...balance, quantity: '899' } : balance,
    );
    await expect(
      serviceHarness(validSnapshot()).service.reconcile(
        INITIALIZATION_ID,
        { ...observation, balances },
        validRequest(),
      ),
    ).resolves.toMatchObject({
      status: 'blocked',
      blockers: ['wallet_accounting_balance_mismatch'],
      reconciliation: null,
    });
  });

  it('isolates request and observation dates before the asynchronous read', async () => {
    let release:
      ((snapshot: AgenticWalletAccountingLedgerSnapshot) => void) | null = null;
    const pending = new Promise<AgenticWalletAccountingLedgerSnapshot>(
      (resolve) => {
        release = resolve;
      },
    );
    const getByInitializationId = jest
      .fn<
        AgenticWalletAccountingLedgerSnapshotReadStore['getByInitializationId']
      >()
      .mockReturnValue(pending);
    const service = new AgenticWalletAccountingLedgerReconciliationService({
      getByInitializationId,
    });
    const request = validRequest();
    const observation = validObservation();
    const resultPromise = service.reconcile(
      INITIALIZATION_ID,
      observation,
      request,
    );

    request.evaluatedAt.setTime(0);
    observation.capabilities.observedAt.setTime(0);
    if (release === null) throw new Error('Snapshot read did not start');
    release(validSnapshot());

    await expect(resultPromise).resolves.toMatchObject({
      status: 'accounting_ledger_reconciled',
      reconciliation: {
        walletObservedAt: new Date('2026-10-16T12:00:55.000Z'),
        reconciledAt: EVALUATED_AT,
      },
    });
  });

  it('propagates durable snapshot inconsistency without converting it to absence', async () => {
    const failure = new Error('persisted snapshot inconsistent');
    const getByInitializationId = jest
      .fn<
        AgenticWalletAccountingLedgerSnapshotReadStore['getByInitializationId']
      >()
      .mockRejectedValue(failure);
    const service = new AgenticWalletAccountingLedgerReconciliationService({
      getByInitializationId,
    });
    await expect(
      service.reconcile(INITIALIZATION_ID, validObservation(), validRequest()),
    ).rejects.toBe(failure);
  });
});

function serviceHarness(
  snapshot: AgenticWalletAccountingLedgerSnapshot | null,
) {
  const getByInitializationId = jest
    .fn<
      AgenticWalletAccountingLedgerSnapshotReadStore['getByInitializationId']
    >()
    .mockResolvedValue(snapshot);
  return {
    getByInitializationId,
    service: new AgenticWalletAccountingLedgerReconciliationService({
      getByInitializationId,
    }),
  };
}

function validRequest() {
  return {
    maximumObservationAgeMs: 30_000,
    evaluatedAt: new Date(EVALUATED_AT),
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
