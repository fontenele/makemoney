import { jest } from '@jest/globals';

import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AgenticWalletMarketSwapReconciliationStateIdentityError } from './agentic-wallet-market-swap-reconciliation-state.store';
import { PrismaAgenticWalletMarketSwapReconciliationStateStore } from './prisma-agentic-wallet-market-swap-reconciliation-state.store';

const GATE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OBSERVATION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const RECEIPT_RECORDED_AT = new Date('2026-10-03T12:00:05.000Z');
const OBSERVATION_RECORDED_AT = new Date('2026-10-03T12:00:06.000Z');

describe('PrismaAgenticWalletMarketSwapReconciliationStateStore', () => {
  it('rejects a malformed gate identity before querying persistence', async () => {
    const harness = repositoryHarness();

    await expect(
      harness.store.getByGateId('not-a-uuid'),
    ).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapReconciliationStateIdentityError,
    );
    expect(harness.findUnique).not.toHaveBeenCalled();
  });

  it('returns null when no durable receipt exists', async () => {
    const harness = repositoryHarness(null);

    await expect(harness.store.getByGateId(GATE_ID)).resolves.toBeNull();
    expect(harness.findUnique).toHaveBeenCalledWith({
      where: { gateId: GATE_ID },
      include: {
        statusObservations: {
          orderBy: { sequence: 'desc' },
          take: 1,
        },
      },
    });
  });

  it('projects a receipt without observations as awaiting status evidence', async () => {
    const harness = repositoryHarness(receiptRow());

    await expect(harness.store.getByGateId(GATE_ID)).resolves.toEqual(
      expectedState(),
    );
  });

  it('projects pending provider evidence without claiming completion', async () => {
    const harness = repositoryHarness(
      receiptRow({ statusObservations: [observationRow()] }),
    );

    await expect(harness.store.getByGateId(GATE_ID)).resolves.toEqual(
      expectedState({
        phase: 'provider_pending',
        providerStatus: 'PENDING',
        latestObservationId: OBSERVATION_ID,
        latestObservationRecordedAt: OBSERVATION_RECORDED_AT,
      }),
    );
  });

  it('keeps provider-finished evidence financially unreconciled', async () => {
    const transactionHash = `0x${'a'.repeat(64)}`;
    const harness = repositoryHarness(
      receiptRow({
        statusObservations: [
          observationRow({
            providerStatus: 'FINISHED',
            transactionHash,
          }),
        ],
      }),
    );

    await expect(harness.store.getByGateId(GATE_ID)).resolves.toEqual(
      expectedState({
        phase: 'provider_finished_financial_reconciliation_required',
        providerStatus: 'FINISHED',
        transactionHash,
        latestObservationId: OBSERVATION_ID,
        latestObservationRecordedAt: OBSERVATION_RECORDED_AT,
        terminal: true,
        executionSucceeded: true,
        statusLookupRequired: false,
      }),
    );
  });

  it('projects provider failure without allowing submission retry', async () => {
    const harness = repositoryHarness(
      receiptRow({
        statusObservations: [observationRow({ providerStatus: 'FAILED' })],
      }),
    );

    await expect(harness.store.getByGateId(GATE_ID)).resolves.toEqual(
      expectedState({
        phase: 'provider_failed',
        providerStatus: 'FAILED',
        latestObservationId: OBSERVATION_ID,
        latestObservationRecordedAt: OBSERVATION_RECORDED_AT,
        terminal: true,
        statusLookupRequired: false,
      }),
    );
  });

  it('fails closed on malformed durable receipt or observation evidence', async () => {
    const malformedReceipt = repositoryHarness(
      receiptRow({ lifecycleStatus: 'finished' }),
    );
    await expect(malformedReceipt.store.getByGateId(GATE_ID)).rejects.toThrow(
      'Persisted market-swap submission receipt is invalid',
    );

    const malformedObservation = repositoryHarness(
      receiptRow({
        statusObservations: [observationRow({ transactionHash: 'not-a-hash' })],
      }),
    );
    await expect(
      malformedObservation.store.getByGateId(GATE_ID),
    ).rejects.toThrow('Persisted market-swap status observation is invalid');
  });

  it('fails closed when observation evidence predates its receipt', async () => {
    const harness = repositoryHarness(
      receiptRow({
        statusObservations: [
          observationRow({
            recordedAt: new Date('2026-10-03T12:00:04.999Z'),
          }),
        ],
      }),
    );

    await expect(harness.store.getByGateId(GATE_ID)).rejects.toThrow(
      'Persisted market-swap reconciliation evidence is inconsistent',
    );

    const wrongReceipt = repositoryHarness(
      receiptRow({ gateId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' }),
    );
    await expect(wrongReceipt.store.getByGateId(GATE_ID)).rejects.toThrow(
      'Persisted market-swap reconciliation evidence is inconsistent',
    );
  });
});

function repositoryHarness(row: ReceiptRow | null = receiptRow()) {
  const findUnique = jest
    .fn<() => Promise<ReceiptRow | null>>()
    .mockResolvedValue(row);
  const prisma = {
    realExecutionSubmissionReceipt: { findUnique },
  } as unknown as PrismaService;
  return {
    findUnique,
    store: new PrismaAgenticWalletMarketSwapReconciliationStateStore(prisma),
  };
}

function expectedState(overrides: Record<string, unknown> = {}) {
  return {
    scope: 'agentic_wallet_market_swap_reconciliation_state',
    providerId: 'agentic_wallet',
    gateId: GATE_ID,
    providerOrderId: '1234567890',
    phase: 'awaiting_status_observation',
    providerStatus: null,
    transactionHash: null,
    receiptRecordedAt: RECEIPT_RECORDED_AT,
    latestObservationId: null,
    latestObservationRecordedAt: null,
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
    gateId: GATE_ID,
    providerId: 'agentic_wallet',
    providerOrderId: '1234567890',
    lifecycleStatus: 'pending_confirmation',
    providerSubmissionAcknowledged: true,
    terminal: false,
    executionSucceeded: false,
    statusLookupRequired: true,
    automaticRetryAllowed: false,
    recordedAt: RECEIPT_RECORDED_AT,
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
    recordedAt: OBSERVATION_RECORDED_AT,
    ...overrides,
  };
}

type ReceiptRow = ReturnType<typeof receiptRow>;
