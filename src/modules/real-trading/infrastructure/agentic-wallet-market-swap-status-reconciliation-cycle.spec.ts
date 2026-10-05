import { jest } from '@jest/globals';

import { AgenticWalletMarketSwapStatusReconciliationAttemptResult } from './agentic-wallet-market-swap-status-reconciliation-attempt';
import { AgenticWalletMarketSwapStatusReconciliationCandidate } from './agentic-wallet-market-swap-status-reconciliation-candidate.store';
import { AgenticWalletMarketSwapStatusReconciliationCycle } from './agentic-wallet-market-swap-status-reconciliation-cycle';

const EVALUATED_AT = new Date('2026-10-05T12:00:07.000Z');
const INPUT = {
  evaluatedAt: EVALUATED_AT,
  minimumLookupIntervalMs: 1_000,
  limit: 5,
};

describe('AgenticWalletMarketSwapStatusReconciliationCycle', () => {
  it('processes one bounded candidate batch sequentially and summarizes outcomes', async () => {
    let activeAttempts = 0;
    let maximumActiveAttempts = 0;
    const statuses: AgenticWalletMarketSwapStatusReconciliationAttemptResult['status'][] =
      [
        'status_observation_recorded',
        'status_lookup_deferred',
        'status_lookup_not_required',
        'status_response_invalid',
        'blocked',
      ];
    const reconcileOnce = jest.fn(async () => {
      activeAttempts += 1;
      maximumActiveAttempts = Math.max(maximumActiveAttempts, activeAttempts);
      await Promise.resolve();
      activeAttempts -= 1;
      return attemptResult(statuses.shift()!);
    });
    const harness = cycleHarness(
      Array.from({ length: 5 }, (_, index) => candidate(index + 1)),
      reconcileOnce,
    );

    await expect(harness.cycle.runOnce(INPUT)).resolves.toMatchObject({
      scope: 'agentic_wallet_market_swap_status_reconciliation_cycle',
      status: 'completed',
      blockers: [],
      evaluatedAt: EVALUATED_AT,
      minimumLookupIntervalMs: 1_000,
      limit: 5,
      candidateCount: 5,
      attemptedCount: 5,
      observationRecordedCount: 1,
      lookupDeferredCount: 1,
      lookupNotRequiredCount: 1,
      invalidResponseCount: 1,
      blockedCount: 1,
      automaticRetryPerformed: false,
      financialReconciliationComplete: false,
      submissionRetryAllowed: false,
    });
    expect(maximumActiveAttempts).toBe(1);
    expect(reconcileOnce.mock.calls.map(([gateId]) => gateId)).toEqual(
      Array.from({ length: 5 }, (_, index) => candidate(index + 1).gateId),
    );
  });

  it('returns an empty bounded result without invoking an attempt', async () => {
    const harness = cycleHarness([]);

    await expect(harness.cycle.runOnce(INPUT)).resolves.toMatchObject({
      candidateCount: 0,
      attemptedCount: 0,
      outcomes: [],
    });
    expect(harness.reconcileOnce).not.toHaveBeenCalled();
  });

  it('isolates the admitted cycle from caller and candidate-store input mutation', async () => {
    let discoveredInput!: {
      evaluatedAt: Date;
      minimumLookupIntervalMs: number;
      limit: number;
    };
    let releaseDiscovery!: (
      candidates: AgenticWalletMarketSwapStatusReconciliationCandidate[],
    ) => void;
    const harness = cycleHarness([]);
    harness.listDue.mockImplementationOnce(
      (input) =>
        new Promise((resolve) => {
          discoveredInput = input;
          releaseDiscovery = resolve;
        }),
    );
    const callerInput = {
      evaluatedAt: new Date(EVALUATED_AT),
      minimumLookupIntervalMs: 1_000,
      limit: 5,
    };

    const activeCycle = harness.cycle.runOnce(callerInput);
    callerInput.evaluatedAt.setTime(
      new Date('2026-10-05T12:01:00.000Z').getTime(),
    );
    callerInput.minimumLookupIntervalMs = 3_600_000;
    callerInput.limit = 1;
    discoveredInput.evaluatedAt.setTime(
      new Date('2026-10-05T12:02:00.000Z').getTime(),
    );
    discoveredInput.minimumLookupIntervalMs = 2_000;
    discoveredInput.limit = 2;
    releaseDiscovery([candidate(1)]);

    await expect(activeCycle).resolves.toMatchObject({
      evaluatedAt: EVALUATED_AT,
      minimumLookupIntervalMs: 1_000,
      limit: 5,
      candidateCount: 1,
      attemptedCount: 1,
    });
    expect(discoveredInput).not.toBe(callerInput);
    expect(discoveredInput.evaluatedAt).not.toBe(callerInput.evaluatedAt);
  });

  it('blocks an overlapping cycle before discovery without waiting', async () => {
    let releaseDiscovery!: (
      candidates: AgenticWalletMarketSwapStatusReconciliationCandidate[],
    ) => void;
    const harness = cycleHarness([]);
    harness.listDue.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseDiscovery = resolve;
        }),
    );

    const activeCycle = harness.cycle.runOnce(INPUT);

    await expect(harness.cycle.runOnce(INPUT)).resolves.toMatchObject({
      status: 'blocked',
      blockers: ['reconciliation_cycle_in_progress'],
      candidateCount: 0,
      attemptedCount: 0,
      outcomes: [],
    });
    expect(harness.listDue).toHaveBeenCalledTimes(1);
    expect(harness.reconcileOnce).not.toHaveBeenCalled();

    releaseDiscovery([]);
    await expect(activeCycle).resolves.toMatchObject({ status: 'completed' });
  });

  it('forwards one caller cancellation signal to every sequential attempt', async () => {
    const harness = cycleHarness([candidate(1), candidate(2)]);
    const controller = new AbortController();

    await harness.cycle.runOnce(INPUT, controller.signal);

    expect(harness.reconcileOnce).toHaveBeenNthCalledWith(
      1,
      candidate(1).gateId,
      controller.signal,
    );
    expect(harness.reconcileOnce).toHaveBeenNthCalledWith(
      2,
      candidate(2).gateId,
      controller.signal,
    );
  });

  it('rejects a pre-cancelled cycle before discovery and releases its claim', async () => {
    const harness = cycleHarness([]);
    const controller = new AbortController();
    controller.abort();

    await expect(
      harness.cycle.runOnce(INPUT, controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(harness.listDue).not.toHaveBeenCalled();

    await expect(harness.cycle.runOnce(INPUT)).resolves.toMatchObject({
      status: 'completed',
    });
    expect(harness.listDue).toHaveBeenCalledTimes(1);
  });

  it('stops after discovery when cancellation arrives while candidates load', async () => {
    let releaseDiscovery!: (
      candidates: AgenticWalletMarketSwapStatusReconciliationCandidate[],
    ) => void;
    const harness = cycleHarness([]);
    harness.listDue.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseDiscovery = resolve;
        }),
    );
    const controller = new AbortController();

    const activeCycle = harness.cycle.runOnce(INPUT, controller.signal);
    controller.abort();
    releaseDiscovery([candidate(1)]);

    await expect(activeCycle).rejects.toMatchObject({ name: 'AbortError' });
    expect(harness.reconcileOnce).not.toHaveBeenCalled();
  });

  it('stops before the next candidate when cancellation arrives between attempts', async () => {
    const controller = new AbortController();
    const reconcileOnce = jest.fn().mockImplementationOnce(async () => {
      await Promise.resolve();
      controller.abort();
      return attemptResult('status_observation_recorded');
    });
    const harness = cycleHarness([candidate(1), candidate(2)], reconcileOnce);

    await expect(
      harness.cycle.runOnce(INPUT, controller.signal),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(reconcileOnce).toHaveBeenCalledTimes(1);
    expect(reconcileOnce).toHaveBeenCalledWith(
      candidate(1).gateId,
      controller.signal,
    );
  });

  it.each([
    { ...INPUT, limit: 0 },
    { ...INPUT, minimumLookupIntervalMs: 999 },
    { ...INPUT, evaluatedAt: new Date(Number.NaN) },
  ])('rejects invalid input before candidate discovery', async (input) => {
    const harness = cycleHarness([]);

    await expect(harness.cycle.runOnce(input)).rejects.toThrow(
      'Agentic Wallet status reconciliation candidate input blocked',
    );
    expect(harness.listDue).not.toHaveBeenCalled();
  });

  it.each([
    ['oversized', [candidate(1), candidate(2)], { ...INPUT, limit: 1 }],
    ['duplicate', [candidate(1), candidate(1)], INPUT],
    [
      'wrong evaluation time',
      [
        candidate(1, {
          evaluatedAt: new Date('2026-10-05T12:00:08.000Z'),
        }),
      ],
      INPUT,
    ],
    [
      'wrong pending boundary',
      [
        pendingCandidate(1, {
          eligibleAt: new Date('2026-10-05T12:00:06.999Z'),
        }),
      ],
      INPUT,
    ],
  ])(
    'blocks an invalid %s candidate batch before attempts',
    async (_, rows, input) => {
      const harness = cycleHarness(rows);

      await expect(harness.cycle.runOnce(input)).rejects.toThrow(
        'Agentic Wallet status reconciliation candidate batch is invalid',
      );
      expect(harness.reconcileOnce).not.toHaveBeenCalled();
    },
  );

  it('propagates candidate discovery failure without an attempt', async () => {
    const error = new Error('candidate read failed');
    const harness = cycleHarness([]);
    harness.listDue.mockRejectedValueOnce(error);

    await expect(harness.cycle.runOnce(INPUT)).rejects.toBe(error);
    await expect(harness.cycle.runOnce(INPUT)).resolves.toMatchObject({
      status: 'completed',
    });
    expect(harness.listDue).toHaveBeenCalledTimes(2);
    expect(harness.reconcileOnce).not.toHaveBeenCalled();
  });

  it('propagates an attempt failure, stops the batch, and never retries', async () => {
    const error = new Error('lookup failed');
    const reconcileOnce = jest
      .fn()
      .mockResolvedValueOnce(attemptResult('status_observation_recorded'))
      .mockRejectedValueOnce(error);
    const harness = cycleHarness(
      [candidate(1), candidate(2), candidate(3)],
      reconcileOnce,
    );

    await expect(harness.cycle.runOnce(INPUT)).rejects.toBe(error);
    harness.listDue.mockResolvedValueOnce([]);
    await expect(harness.cycle.runOnce(INPUT)).resolves.toMatchObject({
      status: 'completed',
    });
    expect(reconcileOnce).toHaveBeenCalledTimes(2);
  });
});

function cycleHarness(
  candidates: AgenticWalletMarketSwapStatusReconciliationCandidate[],
  reconcileOnce = jest.fn().mockResolvedValue(attemptResult('blocked')),
) {
  const listDue = jest.fn().mockResolvedValue(candidates);
  return {
    cycle: new AgenticWalletMarketSwapStatusReconciliationCycle(
      { listDue },
      { reconcileOnce },
    ),
    listDue,
    reconcileOnce,
  };
}

function candidate(
  seed: number,
  overrides: Partial<AgenticWalletMarketSwapStatusReconciliationCandidate> = {},
): AgenticWalletMarketSwapStatusReconciliationCandidate {
  return {
    scope: 'agentic_wallet_market_swap_status_reconciliation_candidate',
    providerId: 'agentic_wallet',
    gateId: uuid(seed),
    providerOrderId: `order-${seed}`,
    phase: 'awaiting_status_observation',
    receiptRecordedAt: new Date('2026-10-05T12:00:05.000Z'),
    latestObservationId: null,
    latestObservationRecordedAt: null,
    eligibleAt: new Date('2026-10-05T12:00:05.000Z'),
    evaluatedAt: EVALUATED_AT,
    statusLookupRequired: true,
    financialReconciliationRequired: true,
    financialReconciliationComplete: false,
    submissionRetryAllowed: false,
    ...overrides,
  };
}

function pendingCandidate(
  seed: number,
  overrides: Partial<AgenticWalletMarketSwapStatusReconciliationCandidate> = {},
): AgenticWalletMarketSwapStatusReconciliationCandidate {
  return candidate(seed, {
    phase: 'provider_pending',
    latestObservationId: uuid(seed + 100),
    latestObservationRecordedAt: new Date('2026-10-05T12:00:06.000Z'),
    eligibleAt: EVALUATED_AT,
    ...overrides,
  });
}

function attemptResult(
  status: AgenticWalletMarketSwapStatusReconciliationAttemptResult['status'],
): AgenticWalletMarketSwapStatusReconciliationAttemptResult {
  return {
    scope: 'agentic_wallet_market_swap_status_reconciliation_attempt',
    status,
    blockers: status === 'blocked' ? ['invalid_reconciliation_state'] : [],
    storedObservation: null,
    observationReplayed: false,
    evaluatedAt: null,
    nextStatusLookupAt: null,
    providerCallStarted: false,
    providerCallCompleted: false,
    statusLookupRequired: status === 'status_lookup_deferred',
    financialReconciliationRequired: true,
    financialReconciliationComplete: false,
    submissionRetryAllowed: false,
  };
}

function uuid(value: number): string {
  return `${value.toString(16).padStart(8, '0')}-0000-4000-8000-${value
    .toString(16)
    .padStart(12, '0')}`;
}
