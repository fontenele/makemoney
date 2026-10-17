import { jest } from '@jest/globals';

import { AgenticWalletAccountingLedgerReconciliation } from './agentic-wallet-accounting-ledger-reconciliation';
import { prepareAgenticWalletAccountingLedgerReconciliationCommitment } from './agentic-wallet-accounting-ledger-reconciliation-commitment';
import {
  AgenticWalletAccountingLedgerReconciliationCommitmentReadStore,
  StoredAgenticWalletAccountingLedgerReconciliationCommitment,
} from './agentic-wallet-accounting-ledger-reconciliation-commitment.store';
import {
  AgenticWalletAccountingLedgerReconciliationFreshnessRequestError,
  AgenticWalletAccountingLedgerReconciliationFreshnessService,
} from './agentic-wallet-accounting-ledger-reconciliation-freshness.service';

const INITIALIZATION_ID = '018f1f54-7b8c-7a9d-8e0f-123456789abc';
const RECONCILIATION_ID = '018f1f54-7b8c-7a9d-8e0f-123456789abd';
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';

describe('AgenticWalletAccountingLedgerReconciliationFreshnessService', () => {
  it('loads durable evidence and applies the freshness policy', async () => {
    const harness = serviceHarness(validStored());
    await expect(
      harness.service.assess(RECONCILIATION_ID, validRequest()),
    ).resolves.toMatchObject({
      status: 'reconciliation_evidence_fresh',
      blockers: [],
      evidence: {
        stored: {
          commitment: { reconciliationId: RECONCILIATION_ID },
        },
        reconciliationCurrent: true,
        quoteAuthorized: false,
        submissionAuthorized: false,
      },
    });
    expect(harness.getByReconciliationId).toHaveBeenCalledWith(
      RECONCILIATION_ID,
    );
  });

  it('returns explicit absence without fabricating freshness state', async () => {
    await expect(
      serviceHarness(null).service.assess(RECONCILIATION_ID, validRequest()),
    ).resolves.toBeNull();
  });

  it.each([
    ['invalid identity', 'invalid', validRequest()],
    [
      'invalid maximum age',
      RECONCILIATION_ID,
      { ...validRequest(), maximumAgeMs: 60_001 },
    ],
    [
      'invalid evaluation clock',
      RECONCILIATION_ID,
      { ...validRequest(), evaluatedAt: new Date(Number.NaN) },
    ],
  ] as const)(
    'rejects %s before durable access',
    async (_name, id, request) => {
      const harness = serviceHarness(null);
      await expect(harness.service.assess(id, request)).rejects.toBeInstanceOf(
        AgenticWalletAccountingLedgerReconciliationFreshnessRequestError,
      );
      expect(harness.getByReconciliationId).not.toHaveBeenCalled();
    },
  );

  it('isolates the evaluation clock before the asynchronous read', async () => {
    let release:
      | ((
          stored: StoredAgenticWalletAccountingLedgerReconciliationCommitment,
        ) => void)
      | null = null;
    const pending =
      new Promise<StoredAgenticWalletAccountingLedgerReconciliationCommitment>(
        (resolve) => {
          release = resolve;
        },
      );
    const getByReconciliationId = jest
      .fn<
        AgenticWalletAccountingLedgerReconciliationCommitmentReadStore['getByReconciliationId']
      >()
      .mockReturnValue(pending);
    const service =
      new AgenticWalletAccountingLedgerReconciliationFreshnessService({
        getByReconciliationId,
      });
    const request = validRequest();
    const resultPromise = service.assess(RECONCILIATION_ID, request);

    request.evaluatedAt.setTime(0);
    if (release === null) throw new Error('Durable read did not start');
    release(validStored());

    await expect(resultPromise).resolves.toMatchObject({
      status: 'reconciliation_evidence_fresh',
      evidence: { evaluatedAt: new Date('2026-10-16T12:01:30.000Z') },
    });
  });

  it('preserves the pure stale-evidence blocker', async () => {
    await expect(
      serviceHarness(validStored()).service.assess(RECONCILIATION_ID, {
        maximumAgeMs: 60_000,
        evaluatedAt: new Date('2026-10-16T12:01:55.001Z'),
      }),
    ).resolves.toMatchObject({
      status: 'blocked',
      blockers: ['accounting_ledger_reconciliation_evidence_stale'],
      evidence: null,
    });
  });

  it('propagates durable inconsistency without converting it to absence', async () => {
    const failure = new Error('persisted reconciliation inconsistent');
    const getByReconciliationId = jest
      .fn<
        AgenticWalletAccountingLedgerReconciliationCommitmentReadStore['getByReconciliationId']
      >()
      .mockRejectedValue(failure);
    const service =
      new AgenticWalletAccountingLedgerReconciliationFreshnessService({
        getByReconciliationId,
      });
    await expect(
      service.assess(RECONCILIATION_ID, validRequest()),
    ).rejects.toBe(failure);
  });
});

function serviceHarness(
  stored: StoredAgenticWalletAccountingLedgerReconciliationCommitment | null,
) {
  const getByReconciliationId = jest
    .fn<
      AgenticWalletAccountingLedgerReconciliationCommitmentReadStore['getByReconciliationId']
    >()
    .mockResolvedValue(stored);
  return {
    getByReconciliationId,
    service: new AgenticWalletAccountingLedgerReconciliationFreshnessService({
      getByReconciliationId,
    }),
  };
}

function validRequest() {
  return {
    maximumAgeMs: 60_000,
    evaluatedAt: new Date('2026-10-16T12:01:30.000Z'),
  };
}

function validStored(): StoredAgenticWalletAccountingLedgerReconciliationCommitment {
  const commitment =
    prepareAgenticWalletAccountingLedgerReconciliationCommitment(
      validReconciliation(),
      RECONCILIATION_ID,
      new Date('2026-10-16T12:01:01.000Z'),
    ).commitment;
  if (commitment === null) throw new Error('Commitment fixture was blocked');
  return {
    commitment,
    recordedAt: new Date('2026-10-16T12:01:02.000Z'),
  };
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
