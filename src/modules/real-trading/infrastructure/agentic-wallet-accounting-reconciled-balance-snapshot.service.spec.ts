import { jest } from '@jest/globals';

import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from '../application/real-execution-instrument-approval';
import { AgenticWalletAccountingLedgerReconciliation } from './agentic-wallet-accounting-ledger-reconciliation';
import { prepareAgenticWalletAccountingLedgerReconciliationCommitment } from './agentic-wallet-accounting-ledger-reconciliation-commitment';
import {
  AgenticWalletAccountingLedgerReconciliationFreshnessAssessment,
  assessAgenticWalletAccountingLedgerReconciliationFreshness,
} from './agentic-wallet-accounting-ledger-reconciliation-freshness';
import {
  AgenticWalletAccountingLatestReconciledBalanceSnapshotRequestError,
  AgenticWalletAccountingLatestReconciledBalanceSnapshotService,
  AgenticWalletAccountingLatestReconciliationFreshnessPort,
} from './agentic-wallet-accounting-reconciled-balance-snapshot.service';

const INITIALIZATION_ID = '00000000-0000-4000-8000-000000000029';
const RECONCILIATION_ID = '00000000-0000-4000-8000-000000000031';
const EVALUATED_AT = new Date('2026-10-16T12:01:30.000Z');
const { usdt, btc } = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;

describe('Agentic Wallet latest reconciled balance snapshot service', () => {
  it('composes latest freshness with the reconciled balance projection', async () => {
    const harness = serviceHarness(freshAssessment());
    const request = validRequest();

    await expect(
      harness.service.loadLatest(INITIALIZATION_ID, request),
    ).resolves.toMatchObject({
      status: 'reconciled_balances_ready',
      blockers: [],
      reconciliationFreshnessStatus: 'reconciliation_evidence_fresh',
      balanceCoverageComplete: true,
      quoteAuthorized: false,
      submissionAuthorized: false,
      snapshot: {
        initializationId: INITIALIZATION_ID,
        reconciliationId: RECONCILIATION_ID,
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
      },
    });
    expect(harness.assessLatest).toHaveBeenCalledTimes(1);
    expect(harness.assessLatest).toHaveBeenCalledWith(INITIALIZATION_ID, {
      maximumAgeMs: 60_000,
      evaluatedAt: EVALUATED_AT,
    });
    expect(harness.assessLatest.mock.calls[0][1]).not.toBe(request);
    expect(harness.assessLatest.mock.calls[0][1].evaluatedAt).not.toBe(
      request.evaluatedAt,
    );
  });

  it('turns durable absence into an explicit fail-closed blocker', async () => {
    await expect(
      serviceHarness(null).service.loadLatest(
        INITIALIZATION_ID,
        validRequest(),
      ),
    ).resolves.toEqual({
      scope:
        'agentic_wallet_accounting_latest_reconciled_balance_snapshot_assessment',
      status: 'blocked',
      blockers: ['accounting_ledger_reconciliation_evidence_absent'],
      reconciliationFreshnessStatus: 'absent',
      snapshot: null,
      balanceCoverageComplete: false,
      quoteAuthorized: false,
      submissionAuthorized: false,
    });
  });

  it('preserves freshness blockers without projecting balances', async () => {
    const blocked = assessAgenticWalletAccountingLedgerReconciliationFreshness(
      validStored(),
      60_000,
      new Date('2026-10-16T12:01:55.001Z'),
    );
    await expect(
      serviceHarness(blocked).service.loadLatest(
        INITIALIZATION_ID,
        validRequest(),
      ),
    ).resolves.toMatchObject({
      status: 'blocked',
      blockers: ['accounting_ledger_reconciliation_evidence_stale'],
      reconciliationFreshnessStatus: 'blocked',
      snapshot: null,
      balanceCoverageComplete: false,
    });
  });

  it.each([
    ['invalid identity', 'invalid', validRequest()],
    [
      'invalid maximum age',
      INITIALIZATION_ID,
      { ...validRequest(), maximumAgeMs: 60_001 },
    ],
    [
      'invalid clock',
      INITIALIZATION_ID,
      { ...validRequest(), evaluatedAt: new Date(Number.NaN) },
    ],
  ] as const)('rejects %s before delegation', async (_name, id, request) => {
    const harness = serviceHarness(null);
    await expect(
      harness.service.loadLatest(id, request),
    ).rejects.toBeInstanceOf(
      AgenticWalletAccountingLatestReconciledBalanceSnapshotRequestError,
    );
    expect(harness.assessLatest).not.toHaveBeenCalled();
  });

  it('captures the mutable evaluation clock before delegation', async () => {
    let release:
      | ((
          value: AgenticWalletAccountingLedgerReconciliationFreshnessAssessment,
        ) => void)
      | null = null;
    const pending =
      new Promise<AgenticWalletAccountingLedgerReconciliationFreshnessAssessment>(
        (resolve) => {
          release = resolve;
        },
      );
    const assessLatest = jest.fn(() => pending);
    const service =
      new AgenticWalletAccountingLatestReconciledBalanceSnapshotService({
        assessLatest,
      });
    const request = validRequest();
    const resultPromise = service.loadLatest(INITIALIZATION_ID, request);

    request.evaluatedAt.setTime(0);
    if (release === null) throw new Error('Freshness delegation did not start');
    release(freshAssessment());

    await expect(resultPromise).resolves.toMatchObject({
      status: 'reconciled_balances_ready',
      snapshot: { evaluatedAt: EVALUATED_AT },
    });
    expect(assessLatest.mock.calls[0][1].evaluatedAt).toEqual(EVALUATED_AT);
  });

  it('fails closed when delegated fresh evidence is malformed', async () => {
    const invalid = freshAssessment();
    if (invalid.evidence === null) throw new Error('Fixture was blocked');
    const malformed = {
      ...invalid,
      evidence: { ...invalid.evidence, maximumAgeMs: 60_001 },
    } as AgenticWalletAccountingLedgerReconciliationFreshnessAssessment;
    await expect(
      serviceHarness(malformed).service.loadLatest(
        INITIALIZATION_ID,
        validRequest(),
      ),
    ).resolves.toMatchObject({
      status: 'blocked',
      blockers: ['invalid_fresh_accounting_ledger_reconciliation_evidence'],
      snapshot: null,
    });
  });

  it('propagates delegated durable failures unchanged', async () => {
    const failure = new Error('latest durable reconciliation inconsistent');
    const assessLatest = jest.fn(() => Promise.reject(failure));
    const service =
      new AgenticWalletAccountingLatestReconciledBalanceSnapshotService({
        assessLatest,
      });
    await expect(
      service.loadLatest(INITIALIZATION_ID, validRequest()),
    ).rejects.toBe(failure);
    expect(assessLatest).toHaveBeenCalledTimes(1);
  });
});

function serviceHarness(
  result: AgenticWalletAccountingLedgerReconciliationFreshnessAssessment | null,
) {
  const assessLatest = jest
    .fn<
      AgenticWalletAccountingLatestReconciliationFreshnessPort['assessLatest']
    >()
    .mockResolvedValue(result);
  return {
    assessLatest,
    service: new AgenticWalletAccountingLatestReconciledBalanceSnapshotService({
      assessLatest,
    }),
  };
}

function validRequest() {
  return {
    maximumAgeMs: 60_000,
    evaluatedAt: new Date(EVALUATED_AT),
  };
}

function freshAssessment() {
  return assessAgenticWalletAccountingLedgerReconciliationFreshness(
    validStored(),
    60_000,
    new Date(EVALUATED_AT),
  );
}

function validStored() {
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
