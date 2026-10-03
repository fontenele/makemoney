import { jest } from '@jest/globals';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AgenticWalletMarketSwapStatusObservationBlockedError,
  AgenticWalletMarketSwapStatusObservationReceiptMismatchError,
  AgenticWalletMarketSwapStatusObservationReceiptNotFoundError,
} from './agentic-wallet-market-swap-status-observation.store';
import { AgenticWalletMarketSwapStatusObservation } from './agentic-wallet-market-swap-status-response';
import { PrismaAgenticWalletMarketSwapStatusObservationStore } from './prisma-agentic-wallet-market-swap-status-observation.store';

const ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const RECORDED_AT = new Date('2026-10-03T12:00:06.000Z');

describe('PrismaAgenticWalletMarketSwapStatusObservationStore', () => {
  it('persists the initial receipt-bound observation', async () => {
    const harness = repositoryHarness();

    await expect(harness.store.record(observation())).resolves.toEqual({
      stored: { id: ID, observation: observation(), recordedAt: RECORDED_AT },
      replayed: false,
    });
    expect(harness.create).toHaveBeenCalledWith({
      data: {
        id: ID,
        gateId: observation().gateId,
        providerId: 'agentic_wallet',
        providerOrderId: '1234567890',
        providerStatus: 'PENDING',
        transactionHash: null,
        bookedAt: observation().bookedAt,
        providerUpdatedAt: observation().updatedAt,
        recordedAt: RECORDED_AT,
      },
    });
    expect(harness.prismaTransaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  });

  it('replays the exact latest observation without appending a row', async () => {
    const harness = repositoryHarness();
    harness.findFirst.mockResolvedValue(observationRow());

    await expect(harness.store.record(observation())).resolves.toEqual({
      stored: { id: ID, observation: observation(), recordedAt: RECORDED_AT },
      replayed: true,
    });
    expect(harness.create).not.toHaveBeenCalled();
  });

  it('appends a monotonic terminal observation', async () => {
    const harness = repositoryHarness();
    harness.findFirst.mockResolvedValue(observationRow());
    const finished = observation({
      providerStatus: 'FINISHED',
      transactionHash: `0x${'a'.repeat(64)}`,
      updatedAt: new Date('2026-10-03T12:00:07.000Z'),
      terminal: true,
      executionSucceeded: true,
      statusLookupRequired: false,
    });

    await expect(harness.store.record(finished)).resolves.toMatchObject({
      stored: { observation: finished },
      replayed: false,
    });
    expect(harness.create).toHaveBeenCalledTimes(1);
  });

  it('rejects a regressed transition and preserves its blockers', async () => {
    const harness = repositoryHarness();
    harness.findFirst.mockResolvedValue(
      observationRow({
        providerStatus: 'FINISHED',
        transactionHash: `0x${'a'.repeat(64)}`,
        providerUpdatedAt: new Date('2026-10-03T12:00:07.000Z'),
      }),
    );

    const error: unknown = await harness.store
      .record(observation())
      .catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(
      AgenticWalletMarketSwapStatusObservationBlockedError,
    );
    if (
      !(error instanceof AgenticWalletMarketSwapStatusObservationBlockedError)
    )
      throw error;
    expect(error.blockers).toEqual([
      'updated_at_regressed',
      'terminal_status_changed',
      'transaction_hash_changed',
    ]);
    expect(harness.create).not.toHaveBeenCalled();
  });

  it('requires the durable submission receipt and its exact order identity', async () => {
    const missing = repositoryHarness();
    missing.receiptFindUnique.mockResolvedValue(null);
    await expect(missing.store.record(observation())).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapStatusObservationReceiptNotFoundError,
    );

    const mismatch = repositoryHarness();
    mismatch.receiptFindUnique.mockResolvedValue(
      receiptRow({ providerOrderId: 'different-order' }),
    );
    await expect(mismatch.store.record(observation())).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapStatusObservationReceiptMismatchError,
    );
  });

  it('rejects malformed incoming and persisted observations', async () => {
    const incoming = repositoryHarness();
    await expect(
      incoming.store.record(
        observation({ statusLookupRequired: false as true }),
      ),
    ).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapStatusObservationBlockedError,
    );
    expect(incoming.prismaTransaction).not.toHaveBeenCalled();

    const persisted = repositoryHarness();
    persisted.findFirst.mockResolvedValue(
      observationRow({ providerStatus: 'UNKNOWN' }),
    );
    await expect(persisted.store.record(observation())).rejects.toThrow(
      'Persisted market-swap status observation is invalid',
    );
  });

  it('rejects malformed receipts and invalid recording clocks', async () => {
    const malformed = repositoryHarness();
    malformed.receiptFindUnique.mockResolvedValue(
      receiptRow({ lifecycleStatus: 'finished' }),
    );
    await expect(malformed.store.record(observation())).rejects.toThrow(
      'Persisted market-swap submission receipt is invalid',
    );

    const invalidClock = repositoryHarness(
      new Date('2026-10-03T12:00:04.999Z'),
    );
    await expect(invalidClock.store.record(observation())).rejects.toThrow(
      'Status observation recording time is invalid',
    );
  });
});

function repositoryHarness(recordedAt = RECORDED_AT) {
  const receiptFindUnique = jest
    .fn<() => Promise<ReceiptRow | null>>()
    .mockResolvedValue(receiptRow());
  const findFirst = jest
    .fn<() => Promise<ObservationRow | null>>()
    .mockResolvedValue(null);
  const create = jest.fn(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve(observationRow(data)),
  );
  const tx = {
    $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1),
    realExecutionSubmissionReceipt: { findUnique: receiptFindUnique },
    realExecutionStatusObservation: { findFirst, create },
  };
  const prismaTransaction = jest.fn(
    async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
  );
  const prisma = {
    $transaction: prismaTransaction,
  } as unknown as PrismaService;
  return {
    create,
    findFirst,
    receiptFindUnique,
    prismaTransaction,
    store: new PrismaAgenticWalletMarketSwapStatusObservationStore(
      prisma,
      () => recordedAt,
      () => ID,
    ),
  };
}

function observation(
  overrides: Partial<AgenticWalletMarketSwapStatusObservation> = {},
): AgenticWalletMarketSwapStatusObservation {
  return {
    kind: 'agentic_wallet_market_swap_status_observation',
    providerId: 'agentic_wallet',
    gateId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    providerOrderId: '1234567890',
    providerStatus: 'PENDING',
    transactionHash: null,
    bookedAt: new Date('2026-10-03T12:00:05.000Z'),
    updatedAt: new Date('2026-10-03T12:00:05.500Z'),
    terminal: false,
    executionSucceeded: false,
    statusLookupRequired: true,
    financialReconciliationRequired: true,
    financialReconciliationComplete: false,
    actualReceivedQuantity: null,
    submissionRetryAllowed: false,
    ...overrides,
  };
}

function receiptRow(overrides: Record<string, unknown> = {}) {
  return {
    gateId: observation().gateId,
    providerId: 'agentic_wallet',
    providerOrderId: observation().providerOrderId,
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
  const value = observation();
  return {
    id: ID,
    gateId: value.gateId,
    providerId: value.providerId,
    providerOrderId: value.providerOrderId,
    providerStatus: value.providerStatus,
    transactionHash: value.transactionHash,
    bookedAt: value.bookedAt,
    providerUpdatedAt: value.updatedAt,
    recordedAt: RECORDED_AT,
    ...overrides,
  };
}

type ReceiptRow = ReturnType<typeof receiptRow>;
type ObservationRow = ReturnType<typeof observationRow>;
