import { jest } from '@jest/globals';

import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  FundingConversionSubmissionAttemptNotFoundError,
  FundingConversionSubmissionOutcomeConflictError,
  FundingConversionSubmissionOutcomeRecord,
} from '../application/agentic-wallet-funding-conversion-submission-outcome.store';
import { PrismaAgenticWalletFundingConversionSubmissionOutcomeStore } from './prisma-agentic-wallet-funding-conversion-submission-outcome.store';

describe('PrismaAgenticWalletFundingConversionSubmissionOutcomeStore', () => {
  it('records an acknowledged order only as pending confirmation', async () => {
    const value = record();
    const update = jest.fn(() => Promise.resolve({}));
    const tx = transaction({ state: 'submission_claimed' }, update);
    const store = createStore(tx);

    const result = await store.record(value);

    expect(result).toMatchObject({
      replayed: false,
      outcome: { stored: true },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: value.outcome.attemptId },
      data: {
        state: 'submitted_pending_confirmation',
        providerOrderId: 'order_123',
        responseFingerprint: 'b'.repeat(64),
        automaticRetryAllowed: false,
        completedAt: value.completedAt,
      },
    });
  });

  it('records an ambiguous outcome without an order id and without retry', async () => {
    const value: FundingConversionSubmissionOutcomeRecord = {
      outcome: {
        ...record().outcome,
        status: 'submission_outcome_unknown',
        providerOrderId: null,
      },
      completedAt: record().completedAt,
    };
    const update = jest.fn(() => Promise.resolve({}));
    const store = createStore(
      transaction({ state: 'submission_claimed' }, update),
    );

    await store.record(value);

    expect(update).toHaveBeenCalledWith({
      where: { id: value.outcome.attemptId },
      data: {
        state: 'submission_outcome_unknown',
        providerOrderId: null,
        responseFingerprint: value.outcome.responseFingerprint,
        automaticRetryAllowed: false,
        completedAt: value.completedAt,
      },
    });
  });

  it('returns an exact durable replay without updating', async () => {
    const value = record();
    const update = jest.fn();
    const store = createStore(
      transaction(
        {
          state: value.outcome.status,
          providerOrderId: value.outcome.providerOrderId,
          responseFingerprint: value.outcome.responseFingerprint,
          completedAt: value.completedAt,
        },
        update,
      ),
    );

    await expect(store.record(value)).resolves.toMatchObject({
      replayed: true,
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a divergent second outcome', async () => {
    const value = record();
    const store = createStore(
      transaction(
        {
          state: 'submission_outcome_unknown',
          providerOrderId: null,
          responseFingerprint: 'c'.repeat(64),
          completedAt: value.completedAt,
        },
        jest.fn(),
      ),
    );

    await expect(store.record(value)).rejects.toBeInstanceOf(
      FundingConversionSubmissionOutcomeConflictError,
    );
  });

  it('rejects a missing durable attempt', async () => {
    const tx = transaction({}, jest.fn());
    tx.agenticWalletFundingConversionSubmissionAttempt.findUnique = jest.fn(
      () => Promise.resolve(null),
    );
    const store = createStore(tx);

    await expect(store.record(record())).rejects.toBeInstanceOf(
      FundingConversionSubmissionAttemptNotFoundError,
    );
  });
});

function record(): FundingConversionSubmissionOutcomeRecord {
  return {
    outcome: {
      attemptId: '019a0db1-bfea-7000-8000-000000000002',
      status: 'submitted_pending_confirmation',
      providerOrderId: 'order_123',
      responseFingerprint: 'b'.repeat(64),
      executionSucceeded: false,
      statusLookupRequired: true,
      automaticRetryAllowed: false,
    },
    completedAt: new Date('2026-10-22T12:00:32.000Z'),
  };
}

function transaction(changed: Record<string, unknown>, update: jest.Mock) {
  return {
    $executeRaw: jest.fn(() => Promise.resolve(0)),
    agenticWalletFundingConversionSubmissionAttempt: {
      findUnique: jest.fn(() =>
        Promise.resolve({
          id: '019a0db1-bfea-7000-8000-000000000002',
          state: 'submission_claimed',
          providerOrderId: null,
          responseFingerprint: null,
          automaticRetryAllowed: false,
          startedAt: new Date('2026-10-22T12:00:30.000Z'),
          completedAt: null,
          ...changed,
        }),
      ),
      update,
    },
  };
}

function createStore(tx: ReturnType<typeof transaction>) {
  return new PrismaAgenticWalletFundingConversionSubmissionOutcomeStore({
    $transaction: jest.fn((work: (client: typeof tx) => Promise<unknown>) =>
      work(tx),
    ),
  } as unknown as PrismaService);
}
