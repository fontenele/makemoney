import { jest } from '@jest/globals';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AgenticWalletMarketSwapProviderOrderIdentityConflictError,
  AgenticWalletMarketSwapSubmissionReceiptBlockedError,
  AgenticWalletMarketSwapSubmissionReceiptConflictError,
  AgenticWalletMarketSwapSubmissionReceiptGateNotFoundError,
} from './agentic-wallet-market-swap-submission-receipt.store';
import { AgenticWalletMarketSwapSubmissionReceipt } from './agentic-wallet-market-swap-submission-response';
import { PrismaAgenticWalletMarketSwapSubmissionReceiptStore } from './prisma-agentic-wallet-market-swap-submission-receipt.store';

const RECORDED_AT = new Date('2026-10-03T12:00:05.000Z');

describe('PrismaAgenticWalletMarketSwapSubmissionReceiptStore', () => {
  it('persists one exact append-only submission acknowledgment', async () => {
    const harness = repositoryHarness();

    await expect(harness.store.record(receipt())).resolves.toEqual({
      stored: { receipt: receipt(), recordedAt: RECORDED_AT },
      replayed: false,
    });
    expect(harness.create).toHaveBeenCalledWith({
      data: {
        gateId: receipt().gateId,
        providerId: 'agentic_wallet',
        providerOrderId: '1234567890',
        lifecycleStatus: 'pending_confirmation',
        providerSubmissionAcknowledged: true,
        terminal: false,
        executionSucceeded: false,
        statusLookupRequired: true,
        automaticRetryAllowed: false,
        recordedAt: RECORDED_AT,
      },
    });
    expect(harness.prismaTransaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  });

  it('replays the exact receipt without changing its recording time', async () => {
    const harness = repositoryHarness();
    harness.receiptFindUnique.mockResolvedValueOnce(receiptRow());

    await expect(harness.store.record(receipt())).resolves.toEqual({
      stored: { receipt: receipt(), recordedAt: RECORDED_AT },
      replayed: true,
    });
    expect(harness.create).not.toHaveBeenCalled();
    expect(harness.gateFindUnique).not.toHaveBeenCalled();
  });

  it('rejects a changed order identity for an already recorded gate', async () => {
    const harness = repositoryHarness();
    harness.receiptFindUnique.mockResolvedValueOnce(
      receiptRow({ providerOrderId: 'different-order' }),
    );

    await expect(harness.store.record(receipt())).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapSubmissionReceiptConflictError,
    );
    expect(harness.create).not.toHaveBeenCalled();
  });

  it('rejects a provider order identity already bound to another gate', async () => {
    const harness = repositoryHarness();
    harness.receiptFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        gateId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      });

    await expect(harness.store.record(receipt())).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapProviderOrderIdentityConflictError,
    );
    expect(harness.create).not.toHaveBeenCalled();
  });

  it('requires the exact durable submission gate', async () => {
    const missing = repositoryHarness();
    missing.gateFindUnique.mockResolvedValue(null);
    await expect(missing.store.record(receipt())).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapSubmissionReceiptGateNotFoundError,
    );

    const malformed = repositoryHarness();
    malformed.gateFindUnique.mockResolvedValue(
      gateRow({ status: 'submitted' }),
    );
    await expect(malformed.store.record(receipt())).rejects.toThrow(
      'Persisted real execution submission gate is invalid',
    );
  });

  it('rejects malformed incoming and persisted receipts', async () => {
    const incoming = repositoryHarness();
    await expect(
      incoming.store.record(receipt({ terminal: true as false })),
    ).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapSubmissionReceiptBlockedError,
    );
    expect(incoming.prismaTransaction).not.toHaveBeenCalled();

    const persisted = repositoryHarness();
    persisted.receiptFindUnique.mockResolvedValueOnce(
      receiptRow({ lifecycleStatus: 'finished' }),
    );
    await expect(persisted.store.record(receipt())).rejects.toThrow(
      'Persisted market-swap submission receipt is invalid',
    );
  });

  it('rejects an invalid recording clock before insertion', async () => {
    const harness = repositoryHarness(new Date(Number.NaN));

    await expect(harness.store.record(receipt())).rejects.toThrow(
      'Submission receipt recording time is invalid',
    );
    expect(harness.create).not.toHaveBeenCalled();

    const beforeGate = repositoryHarness(new Date('2026-10-03T12:00:04.099Z'));
    await expect(beforeGate.store.record(receipt())).rejects.toThrow(
      'Submission receipt recording time is invalid',
    );
  });
});

function repositoryHarness(recordedAt = RECORDED_AT) {
  const receiptFindUnique = jest
    .fn<() => Promise<ReceiptRow | null>>()
    .mockResolvedValue(null);
  const gateFindUnique = jest
    .fn<() => Promise<GateRow | null>>()
    .mockResolvedValue(gateRow());
  const create = jest.fn(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve(receiptRow(data)),
  );
  const tx = {
    $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1),
    realExecutionSubmissionReceipt: {
      findUnique: receiptFindUnique,
      create,
    },
    realExecutionSubmissionGate: { findUnique: gateFindUnique },
  };
  const prismaTransaction = jest.fn(
    async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
  );
  const prisma = {
    $transaction: prismaTransaction,
  } as unknown as PrismaService;
  return {
    create,
    gateFindUnique,
    receiptFindUnique,
    prismaTransaction,
    store: new PrismaAgenticWalletMarketSwapSubmissionReceiptStore(
      prisma,
      () => recordedAt,
    ),
  };
}

function receipt(
  overrides: Partial<AgenticWalletMarketSwapSubmissionReceipt> = {},
): AgenticWalletMarketSwapSubmissionReceipt {
  return {
    kind: 'agentic_wallet_market_swap_submission_receipt',
    providerId: 'agentic_wallet',
    gateId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    providerOrderId: '1234567890',
    lifecycleStatus: 'pending_confirmation',
    providerSubmissionAcknowledged: true,
    terminal: false,
    executionSucceeded: false,
    statusLookupRequired: true,
    automaticRetryAllowed: false,
    ...overrides,
  };
}

function receiptRow(overrides: Record<string, unknown> = {}) {
  const value = receipt();
  return {
    gateId: value.gateId,
    providerId: value.providerId,
    providerOrderId: value.providerOrderId,
    lifecycleStatus: value.lifecycleStatus,
    providerSubmissionAcknowledged: value.providerSubmissionAcknowledged,
    terminal: value.terminal,
    executionSucceeded: value.executionSucceeded,
    statusLookupRequired: value.statusLookupRequired,
    automaticRetryAllowed: value.automaticRetryAllowed,
    recordedAt: RECORDED_AT,
    ...overrides,
  };
}

function gateRow(overrides: Record<string, unknown> = {}) {
  return {
    id: receipt().gateId,
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
    payloadCommitmentDigest: 'c'.repeat(64),
    emergencyStopChangeId: 'real-trading-stop-clear-1',
    sourceTokenAddress: '0x55d398326f99059ff775485246999027b3197955',
    targetTokenAddress: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
    sourceQuantity: '5',
    maximumSlippagePercent: '0.1',
    mevProtection: true,
    gasLevel: 'MEDIUM',
    status: 'prepared_not_submitted',
    requestFingerprint: 'f'.repeat(64),
    emergencyStopRecheckedAt: new Date('2026-10-03T12:00:04.000Z'),
    confirmationConsumedAt: new Date('2026-10-03T12:00:04.000Z'),
    expiresAt: new Date('2026-10-03T12:00:07.000Z'),
    createdAt: new Date('2026-10-03T12:00:04.100Z'),
    ...overrides,
  };
}

type ReceiptRow = ReturnType<typeof receiptRow>;
type GateRow = ReturnType<typeof gateRow>;
