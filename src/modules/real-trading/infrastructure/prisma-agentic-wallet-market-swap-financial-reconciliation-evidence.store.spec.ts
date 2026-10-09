import { jest } from '@jest/globals';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AgenticWalletMarketSwapFinancialReconciliationEvidence } from './agentic-wallet-market-swap-financial-reconciliation-evidence';
import {
  AgenticWalletMarketSwapFinancialReconciliationContextNotFoundError,
  AgenticWalletMarketSwapFinancialReconciliationEvidenceBlockedError,
  AgenticWalletMarketSwapFinancialReconciliationEvidenceConflictError,
} from './agentic-wallet-market-swap-financial-reconciliation-evidence.store';
import { PrismaAgenticWalletMarketSwapFinancialReconciliationEvidenceStore } from './prisma-agentic-wallet-market-swap-financial-reconciliation-evidence.store';

const GATE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OBSERVATION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const EVIDENCE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const TRANSACTION_HASH = `0x${'a'.repeat(64)}`;
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';
const OBSERVED_AT = new Date('2026-10-03T12:00:07.000Z');
const RECORDED_AT = new Date('2026-10-03T12:00:08.000Z');

describe('PrismaAgenticWalletMarketSwapFinancialReconciliationEvidenceStore', () => {
  it('persists complete evidence after reloading and reassessing durable context', async () => {
    const harness = repositoryHarness();

    await expect(harness.store.record(evidence())).resolves.toMatchObject({
      stored: {
        id: EVIDENCE_ID,
        evidence: evidence(),
        recordedAt: RECORDED_AT,
      },
      replayed: false,
    });
    const createdData = harness.create.mock.calls[0][0].data;
    expect(createdData).toMatchObject({
      id: EVIDENCE_ID,
      gateId: GATE_ID,
      statusObservationId: OBSERVATION_ID,
      providerOrderId: '1234567890',
      transactionHash: TRANSACTION_HASH,
      actualTargetReceivedQuantity: '0.000071',
      observedAt: OBSERVED_AT,
      recordedAt: RECORDED_AT,
    });
    expect(createdData.requestFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(harness.gateFindUnique).toHaveBeenCalledTimes(1);
    expect(harness.receiptFindUnique).toHaveBeenCalledTimes(1);
    expect(harness.observationFindFirst).toHaveBeenCalledTimes(1);
    expect(harness.prismaTransaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  });

  it('replays the exact immutable evidence without reloading context or inserting', async () => {
    const harness = repositoryHarness();
    await harness.store.record(evidence());
    const firstCreate = harness.create.mock.calls[0][0];
    harness.existingFindUnique.mockResolvedValue(
      evidenceRow({
        requestFingerprint: firstCreate.data.requestFingerprint,
      }),
    );
    harness.create.mockClear();
    harness.gateFindUnique.mockClear();
    harness.receiptFindUnique.mockClear();
    harness.observationFindFirst.mockClear();

    await expect(harness.store.record(evidence())).resolves.toMatchObject({
      stored: { id: EVIDENCE_ID, evidence: evidence() },
      replayed: true,
    });
    expect(harness.create).not.toHaveBeenCalled();
    expect(harness.gateFindUnique).not.toHaveBeenCalled();
    expect(harness.receiptFindUnique).not.toHaveBeenCalled();
    expect(harness.observationFindFirst).not.toHaveBeenCalled();
  });

  it('rejects a different evidence payload for the same gate', async () => {
    const harness = repositoryHarness();
    harness.existingFindUnique.mockResolvedValue(
      evidenceRow({ requestFingerprint: 'f'.repeat(64) }),
    );

    await expect(harness.store.record(evidence())).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapFinancialReconciliationEvidenceConflictError,
    );
    expect(harness.create).not.toHaveBeenCalled();
  });

  it('blocks evidence when the latest durable provider state is not finished', async () => {
    const harness = repositoryHarness();
    harness.observationFindFirst.mockResolvedValue(
      observationRow({
        providerStatus: 'PENDING',
        transactionHash: null,
      }),
    );

    const error: unknown = await harness.store
      .record(evidence())
      .catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(
      AgenticWalletMarketSwapFinancialReconciliationEvidenceBlockedError,
    );
    if (
      !(
        error instanceof
        AgenticWalletMarketSwapFinancialReconciliationEvidenceBlockedError
      )
    )
      throw error;
    expect(error.blockers).toContain('provider_execution_not_finished');
    expect(harness.create).not.toHaveBeenCalled();
  });

  it.each(['gate', 'receipt', 'observation'] as const)(
    'rejects missing durable %s context',
    async (missing) => {
      const harness = repositoryHarness();
      if (missing === 'gate') harness.gateFindUnique.mockResolvedValue(null);
      if (missing === 'receipt')
        harness.receiptFindUnique.mockResolvedValue(null);
      if (missing === 'observation')
        harness.observationFindFirst.mockResolvedValue(null);

      await expect(harness.store.record(evidence())).rejects.toBeInstanceOf(
        AgenticWalletMarketSwapFinancialReconciliationContextNotFoundError,
      );
      expect(harness.create).not.toHaveBeenCalled();
    },
  );

  it('rejects invalid generated identity and recording time', async () => {
    const invalidId = repositoryHarness(RECORDED_AT, 'not-a-uuid');
    await expect(invalidId.store.record(evidence())).rejects.toThrow(
      'Financial reconciliation evidence recording metadata is invalid',
    );

    const earlyClock = repositoryHarness(new Date('2026-10-03T12:00:06.999Z'));
    await expect(earlyClock.store.record(evidence())).rejects.toThrow(
      'Financial reconciliation evidence recording metadata is invalid',
    );
  });

  it('rejects malformed persisted evidence during replay', async () => {
    const harness = repositoryHarness();
    await harness.store.record(evidence());
    const firstCreate = harness.create.mock.calls[0][0];
    harness.existingFindUnique.mockResolvedValue(
      evidenceRow({
        requestFingerprint: firstCreate.data.requestFingerprint,
        actualTargetReceivedQuantity: '0',
      }),
    );

    await expect(harness.store.record(evidence())).rejects.toThrow(
      'Persisted financial reconciliation evidence is invalid',
    );
  });
});

function repositoryHarness(recordedAt = RECORDED_AT, nextId = EVIDENCE_ID) {
  const existingFindUnique = jest
    .fn<() => Promise<EvidenceRow | null>>()
    .mockResolvedValue(null);
  const gateFindUnique = jest
    .fn<() => Promise<GateRow | null>>()
    .mockResolvedValue(gateRow());
  const receiptFindUnique = jest
    .fn<() => Promise<ReceiptRow | null>>()
    .mockResolvedValue(receiptRow());
  const observationFindFirst = jest
    .fn<() => Promise<ObservationRow | null>>()
    .mockResolvedValue(observationRow());
  const create = jest.fn(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve(evidenceRow(data)),
  );
  const tx = {
    $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1),
    realExecutionFinancialReconciliationEvidence: {
      findUnique: existingFindUnique,
      create,
    },
    realExecutionSubmissionGate: { findUnique: gateFindUnique },
    realExecutionSubmissionReceipt: { findUnique: receiptFindUnique },
    realExecutionStatusObservation: { findFirst: observationFindFirst },
  };
  const prismaTransaction = jest.fn(
    async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
  );
  const prisma = {
    $transaction: prismaTransaction,
  } as unknown as PrismaService;
  return {
    create,
    existingFindUnique,
    gateFindUnique,
    receiptFindUnique,
    observationFindFirst,
    prismaTransaction,
    store:
      new PrismaAgenticWalletMarketSwapFinancialReconciliationEvidenceStore(
        prisma,
        () => recordedAt,
        () => nextId,
      ),
  };
}

function evidence(
  overrides: Partial<AgenticWalletMarketSwapFinancialReconciliationEvidence> = {},
): AgenticWalletMarketSwapFinancialReconciliationEvidence {
  return {
    scope: 'agentic_wallet_market_swap_financial_reconciliation_evidence',
    providerId: 'agentic_wallet',
    chainId: '56',
    gateId: GATE_ID,
    providerOrderId: '1234567890',
    statusObservationId: OBSERVATION_ID,
    transactionHash: TRANSACTION_HASH,
    sourceTokenAddress: USDT,
    targetTokenAddress: BTCB,
    submittedSourceQuantity: '5',
    actualTargetReceivedQuantity: '0.000071',
    providerFeeComponents: [],
    networkFeeAsset: 'BNB',
    networkFeeQuantity: '0.0003',
    transactionReceiptObserved: true,
    targetBalanceDeltaObserved: true,
    providerFeeCoverageComplete: true,
    networkFeeCoverageComplete: true,
    observedAt: OBSERVED_AT,
    ...overrides,
  };
}

function gateRow(overrides: Record<string, unknown> = {}) {
  return {
    id: GATE_ID,
    confirmationId: '88888888-8888-4888-8888-888888888888',
    approvalId: '77777777-7777-4777-8777-777777777777',
    reservationId: '33333333-3333-4333-8333-333333333333',
    armId: '55555555-5555-4555-8555-555555555555',
    submissionPlanId: '99999999-9999-4999-8999-999999999999',
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: '11111111-1111-4111-8111-111111111111',
    quoteId: '22222222-2222-4222-8222-222222222222',
    payloadCommitmentVersion: 'real_execution_intent_quote_v1',
    payloadCommitmentDigest: 'a'.repeat(64),
    emergencyStopChangeId: 'real-trading-stop-clear-1',
    sourceTokenAddress: USDT,
    targetTokenAddress: BTCB,
    sourceQuantity: '5',
    maximumSlippagePercent: '0.1',
    mevProtection: true,
    gasLevel: 'MEDIUM',
    status: 'prepared_not_submitted',
    requestFingerprint: 'b'.repeat(64),
    emergencyStopRecheckedAt: new Date('2026-10-03T12:00:04.000Z'),
    confirmationConsumedAt: new Date('2026-10-03T12:00:04.000Z'),
    expiresAt: new Date('2026-10-03T12:00:09.000Z'),
    createdAt: new Date('2026-10-03T12:00:04.000Z'),
    ...overrides,
  };
}

function receiptRow(overrides: Record<string, unknown> = {}) {
  return {
    gateId: GATE_ID,
    providerId: 'agentic_wallet',
    providerOrderId: '1234567890',
    lifecycleStatus: 'pending_confirmation',
    providerSubmissionAcknowledged: true,
    terminal: false,
    executionSucceeded: false,
    statusLookupRequired: true,
    automaticRetryAllowed: false,
    recordedAt: new Date('2026-10-03T12:00:05.000Z'),
    ...overrides,
  };
}

function observationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: OBSERVATION_ID,
    sequence: 1n,
    gateId: GATE_ID,
    providerId: 'agentic_wallet',
    providerOrderId: '1234567890',
    providerStatus: 'FINISHED',
    transactionHash: TRANSACTION_HASH,
    bookedAt: new Date('2026-10-03T12:00:05.000Z'),
    providerUpdatedAt: new Date('2026-10-03T12:00:06.000Z'),
    recordedAt: new Date('2026-10-03T12:00:06.000Z'),
    ...overrides,
  };
}

function evidenceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: EVIDENCE_ID,
    gateId: GATE_ID,
    statusObservationId: OBSERVATION_ID,
    providerId: 'agentic_wallet',
    providerOrderId: '1234567890',
    chainId: '56',
    transactionHash: TRANSACTION_HASH,
    sourceTokenAddress: USDT,
    targetTokenAddress: BTCB,
    submittedSourceQuantity: '5',
    actualTargetReceivedQuantity: '0.000071',
    providerFeeComponents: [],
    networkFeeAsset: 'BNB',
    networkFeeQuantity: '0.0003',
    requestFingerprint: 'a'.repeat(64),
    observedAt: OBSERVED_AT,
    recordedAt: RECORDED_AT,
    ...overrides,
  };
}

type GateRow = ReturnType<typeof gateRow>;
type ReceiptRow = ReturnType<typeof receiptRow>;
type ObservationRow = ReturnType<typeof observationRow>;
type EvidenceRow = ReturnType<typeof evidenceRow>;
