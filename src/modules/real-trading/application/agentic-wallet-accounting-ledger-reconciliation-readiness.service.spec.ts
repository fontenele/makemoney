import { jest } from '@jest/globals';

import {
  AgenticWalletAccountingLatestReconciledBalanceSnapshotPort,
  AgenticWalletAccountingLedgerReconciliationReadinessRequestError,
  AgenticWalletAccountingLedgerReconciliationReadinessService,
} from './agentic-wallet-accounting-ledger-reconciliation-readiness.service';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from './real-execution-instrument-approval';
import { AgenticWalletAccountingLedgerReconciliation } from '../infrastructure/agentic-wallet-accounting-ledger-reconciliation';
import { prepareAgenticWalletAccountingLedgerReconciliationCommitment } from '../infrastructure/agentic-wallet-accounting-ledger-reconciliation-commitment';
import { assessAgenticWalletAccountingLedgerReconciliationFreshness } from '../infrastructure/agentic-wallet-accounting-ledger-reconciliation-freshness';
import { AgenticWalletAccountingLatestReconciledBalanceSnapshotService } from '../infrastructure/agentic-wallet-accounting-reconciled-balance-snapshot.service';

const INITIALIZATION_ID = '00000000-0000-4000-8000-000000000029';
const RECONCILIATION_ID = '00000000-0000-4000-8000-000000000031';
const EVALUATED_AT = new Date('2026-10-16T12:01:30.000Z');
const { usdt, btc } = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;

describe('AgenticWalletAccountingLedgerReconciliationReadinessService', () => {
  it('projects fresh durable evidence without exposing balance quantities', async () => {
    const harness = createHarness(await readyAssessment());

    const result = await harness.service.assess(validRequest());
    expect(result.reconciliationFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(result).toEqual({
      scope: 'agentic_wallet_accounting_ledger_reconciliation_readiness',
      status: 'fresh_reconciled_balances_ready',
      blockers: [],
      initializationId: INITIALIZATION_ID,
      reconciliationId: RECONCILIATION_ID,
      reconciliationFingerprint: result.reconciliationFingerprint,
      maximumAgeMs: 60_000,
      evidenceAgeMs: 35_000,
      walletObservedAt: new Date('2026-10-16T12:00:55.000Z'),
      evaluatedAt: EVALUATED_AT,
      reconciliationFreshnessStatus: 'reconciliation_evidence_fresh',
      balanceCoverageComplete: true,
      providerReadStarted: false,
      balanceQuantitiesExposed: false,
      quoteAuthorized: false,
      submissionAuthorized: false,
      strategyExecutionAuthorized: false,
      automaticRetryAllowed: false,
    });
    expect(harness.loadLatest).toHaveBeenCalledWith(INITIALIZATION_ID, {
      maximumAgeMs: 60_000,
      evaluatedAt: EVALUATED_AT,
    });
  });

  it('preserves absence and stale blockers without provider access', async () => {
    const absent = createHarness({
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

    await expect(absent.service.assess(validRequest())).resolves.toMatchObject({
      status: 'blocked',
      blockers: ['accounting_ledger_reconciliation_evidence_absent'],
      reconciliationId: null,
      evidenceAgeMs: null,
      providerReadStarted: false,
      balanceQuantitiesExposed: false,
    });
  });

  it.each([
    null,
    { initializationId: 'invalid', maximumAgeMs: 60_000 },
    { initializationId: INITIALIZATION_ID, maximumAgeMs: 60_001 },
    { ...validRequest(), extra: true },
  ])('rejects malformed input before durable access', async (request) => {
    const harness = createHarness(await readyAssessment());

    await expect(harness.service.assess(request)).rejects.toBeInstanceOf(
      AgenticWalletAccountingLedgerReconciliationReadinessRequestError,
    );
    expect(harness.loadLatest).not.toHaveBeenCalled();
  });

  it('fails closed on malformed delegated output', async () => {
    const ready = await readyAssessment();
    const malformed = {
      ...ready,
      balanceCoverageComplete: false,
    };
    const harness = createHarness(malformed);

    await expect(harness.service.assess(validRequest())).rejects.toThrow(
      'Latest reconciled balance assessment is invalid',
    );
  });
});

function createHarness(
  assessment: Awaited<
    ReturnType<
      AgenticWalletAccountingLatestReconciledBalanceSnapshotPort['loadLatest']
    >
  >,
) {
  const loadLatest = jest
    .fn<
      AgenticWalletAccountingLatestReconciledBalanceSnapshotPort['loadLatest']
    >()
    .mockResolvedValue(assessment);
  return {
    loadLatest,
    service: new AgenticWalletAccountingLedgerReconciliationReadinessService(
      { loadLatest },
      () => EVALUATED_AT,
    ),
  };
}

function validRequest() {
  return { initializationId: INITIALIZATION_ID, maximumAgeMs: 60_000 };
}

function readyAssessment() {
  const freshness = assessAgenticWalletAccountingLedgerReconciliationFreshness(
    validStored(),
    60_000,
    EVALUATED_AT,
  );
  return new AgenticWalletAccountingLatestReconciledBalanceSnapshotService({
    assessLatest: () => Promise.resolve(freshness),
  }).loadLatest(INITIALIZATION_ID, {
    maximumAgeMs: 60_000,
    evaluatedAt: EVALUATED_AT,
  });
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
