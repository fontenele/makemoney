import { jest } from '@jest/globals';

import { StoredRealExecutionSubmissionGate } from '../application/real-execution-submission-gate-store';
import { AgenticWalletMarketSwapReconciliationState } from './agentic-wallet-market-swap-reconciliation-state.store';
import { AgenticWalletMarketSwapStatusLookupRunner } from './agentic-wallet-market-swap-status-lookup-runner';
import { AgenticWalletMarketSwapStatusObservationStore } from './agentic-wallet-market-swap-status-observation.store';
import { AgenticWalletMarketSwapStatusReconciliationAttempt } from './agentic-wallet-market-swap-status-reconciliation-attempt';
import { AgenticWalletMarketSwapStatusReconciliationContext } from './agentic-wallet-market-swap-status-reconciliation-context.store';
import { AgenticWalletMarketSwapSubmissionReceipt } from './agentic-wallet-market-swap-submission-response';

const GATE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('AgenticWalletMarketSwapStatusReconciliationAttempt', () => {
  it('records one valid pending observation from one explicit lookup', async () => {
    const harness = createHarness();

    await expect(harness.attempt.reconcileOnce(GATE_ID)).resolves.toMatchObject(
      {
        status: 'status_observation_recorded',
        blockers: [],
        observationReplayed: false,
        providerCallStarted: true,
        providerCallCompleted: true,
        statusLookupRequired: true,
        financialReconciliationComplete: false,
        submissionRetryAllowed: false,
      },
    );
    expect(harness.run).toHaveBeenCalledTimes(1);
    expect(harness.run).toHaveBeenCalledWith(
      { kind: 'market_order_status_lookup', providerOrderId: '1234567890' },
      undefined,
    );
    expect(harness.record).toHaveBeenCalledTimes(1);
    expect(harness.record).toHaveBeenCalledWith(
      expect.objectContaining({
        providerStatus: 'PENDING',
        statusLookupRequired: true,
      }),
    );
  });

  it('records a finished provider state without claiming financial reconciliation', async () => {
    const harness = createHarness({
      response: providerResponse({
        status: 'FINISHED',
        txHash: `0x${'ab'.repeat(32)}`,
      }),
    });

    await expect(harness.attempt.reconcileOnce(GATE_ID)).resolves.toMatchObject(
      {
        status: 'status_observation_recorded',
        statusLookupRequired: false,
        financialReconciliationRequired: true,
        financialReconciliationComplete: false,
        submissionRetryAllowed: false,
        storedObservation: {
          observation: {
            providerStatus: 'FINISHED',
            executionSucceeded: true,
            actualReceivedQuantity: null,
          },
        },
      },
    );
  });

  it('records a failed provider state without allowing resubmission', async () => {
    const harness = createHarness({
      response: providerResponse({ status: 'FAILED' }),
    });

    await expect(harness.attempt.reconcileOnce(GATE_ID)).resolves.toMatchObject(
      {
        status: 'status_observation_recorded',
        statusLookupRequired: false,
        financialReconciliationComplete: false,
        submissionRetryAllowed: false,
        storedObservation: {
          observation: {
            providerStatus: 'FAILED',
            terminal: true,
            executionSucceeded: false,
          },
        },
      },
    );
  });

  it('does not call the provider when the latest durable state is terminal', async () => {
    const harness = createHarness({
      context: reconciliationContext({
        reconciliationState: reconciliationState({
          phase: 'provider_failed',
          providerStatus: 'FAILED',
          latestObservationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          latestObservationRecordedAt: new Date('2026-10-03T12:00:06.000Z'),
          terminal: true,
          statusLookupRequired: false,
        }),
      }),
    });

    await expect(harness.attempt.reconcileOnce(GATE_ID)).resolves.toMatchObject(
      {
        status: 'status_lookup_not_required',
        providerCallStarted: false,
        providerCallCompleted: false,
        statusLookupRequired: false,
      },
    );
    expect(harness.run).not.toHaveBeenCalled();
    expect(harness.record).not.toHaveBeenCalled();
  });

  it.each([
    [
      'gate',
      reconciliationContext({ gate: gate({ sourceQuantity: '5.0' }) }),
      'invalid_submission_gate',
    ],
    [
      'receipt',
      reconciliationContext({
        submissionReceipt: storedReceipt({ terminal: true as false }),
      }),
      'invalid_submission_receipt',
    ],
    [
      'correlation',
      reconciliationContext({
        submissionReceipt: storedReceipt({
          gateId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        }),
      }),
      'gate_receipt_mismatch',
    ],
    [
      'receipt timing',
      reconciliationContext({
        submissionReceipt: {
          receipt: receipt(),
          recordedAt: new Date('2026-10-03T12:00:04.050Z'),
        },
      }),
      'invalid_submission_receipt_timing',
    ],
  ])(
    'blocks invalid %s durable context before provider access',
    async (_, context, blocker) => {
      const harness = createHarness({ context });

      await expect(
        harness.attempt.reconcileOnce(GATE_ID),
      ).resolves.toMatchObject({ status: 'blocked', blockers: [blocker] });
      expect(harness.getByGateId).toHaveBeenCalledWith(GATE_ID);
      expect(harness.run).not.toHaveBeenCalled();
      expect(harness.record).not.toHaveBeenCalled();
    },
  );

  it('blocks an absent or identity-divergent durable context before lookup', async () => {
    const absent = createHarness({ context: null });
    await expect(absent.attempt.reconcileOnce(GATE_ID)).resolves.toMatchObject({
      status: 'blocked',
      blockers: ['reconciliation_context_not_found'],
    });
    expect(absent.run).not.toHaveBeenCalled();

    const divergent = createHarness({
      context: reconciliationContext({
        reconciliationState: reconciliationState({
          providerOrderId: 'different-order',
        }),
      }),
    });
    await expect(
      divergent.attempt.reconcileOnce(GATE_ID),
    ).resolves.toMatchObject({
      status: 'blocked',
      blockers: ['reconciliation_evidence_mismatch'],
    });
    expect(divergent.run).not.toHaveBeenCalled();

    const malformed = createHarness({
      context: reconciliationContext({
        reconciliationState: reconciliationState({
          financialReconciliationComplete: true as false,
        }),
      }),
    });
    await expect(
      malformed.attempt.reconcileOnce(GATE_ID),
    ).resolves.toMatchObject({
      status: 'blocked',
      blockers: ['invalid_reconciliation_state'],
    });
    expect(malformed.run).not.toHaveBeenCalled();
  });

  it('does not persist an invalid provider response', async () => {
    const harness = createHarness({ response: { success: false, data: null } });

    await expect(harness.attempt.reconcileOnce(GATE_ID)).resolves.toMatchObject(
      {
        status: 'status_response_invalid',
        blockers: ['provider_reported_failure'],
        providerCallStarted: true,
        providerCallCompleted: true,
        statusLookupRequired: true,
        submissionRetryAllowed: false,
      },
    );
    expect(harness.run).toHaveBeenCalledTimes(1);
    expect(harness.record).not.toHaveBeenCalled();
  });

  it('forwards cancellation and never retries a failed lookup', async () => {
    const error = new Error('lookup failed');
    const harness = createHarness({ lookupError: error });
    const controller = new AbortController();

    await expect(
      harness.attempt.reconcileOnce(GATE_ID, controller.signal),
    ).rejects.toBe(error);
    expect(harness.run).toHaveBeenCalledTimes(1);
    expect(harness.run).toHaveBeenCalledWith(
      expect.any(Object),
      controller.signal,
    );
    expect(harness.record).not.toHaveBeenCalled();
  });

  it('propagates a persistence failure without another lookup or write', async () => {
    const error = new Error('persistence failed');
    const harness = createHarness({ storeError: error });

    await expect(harness.attempt.reconcileOnce(GATE_ID)).rejects.toBe(error);
    expect(harness.run).toHaveBeenCalledTimes(1);
    expect(harness.record).toHaveBeenCalledTimes(1);
  });
});

function createHarness(
  options: {
    context?: AgenticWalletMarketSwapStatusReconciliationContext | null;
    response?: unknown;
    lookupError?: Error;
    storeError?: Error;
  } = {},
) {
  const context =
    'context' in options ? options.context : reconciliationContext();
  const getByGateId = jest.fn().mockResolvedValue(context);
  const run = options.lookupError
    ? jest.fn().mockRejectedValue(options.lookupError)
    : jest.fn().mockResolvedValue(options.response ?? providerResponse());
  const record = options.storeError
    ? jest.fn().mockRejectedValue(options.storeError)
    : jest.fn((observation) =>
        Promise.resolve({
          stored: {
            id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            observation,
            recordedAt: new Date('2026-10-03T12:00:06.000Z'),
          },
          replayed: false,
        }),
      );
  return {
    attempt: new AgenticWalletMarketSwapStatusReconciliationAttempt(
      { getByGateId },
      { run } as AgenticWalletMarketSwapStatusLookupRunner,
      { record } as AgenticWalletMarketSwapStatusObservationStore,
    ),
    getByGateId,
    run,
    record,
  };
}

function providerResponse(
  rowOverrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    success: true,
    data: {
      total: 1,
      page: 1,
      pageSize: 20,
      list: [
        {
          orderType: 'market',
          orderId: '1234567890',
          chain: '56',
          fromToken: '0x55d398326f99059ff775485246999027b3197955',
          fromTokenName: 'USDT',
          fromTokenQty: '5',
          toToken: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
          toTokenName: 'BTCB',
          status: 'PENDING',
          slippage: '0.1',
          txHash: null,
          bookTime: '2026-10-03T20:00:00+08:00',
          updatedTime: '2026-10-03T20:00:01+08:00',
          ...rowOverrides,
        },
      ],
    },
  };
}

function reconciliationContext(
  overrides: Partial<AgenticWalletMarketSwapStatusReconciliationContext> = {},
): AgenticWalletMarketSwapStatusReconciliationContext {
  return {
    gate: gate(),
    submissionReceipt: storedReceipt(),
    reconciliationState: reconciliationState(),
    ...overrides,
  };
}

function storedReceipt(
  overrides: Partial<AgenticWalletMarketSwapSubmissionReceipt> = {},
) {
  return {
    receipt: receipt(overrides),
    recordedAt: new Date('2026-10-03T12:00:05.000Z'),
  };
}

function reconciliationState(
  overrides: Partial<AgenticWalletMarketSwapReconciliationState> = {},
): AgenticWalletMarketSwapReconciliationState {
  return {
    scope: 'agentic_wallet_market_swap_reconciliation_state',
    providerId: 'agentic_wallet',
    gateId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    providerOrderId: '1234567890',
    phase: 'awaiting_status_observation',
    providerStatus: null,
    transactionHash: null,
    receiptRecordedAt: new Date('2026-10-03T12:00:05.000Z'),
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

function gate(
  overrides: Partial<StoredRealExecutionSubmissionGate> = {},
): StoredRealExecutionSubmissionGate {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
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
    emergencyStopRecheckedAt: new Date('2026-10-03T12:00:04.000Z'),
    confirmationConsumedAt: new Date('2026-10-03T12:00:04.000Z'),
    expiresAt: new Date('2026-10-03T12:00:07.000Z'),
    createdAt: new Date('2026-10-03T12:00:04.100Z'),
    atomicGateSatisfied: true,
    confirmationConsumed: true,
    providerSubmissionStarted: false,
    submissionAuthorized: false,
    ...overrides,
  };
}
