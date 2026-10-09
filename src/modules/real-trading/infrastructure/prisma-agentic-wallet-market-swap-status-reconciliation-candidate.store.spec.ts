import { jest } from '@jest/globals';

import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AgenticWalletMarketSwapStatusReconciliationCandidateInputError } from './agentic-wallet-market-swap-status-reconciliation-candidate.store';
import { PrismaAgenticWalletMarketSwapStatusReconciliationCandidateStore } from './prisma-agentic-wallet-market-swap-status-reconciliation-candidate.store';

const EVALUATED_AT = new Date('2026-10-03T12:00:07.000Z');

describe('PrismaAgenticWalletMarketSwapStatusReconciliationCandidateStore', () => {
  it('maps bounded awaiting and due-pending candidates conservatively', async () => {
    const harness = repositoryHarness([
      row({
        gateId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        providerOrderId: 'order-awaiting',
      }),
      row({
        gateId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        providerOrderId: 'order-pending',
        latestObservationId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        latestProviderStatus: 'PENDING',
        latestObservationRecordedAt: new Date('2026-10-03T12:00:06.000Z'),
        latestObservationTransactionHash: null,
        latestObservationBookedAt: new Date('2026-10-03T12:00:05.000Z'),
        latestObservationUpdatedAt: new Date('2026-10-03T12:00:06.000Z'),
      }),
    ]);

    await expect(
      harness.store.listDue({
        evaluatedAt: EVALUATED_AT,
        minimumLookupIntervalMs: 1_000,
        limit: 2,
      }),
    ).resolves.toEqual([
      {
        scope: 'agentic_wallet_market_swap_status_reconciliation_candidate',
        providerId: 'agentic_wallet',
        gateId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        providerOrderId: 'order-awaiting',
        phase: 'awaiting_status_observation',
        receiptRecordedAt: new Date('2026-10-03T12:00:05.000Z'),
        latestObservationId: null,
        latestObservationRecordedAt: null,
        latestObservationTransactionHash: null,
        latestObservationBookedAt: null,
        latestObservationUpdatedAt: null,
        eligibleAt: new Date('2026-10-03T12:00:05.000Z'),
        evaluatedAt: EVALUATED_AT,
        statusLookupRequired: true,
        financialReconciliationRequired: true,
        financialReconciliationComplete: false,
        submissionRetryAllowed: false,
      },
      expect.objectContaining({
        gateId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        phase: 'provider_pending',
        eligibleAt: EVALUATED_AT,
        evaluatedAt: EVALUATED_AT,
      }),
    ]);
    expect(harness.queryRaw).toHaveBeenCalledTimes(1);
  });

  it.each([
    [new Date(Number.NaN), 1_000, 1, 'invalid_evaluation_time'],
    [EVALUATED_AT, 999, 1, 'invalid_minimum_lookup_interval'],
    [EVALUATED_AT, 1_000, 0, 'invalid_limit'],
    [EVALUATED_AT, 1_000, 101, 'invalid_limit'],
  ])(
    'rejects invalid bounded input before persistence access',
    async (evaluatedAt, minimumLookupIntervalMs, limit, blocker) => {
      const harness = repositoryHarness([]);

      await expect(
        harness.store.listDue({ evaluatedAt, minimumLookupIntervalMs, limit }),
      ).rejects.toMatchObject<
        Partial<AgenticWalletMarketSwapStatusReconciliationCandidateInputError>
      >({ blocker });
      expect(harness.queryRaw).not.toHaveBeenCalled();
    },
  );

  it('rejects a date whose cadence cutoff is outside the Date range', async () => {
    const harness = repositoryHarness([]);

    await expect(
      harness.store.listDue({
        evaluatedAt: new Date(-8_640_000_000_000_000),
        minimumLookupIntervalMs: 1_000,
        limit: 1,
      }),
    ).rejects.toThrow(
      'Agentic Wallet status reconciliation candidate cutoff is invalid',
    );
    expect(harness.queryRaw).not.toHaveBeenCalled();
  });

  it.each([
    row({ gateId: 'not-a-uuid' }),
    row({ latestObservationId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' }),
    row({
      latestObservationId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      latestProviderStatus: 'FINISHED',
      latestObservationRecordedAt: new Date('2026-10-03T12:00:06.000Z'),
      latestObservationBookedAt: new Date('2026-10-03T12:00:05.000Z'),
      latestObservationUpdatedAt: new Date('2026-10-03T12:00:06.000Z'),
    }),
    row({
      latestObservationId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      latestProviderStatus: 'PENDING',
      latestObservationRecordedAt: new Date('2026-10-03T12:00:04.000Z'),
      latestObservationBookedAt: new Date('2026-10-03T12:00:05.000Z'),
      latestObservationUpdatedAt: new Date('2026-10-03T12:00:06.000Z'),
    }),
    row({ latestObservationBookedAt: new Date('2026-10-03T12:00:05.000Z') }),
    row({
      latestObservationId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      latestProviderStatus: 'PENDING',
      latestObservationRecordedAt: new Date('2026-10-03T12:00:06.000Z'),
      latestObservationTransactionHash: 'not-a-hash',
      latestObservationBookedAt: new Date('2026-10-03T12:00:05.000Z'),
      latestObservationUpdatedAt: new Date('2026-10-03T12:00:06.000Z'),
    }),
    row({
      latestObservationId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      latestProviderStatus: 'PENDING',
      latestObservationRecordedAt: new Date('2026-10-03T12:00:06.000Z'),
      latestObservationBookedAt: new Date('2026-10-03T12:00:06.001Z'),
      latestObservationUpdatedAt: new Date('2026-10-03T12:00:06.000Z'),
    }),
  ])(
    'fails closed on malformed persisted candidate evidence',
    async (value) => {
      const harness = repositoryHarness([value]);

      await expect(
        harness.store.listDue({
          evaluatedAt: EVALUATED_AT,
          minimumLookupIntervalMs: 1_000,
          limit: 1,
        }),
      ).rejects.toThrow(
        'Persisted Agentic Wallet status reconciliation candidate is invalid',
      );
    },
  );
});

function repositoryHarness(rows: ReturnType<typeof row>[]) {
  const queryRaw = jest.fn().mockResolvedValue(rows);
  const prisma = { $queryRaw: queryRaw } as unknown as PrismaService;
  return {
    queryRaw,
    store: new PrismaAgenticWalletMarketSwapStatusReconciliationCandidateStore(
      prisma,
    ),
  };
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    gateId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    providerOrderId: '1234567890',
    receiptRecordedAt: new Date('2026-10-03T12:00:05.000Z'),
    latestObservationId: null,
    latestProviderStatus: null,
    latestObservationRecordedAt: null,
    latestObservationTransactionHash: null,
    latestObservationBookedAt: null,
    latestObservationUpdatedAt: null,
    ...overrides,
  };
}
