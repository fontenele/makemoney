import { jest } from '@jest/globals';

import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { FundingConversionStatusObservationBlockedError } from '../application/agentic-wallet-funding-conversion-status-observation.store';
import { FundingConversionStatusObservation } from './agentic-wallet-funding-conversion-status-response';
import { PrismaAgenticWalletFundingConversionStatusObservationStore } from './prisma-agentic-wallet-funding-conversion-status-observation.store';

const OBSERVATION_ID = '019a0db1-bfea-7000-8000-000000000003';
const RECORDED_AT = new Date('2026-10-22T12:00:32.000Z');

describe('PrismaAgenticWalletFundingConversionStatusObservationStore', () => {
  it('records pending evidence without changing the attempt state', async () => {
    const observation = statusObservation('PENDING');
    const tx = transaction(observation);
    const store = createStore(tx);

    const result = await store.record(OBSERVATION_ID, observation, RECORDED_AT);

    expect(result).toMatchObject({ replayed: false });
    expect(
      tx.agenticWalletFundingConversionStatusObservation.create,
    ).toHaveBeenCalledTimes(1);
    expect(
      tx.agenticWalletFundingConversionSubmissionAttempt.update,
    ).not.toHaveBeenCalled();
  });

  it('records FINISHED only as pending financial reconciliation', async () => {
    const observation = statusObservation('FINISHED');
    const tx = transaction(observation);
    const store = createStore(tx);

    await store.record(OBSERVATION_ID, observation, RECORDED_AT);

    expect(
      tx.agenticWalletFundingConversionSubmissionAttempt.update,
    ).toHaveBeenCalledWith({
      where: { id: observation.attemptId },
      data: { state: 'provider_finished_pending_financial_reconciliation' },
    });
  });

  it('allows an exact replay without another insert or state update', async () => {
    const observation = statusObservation('FINISHED');
    const row = persistedRow(observation);
    const tx = transaction(observation, row);
    tx.agenticWalletFundingConversionSubmissionAttempt.findUnique = jest.fn(
      () =>
        Promise.resolve({
          ...attempt(),
          state: 'provider_finished_pending_financial_reconciliation',
        }),
    );
    const store = createStore(tx);

    await expect(
      store.record(OBSERVATION_ID, observation, RECORDED_AT),
    ).resolves.toMatchObject({ replayed: true });
    expect(
      tx.agenticWalletFundingConversionStatusObservation.create,
    ).not.toHaveBeenCalled();
  });

  it.each([
    [
      'provider time regression',
      {
        providerStatus: 'PENDING',
        providerUpdatedAt: new Date('2026-10-22T12:00:33.000Z'),
        bookedAt: new Date('2026-10-22T12:00:30.000Z'),
      },
    ],
    [
      'changed booking time',
      {
        providerStatus: 'PENDING',
        providerUpdatedAt: new Date('2026-10-22T12:00:35.000Z'),
        bookedAt: new Date('2026-10-22T12:00:29.000Z'),
      },
    ],
    [
      'terminal rewrite',
      {
        providerStatus: 'FINISHED',
        providerUpdatedAt: new Date('2026-10-22T12:00:33.000Z'),
        bookedAt: new Date('2026-10-22T12:00:30.000Z'),
      },
    ],
  ])('blocks %s from the latest durable evidence', async (_label, latest) => {
    const observation = statusObservation('PENDING');
    const tx = transaction(observation, null, latest);
    const store = createStore(tx);

    await expect(
      store.record(OBSERVATION_ID, observation, RECORDED_AT),
    ).rejects.toBeInstanceOf(FundingConversionStatusObservationBlockedError);
    expect(
      tx.agenticWalletFundingConversionStatusObservation.create,
    ).not.toHaveBeenCalled();
  });
});

function createStore(tx: ReturnType<typeof transaction>) {
  return new PrismaAgenticWalletFundingConversionStatusObservationStore({
    $transaction: jest.fn((work: (client: typeof tx) => Promise<unknown>) =>
      work(tx),
    ),
  } as unknown as PrismaService);
}

function transaction(
  observation: FundingConversionStatusObservation,
  existing: ReturnType<typeof persistedRow> | null = null,
  latest: Record<string, unknown> | null = null,
) {
  const row = persistedRow(observation);
  return {
    $executeRaw: jest.fn(() => Promise.resolve(0)),
    agenticWalletFundingConversionSubmissionAttempt: {
      findUnique: jest.fn(() => Promise.resolve(attempt())),
      update: jest.fn(() => Promise.resolve({})),
    },
    agenticWalletFundingConversionStatusObservation: {
      findUnique: jest.fn(() => Promise.resolve(existing)),
      findFirst: jest.fn(() => Promise.resolve(latest)),
      create: jest.fn(() => Promise.resolve(row)),
    },
  };
}

function attempt() {
  return {
    id: '019a0db1-bfea-7000-8000-000000000002',
    state: 'submitted_pending_confirmation',
    providerOrderId: 'order_123',
    automaticRetryAllowed: false,
  };
}

function statusObservation(
  status: FundingConversionStatusObservation['providerStatus'],
): FundingConversionStatusObservation {
  return {
    attemptId: attempt().id,
    providerOrderId: 'order_123',
    providerStatus: status,
    transactionHash: status === 'FINISHED' ? `0x${'a'.repeat(64)}` : null,
    bookedAt: new Date('2026-10-22T12:00:30.000Z'),
    providerUpdatedAt: new Date('2026-10-22T12:00:31.000Z'),
    terminal: status !== 'PENDING',
    executionSucceeded: status === 'FINISHED',
    financialReconciliationRequired: true,
    financialReconciliationComplete: false,
    automaticRetryAllowed: false,
  };
}

function persistedRow(observation: FundingConversionStatusObservation) {
  return {
    id: OBSERVATION_ID,
    attemptId: observation.attemptId,
    providerOrderId: observation.providerOrderId,
    providerStatus: observation.providerStatus,
    transactionHash: observation.transactionHash,
    bookedAt: observation.bookedAt,
    providerUpdatedAt: observation.providerUpdatedAt,
    recordedAt: RECORDED_AT,
  };
}
