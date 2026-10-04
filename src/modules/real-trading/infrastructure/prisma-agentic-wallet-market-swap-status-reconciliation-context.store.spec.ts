import { jest } from '@jest/globals';

import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AgenticWalletMarketSwapStatusReconciliationContextIdentityError } from './agentic-wallet-market-swap-status-reconciliation-context.store';
import { PrismaAgenticWalletMarketSwapStatusReconciliationContextStore } from './prisma-agentic-wallet-market-swap-status-reconciliation-context.store';

const GATE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OBSERVATION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('PrismaAgenticWalletMarketSwapStatusReconciliationContextStore', () => {
  it('rejects a malformed gate identity before persistence access', async () => {
    const harness = repositoryHarness();

    await expect(
      harness.store.getByGateId('not-a-uuid'),
    ).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapStatusReconciliationContextIdentityError,
    );
    expect(harness.findUnique).not.toHaveBeenCalled();
  });

  it.each([null, gateRow({ submissionReceipt: null })])(
    'returns no complete context when the gate or receipt is absent',
    async (row) => {
      const harness = repositoryHarness(row);

      await expect(harness.store.getByGateId(GATE_ID)).resolves.toBeNull();
      expect(harness.findUnique).toHaveBeenCalledWith({
        where: { id: GATE_ID },
        include: {
          submissionReceipt: {
            include: {
              statusObservations: {
                orderBy: { sequence: 'desc' },
                take: 1,
              },
            },
          },
        },
      });
    },
  );

  it('loads an exact gate, receipt, and awaiting projection together', async () => {
    const harness = repositoryHarness();

    await expect(harness.store.getByGateId(GATE_ID)).resolves.toMatchObject({
      gate: {
        id: GATE_ID,
        providerId: 'agentic_wallet',
        sourceQuantity: '5',
        providerSubmissionStarted: false,
        submissionAuthorized: false,
      },
      submissionReceipt: {
        receipt: {
          gateId: GATE_ID,
          providerOrderId: '1234567890',
          statusLookupRequired: true,
        },
        recordedAt: new Date('2026-10-03T12:00:05.000Z'),
      },
      reconciliationState: {
        phase: 'awaiting_status_observation',
        providerStatus: null,
        statusLookupRequired: true,
        financialReconciliationComplete: false,
      },
    });
  });

  it('uses only the latest included observation for the projection', async () => {
    const harness = repositoryHarness(
      gateRow({
        submissionReceipt: receiptRow({
          statusObservations: [observationRow()],
        }),
      }),
    );

    await expect(harness.store.getByGateId(GATE_ID)).resolves.toMatchObject({
      reconciliationState: {
        phase: 'provider_pending',
        providerStatus: 'PENDING',
        latestObservationId: OBSERVATION_ID,
        statusLookupRequired: true,
        submissionRetryAllowed: false,
      },
    });
  });

  it('fails closed on malformed or inconsistent persisted evidence', async () => {
    const malformedGate = repositoryHarness(gateRow({ sourceQuantity: '5.0' }));
    await expect(malformedGate.store.getByGateId(GATE_ID)).rejects.toThrow(
      'Persisted real execution submission gate is invalid',
    );

    const earlyReceipt = repositoryHarness(
      gateRow({
        submissionReceipt: receiptRow({
          recordedAt: new Date('2026-10-03T12:00:04.050Z'),
        }),
      }),
    );
    await expect(earlyReceipt.store.getByGateId(GATE_ID)).rejects.toThrow(
      'Persisted market-swap reconciliation context is inconsistent',
    );

    const malformedObservation = repositoryHarness(
      gateRow({
        submissionReceipt: receiptRow({
          statusObservations: [observationRow({ providerStatus: 'UNKNOWN' })],
        }),
      }),
    );
    await expect(
      malformedObservation.store.getByGateId(GATE_ID),
    ).rejects.toThrow('Persisted market-swap status observation is invalid');
  });
});

function repositoryHarness(row: GateRow | null = gateRow()) {
  const findUnique = jest
    .fn<() => Promise<GateRow | null>>()
    .mockResolvedValue(row);
  const prisma = {
    realExecutionSubmissionGate: { findUnique },
  } as unknown as PrismaService;
  return {
    findUnique,
    store: new PrismaAgenticWalletMarketSwapStatusReconciliationContextStore(
      prisma,
    ),
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
    submissionReceipt: receiptRow(),
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
    statusObservations: [],
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
    providerStatus: 'PENDING',
    transactionHash: null,
    bookedAt: new Date('2026-10-03T12:00:05.000Z'),
    providerUpdatedAt: new Date('2026-10-03T12:00:05.500Z'),
    recordedAt: new Date('2026-10-03T12:00:06.000Z'),
    ...overrides,
  };
}

type GateRow = ReturnType<typeof gateRow>;
