import { jest } from '@jest/globals';

import {
  AgenticWalletAccountingLedgerReconciliationRecordingRequestError,
  AgenticWalletAccountingLedgerReconciliationRecordingService,
} from './agentic-wallet-accounting-ledger-reconciliation-recording.service';
import {
  AgenticWalletAccountingLedgerReconciliation,
  AgenticWalletAccountingLedgerReconciliationAssessment,
  reconcileAgenticWalletAccountingLedger,
} from '../infrastructure/agentic-wallet-accounting-ledger-reconciliation';
import { AgenticWalletAccountingLedgerReconciliationAttemptPort } from '../infrastructure/agentic-wallet-accounting-ledger-reconciliation-attempt.guard';
import { AgenticWalletAccountingLedgerReconciliationCommitmentStore } from '../infrastructure/agentic-wallet-accounting-ledger-reconciliation-commitment.store';
import {
  ACCOUNTING_BALANCE_INITIALIZATION_ACKNOWLEDGMENT,
  AgenticWalletAccountingBalanceInitialization,
} from '../infrastructure/agentic-wallet-accounting-balance-initialization';
import { InitializedAgenticWalletAccountingBalances } from '../infrastructure/agentic-wallet-accounting-balance-initialization.store';
import {
  AgenticWalletAccountingLedgerBalance,
  assessAgenticWalletAccountingLedgerSnapshot,
} from '../infrastructure/agentic-wallet-accounting-ledger-snapshot';
import { AgenticWalletCapabilityObservation } from '../infrastructure/agentic-wallet-capability.adapter';

const INITIALIZATION_ID = '018f1f54-7b8c-7a9d-8e0f-123456789abc';
const RECONCILIATION_ID = '018f1f54-7b8c-7a9d-8e0f-123456789abd';
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';
const PREPARED_AT = new Date('2026-10-16T12:01:01.000Z');
const RECORDED_AT = new Date('2026-10-16T12:01:02.000Z');

describe('AgenticWalletAccountingLedgerReconciliationRecordingService', () => {
  it('records only a successful one-shot reconciliation and returns safe audit metadata', async () => {
    const harness = createHarness(reconciled());

    const result = await harness.service.record(validRequest());
    expect(result.reconciliationFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(result).toEqual({
      scope: 'agentic_wallet_accounting_ledger_reconciliation_recording',
      status: 'reconciliation_evidence_recorded',
      blockers: [],
      initializationId: INITIALIZATION_ID,
      reconciliationId: RECONCILIATION_ID,
      reconciliationFingerprint: result.reconciliationFingerprint,
      walletObservedAt: new Date('2026-10-16T12:00:55.000Z'),
      reconciledAt: new Date('2026-10-16T12:01:00.000Z'),
      recordedAt: RECORDED_AT,
      providerReadCompleted: true,
      ledgerBalancesReconciled: true,
      reconciliationEvidenceRecorded: true,
      replayed: false,
      quoteAuthorized: false,
      submissionAuthorized: false,
      strategyExecutionAuthorized: false,
      automaticRetryAllowed: false,
    });
    expect(harness.run).toHaveBeenCalledWith(
      INITIALIZATION_ID,
      30_000,
      undefined,
    );
    expect(harness.record).toHaveBeenCalledTimes(1);
  });

  it('returns durable absence and policy blockers without persisting evidence', async () => {
    const absent = createHarness(null);
    await expect(absent.service.record(validRequest())).resolves.toMatchObject({
      status: 'blocked',
      blockers: ['accounting_initialization_absent'],
      providerReadCompleted: true,
      reconciliationEvidenceRecorded: false,
    });
    expect(absent.record).not.toHaveBeenCalled();

    const blockedAssessment: AgenticWalletAccountingLedgerReconciliationAssessment =
      {
        scope: 'agentic_wallet_accounting_ledger_reconciliation_assessment',
        status: 'blocked',
        blockers: ['wallet_accounting_balance_mismatch'],
        reconciliation: null,
        ledgerBalancesReconciled: false,
        quoteAuthorized: false,
        submissionAuthorized: false,
      };
    const blocked = createHarness(blockedAssessment);
    await expect(blocked.service.record(validRequest())).resolves.toMatchObject(
      {
        status: 'blocked',
        blockers: ['wallet_accounting_balance_mismatch'],
        ledgerBalancesReconciled: false,
      },
    );
    expect(blocked.record).not.toHaveBeenCalled();
  });

  it.each([
    null,
    {},
    { initializationId: INITIALIZATION_ID, maximumObservationAgeMs: 0 },
    {
      initializationId: INITIALIZATION_ID,
      maximumObservationAgeMs: 30_000,
      extra: true,
    },
  ])('rejects malformed input before provider access', async (request) => {
    const harness = createHarness(reconciled());

    await expect(harness.service.record(request)).rejects.toBeInstanceOf(
      AgenticWalletAccountingLedgerReconciliationRecordingRequestError,
    );
    expect(harness.run).not.toHaveBeenCalled();
  });

  it('stops after the provider attempt when the caller cancels', async () => {
    const controller = new AbortController();
    const assessment = reconciled();
    const run = jest.fn<
      AgenticWalletAccountingLedgerReconciliationAttemptPort['run']
    >(() => {
      controller.abort(new Error('cancelled'));
      return Promise.resolve(assessment);
    });
    const record = jest.fn<
      AgenticWalletAccountingLedgerReconciliationCommitmentStore['record']
    >(() => Promise.reject(new Error('must not record')));
    const service =
      new AgenticWalletAccountingLedgerReconciliationRecordingService(
        {
          run,
        } satisfies AgenticWalletAccountingLedgerReconciliationAttemptPort,
        { record },
        () => PREPARED_AT,
        () => RECONCILIATION_ID,
      );

    await expect(
      service.record(validRequest(), controller.signal),
    ).rejects.toThrow('cancelled');
    expect(record).not.toHaveBeenCalled();
  });
});

function createHarness(
  assessment: AgenticWalletAccountingLedgerReconciliationAssessment | null,
) {
  const run = jest.fn<
    AgenticWalletAccountingLedgerReconciliationAttemptPort['run']
  >(() => Promise.resolve(assessment));
  const record = jest.fn<
    AgenticWalletAccountingLedgerReconciliationCommitmentStore['record']
  >((commitment) =>
    Promise.resolve({
      stored: { commitment, recordedAt: RECORDED_AT },
      replayed: false,
    }),
  );
  return {
    run,
    record,
    service: new AgenticWalletAccountingLedgerReconciliationRecordingService(
      { run } satisfies AgenticWalletAccountingLedgerReconciliationAttemptPort,
      {
        record,
      } satisfies AgenticWalletAccountingLedgerReconciliationCommitmentStore,
      () => PREPARED_AT,
      () => RECONCILIATION_ID,
    ),
  };
}

function validRequest() {
  return {
    initializationId: INITIALIZATION_ID,
    maximumObservationAgeMs: 30_000,
  };
}

function reconciled(): AgenticWalletAccountingLedgerReconciliationAssessment {
  return {
    scope: 'agentic_wallet_accounting_ledger_reconciliation_assessment',
    status: 'accounting_ledger_reconciled',
    blockers: [],
    reconciliation: validReconciliation(),
    ledgerBalancesReconciled: true,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
}

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
    {
      maximumObservationAgeMs: 30_000,
      evaluatedAt: new Date('2026-10-16T12:01:00.000Z'),
    },
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
      reads: { securitySettings: true, quota: true, balances: true, gas: true },
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
