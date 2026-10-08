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

  it('isolates sequential attempts and reporting from candidate-batch mutation', async () => {
    const returnedCandidates = [candidate(1), candidate(2)];
    const originalSecondGateId = returnedCandidates[1].gateId;
    const originalFirstReceiptTime = new Date(
      returnedCandidates[0].receiptRecordedAt,
    );
    const reconcileOnce = jest.fn((gateId: string) => {
      if (gateId === returnedCandidates[0].gateId) {
        returnedCandidates[0].receiptRecordedAt.setTime(
          new Date('2026-10-05T12:00:06.000Z').getTime(),
        );
        Object.assign(returnedCandidates[1], { gateId: uuid(99) });
        returnedCandidates.reverse();
      }
      return Promise.resolve(attemptResult('status_lookup_not_required'));
    });
    const harness = cycleHarness(returnedCandidates, reconcileOnce);

    const result = await harness.cycle.runOnce(INPUT);

    expect(reconcileOnce.mock.calls.map(([gateId]) => gateId)).toEqual([
      uuid(1),
      originalSecondGateId,
    ]);
    expect(result.outcomes.map(({ candidate: row }) => row.gateId)).toEqual([
      uuid(1),
      originalSecondGateId,
    ]);
    expect(result.outcomes[0].candidate).not.toBe(returnedCandidates[1]);
    expect(result.outcomes[0].candidate.receiptRecordedAt).toEqual(
      originalFirstReceiptTime,
    );
    expect(result.outcomes[0].candidate.receiptRecordedAt).not.toBe(
      returnedCandidates[1].receiptRecordedAt,
    );
  });

  it('isolates reporting from mutation of an earlier attempt result', async () => {
    const firstResult = attemptResult('status_observation_recorded');
    const originalEvaluatedAt = new Date(firstResult.evaluatedAt!);
    const reconcileOnce = jest
      .fn()
      .mockResolvedValueOnce(firstResult)
      .mockImplementationOnce(() => {
        Object.assign(firstResult, {
          status: 'blocked',
          providerCallStarted: false,
          providerCallCompleted: false,
        });
        firstResult.evaluatedAt!.setTime(
          new Date('2026-10-05T12:10:00.000Z').getTime(),
        );
        (firstResult.blockers as string[]).push('invalid_reconciliation_state');
        return Promise.resolve(attemptResult('status_lookup_not_required'));
      });
    const harness = cycleHarness([candidate(1), candidate(2)], reconcileOnce);

    const result = await harness.cycle.runOnce(INPUT);

    expect(result).toMatchObject({
      observationRecordedCount: 1,
      lookupNotRequiredCount: 1,
      blockedCount: 0,
    });
    expect(result.outcomes[0].attempt).toMatchObject({
      status: 'status_observation_recorded',
      blockers: [],
      evaluatedAt: originalEvaluatedAt,
      providerCallStarted: true,
      providerCallCompleted: true,
    });
    expect(result.outcomes[0].attempt).not.toBe(firstResult);
    expect(result.outcomes[0].attempt.evaluatedAt).not.toBe(
      firstResult.evaluatedAt,
    );
    expect(result.outcomes[0].attempt.storedObservation).not.toBe(
      firstResult.storedObservation,
    );
  });

  it('fails closed on a malformed attempt result before the next candidate', async () => {
    const malformed = {
      ...attemptResult('status_lookup_not_required'),
      financialReconciliationComplete: true,
    } as unknown as AgenticWalletMarketSwapStatusReconciliationAttemptResult;
    const reconcileOnce = jest.fn().mockResolvedValue(malformed);
    const harness = cycleHarness([candidate(1), candidate(2)], reconcileOnce);

    await expect(harness.cycle.runOnce(INPUT)).rejects.toThrow(
      'Agentic Wallet status reconciliation attempt result is invalid',
    );
    expect(reconcileOnce).toHaveBeenCalledTimes(1);
  });

  it('rejects blockers that do not belong to the reported attempt status', async () => {
    const cases = [
      {
        result: attemptResult('blocked'),
        blocker: 'provider_reported_failure',
      },
      {
        result: attemptResult('status_response_invalid'),
        blocker: 'reconciliation_context_not_found',
      },
    ] as const;

    for (const testCase of cases) {
      Object.assign(testCase.result, { blockers: [testCase.blocker] });
      const harness = cycleHarness(
        [candidate(1)],
        jest.fn().mockResolvedValue(testCase.result),
      );

      await expect(harness.cycle.runOnce(INPUT)).rejects.toThrow(
        'Agentic Wallet status reconciliation attempt result is invalid',
      );
    }
  });

  it('accepts shared gate blockers in their valid pre- and post-call statuses', async () => {
    const blocked = attemptResult('blocked');
    Object.assign(blocked, { blockers: ['invalid_submission_gate'] });
    const invalidResponse = attemptResult('status_response_invalid');
    Object.assign(invalidResponse, { blockers: ['invalid_submission_gate'] });
    const reconcileOnce = jest
      .fn()
      .mockResolvedValueOnce(blocked)
      .mockResolvedValueOnce(invalidResponse);
    const harness = cycleHarness([candidate(1), candidate(2)], reconcileOnce);

    await expect(harness.cycle.runOnce(INPUT)).resolves.toMatchObject({
      status: 'completed',
      blockedCount: 1,
      invalidResponseCount: 1,
    });
  });

  it('rejects multiple blockers for a pre-provider attempt', async () => {
    const malformed = attemptResult('blocked');
    Object.assign(malformed, {
      blockers: [
        'invalid_reconciliation_state',
        'reconciliation_evidence_mismatch',
      ],
    });
    const reconcileOnce = jest.fn().mockResolvedValue(malformed);
    const harness = cycleHarness([candidate(1), candidate(2)], reconcileOnce);

    await expect(harness.cycle.runOnce(INPUT)).rejects.toThrow(
      'Agentic Wallet status reconciliation attempt result is invalid',
    );
    expect(reconcileOnce).toHaveBeenCalledTimes(1);
  });

  it('requires status-response blockers in their canonical assessor order', async () => {
    const canonical = attemptResult('status_response_invalid');
    Object.assign(canonical, {
      blockers: ['invalid_order_lookup_payload', 'order_identity_mismatch'],
    });
    const reversed = attemptResult('status_response_invalid');
    Object.assign(reversed, {
      blockers: ['order_identity_mismatch', 'invalid_order_lookup_payload'],
    });
    const canonicalHarness = cycleHarness(
      [candidate(1)],
      jest.fn().mockResolvedValue(canonical),
    );
    const reversedHarness = cycleHarness(
      [candidate(1)],
      jest.fn().mockResolvedValue(reversed),
    );

    await expect(canonicalHarness.cycle.runOnce(INPUT)).resolves.toMatchObject({
      status: 'completed',
      invalidResponseCount: 1,
    });
    await expect(reversedHarness.cycle.runOnce(INPUT)).rejects.toThrow(
      'Agentic Wallet status reconciliation attempt result is invalid',
    );
  });

  it('rejects ordered status-response blocker combinations the assessor cannot emit', async () => {
    const impossibleBlockerLists = [
      ['invalid_submission_gate', 'gate_receipt_mismatch'],
      ['invalid_submission_receipt', 'order_identity_mismatch'],
      ['invalid_response_envelope', 'provider_reported_failure'],
      ['provider_reported_failure', 'order_payload_mismatch'],
    ] as const;

    for (const blockers of impossibleBlockerLists) {
      const malformed = attemptResult('status_response_invalid');
      Object.assign(malformed, { blockers });
      const reconcileOnce = jest.fn().mockResolvedValue(malformed);
      const harness = cycleHarness([candidate(1), candidate(2)], reconcileOnce);

      await expect(harness.cycle.runOnce(INPUT)).rejects.toThrow(
        'Agentic Wallet status reconciliation attempt result is invalid',
      );
      expect(reconcileOnce).toHaveBeenCalledTimes(1);
    }
  });

  it('rejects a provider call reported before the candidate was eligible', async () => {
    const malformed = attemptResult('status_response_invalid');
    malformed.evaluatedAt!.setTime(
      new Date('2026-10-05T12:00:04.999Z').getTime(),
    );
    const harness = cycleHarness(
      [candidate(1)],
      jest.fn().mockResolvedValue(malformed),
    );

    await expect(harness.cycle.runOnce(INPUT)).rejects.toThrow(
      'Agentic Wallet status reconciliation attempt result is invalid',
    );
  });

  it('rejects completed provider work that drops pending-candidate cadence evidence', async () => {
    for (const status of [
      'status_response_invalid',
      'status_observation_recorded',
    ] as const) {
      const malformed = attemptResult(status);
      const harness = cycleHarness(
        [pendingCandidate(1)],
        jest.fn().mockResolvedValue(malformed),
      );

      await expect(harness.cycle.runOnce(INPUT)).rejects.toThrow(
        'Agentic Wallet status reconciliation attempt result is invalid',
      );
    }
  });

  it('rejects completed provider work with a regressed pending-candidate cadence boundary', async () => {
    for (const status of [
      'status_response_invalid',
      'status_observation_recorded',
    ] as const) {
      const malformed = attemptResult(status);
      Object.assign(malformed, {
        nextStatusLookupAt: new Date(EVALUATED_AT.getTime() - 1),
      });
      const harness = cycleHarness(
        [pendingCandidate(1)],
        jest.fn().mockResolvedValue(malformed),
      );

      await expect(harness.cycle.runOnce(INPUT)).rejects.toThrow(
        'Agentic Wallet status reconciliation attempt result is invalid',
      );
    }
  });

  it('accepts completed provider work with pending-candidate cadence evidence', async () => {
    for (const status of [
      'status_response_invalid',
      'status_observation_recorded',
    ] as const) {
      const result = attemptResult(status);
      Object.assign(result, { nextStatusLookupAt: new Date(EVALUATED_AT) });
      const harness = cycleHarness(
        [pendingCandidate(1)],
        jest.fn().mockResolvedValue(result),
      );

      await expect(harness.cycle.runOnce(INPUT)).resolves.toMatchObject({
        status: 'completed',
        candidateCount: 1,
        outcomes: [{ attempt: { status } }],
      });
    }
  });

  it('accepts a pending-candidate cadence boundary advanced by authoritative reload', async () => {
    for (const status of [
      'status_response_invalid',
      'status_observation_recorded',
    ] as const) {
      const result = attemptResult(status);
      Object.assign(result, { nextStatusLookupAt: new Date(EVALUATED_AT) });
      const harness = cycleHarness(
        [
          pendingCandidate(1, {
            latestObservationRecordedAt: new Date(
              EVALUATED_AT.getTime() - INPUT.minimumLookupIntervalMs - 1,
            ),
            eligibleAt: new Date(EVALUATED_AT.getTime() - 1),
          }),
        ],
        jest.fn().mockResolvedValue(result),
      );

      await expect(harness.cycle.runOnce(INPUT)).resolves.toMatchObject({
        status: 'completed',
        candidateCount: 1,
        outcomes: [{ attempt: { status } }],
      });
    }
  });

  it('rejects completed provider work evaluated before candidate discovery', async () => {
    for (const status of [
      'status_response_invalid',
      'status_observation_recorded',
    ] as const) {
      const malformed = attemptResult(status);
      malformed.evaluatedAt!.setTime(
        new Date('2026-10-05T12:00:06.999Z').getTime(),
      );
      const harness = cycleHarness(
        [
          candidate(1, {
            eligibleAt: new Date('2026-10-05T12:00:05.000Z'),
          }),
        ],
        jest.fn().mockResolvedValue(malformed),
      );

      await expect(harness.cycle.runOnce(INPUT)).rejects.toThrow(
        'Agentic Wallet status reconciliation attempt result is invalid',
      );
    }
  });

  it('rejects a deferred attempt evaluated before candidate discovery', async () => {
    const malformed = attemptResult('status_lookup_deferred');
    malformed.evaluatedAt!.setTime(
      new Date('2026-10-05T12:00:06.999Z').getTime(),
    );
    const harness = cycleHarness(
      [
        candidate(1, {
          eligibleAt: new Date('2026-10-05T12:00:05.000Z'),
        }),
      ],
      jest.fn().mockResolvedValue(malformed),
    );

    await expect(harness.cycle.runOnce(INPUT)).rejects.toThrow(
      'Agentic Wallet status reconciliation attempt result is invalid',
    );
  });

  it('rejects a newly stored observation recorded before its evaluation', async () => {
    const malformed = attemptResult('status_observation_recorded');
    malformed.storedObservation!.recordedAt.setTime(
      new Date('2026-10-05T12:00:06.999Z').getTime(),
    );
    const harness = cycleHarness(
      [candidate(1)],
      jest.fn().mockResolvedValue(malformed),
    );

    await expect(harness.cycle.runOnce(INPUT)).rejects.toThrow(
      'Agentic Wallet status reconciliation attempt result is invalid',
    );
  });

  it('accepts an immutable replay recorded before the current evaluation', async () => {
    const replay = attemptResult('status_observation_recorded');
    Object.assign(replay, { observationReplayed: true });
    replay.storedObservation!.recordedAt.setTime(
      new Date('2026-10-05T12:00:06.000Z').getTime(),
    );
    const harness = cycleHarness(
      [candidate(1)],
      jest.fn().mockResolvedValue(replay),
    );

    await expect(harness.cycle.runOnce(INPUT)).resolves.toMatchObject({
      status: 'completed',
      observationRecordedCount: 1,
      outcomes: [{ attempt: { observationReplayed: true } }],
    });
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

  it('propagates cancellation after the final attempt and releases its claim', async () => {
    const controller = new AbortController();
    const reason = new Error('operator cancelled reconciliation');
    const reconcileOnce = jest.fn(() => {
      controller.abort(reason);
      return Promise.resolve(attemptResult('status_lookup_not_required'));
    });
    const harness = cycleHarness([candidate(1)], reconcileOnce);

    await expect(harness.cycle.runOnce(INPUT, controller.signal)).rejects.toBe(
      reason,
    );

    await expect(harness.cycle.runOnce(INPUT)).resolves.toMatchObject({
      status: 'completed',
      attemptedCount: 1,
    });
    expect(reconcileOnce).toHaveBeenCalledTimes(2);
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
    ['gate tie-break order', [candidate(2), candidate(1)], INPUT],
    [
      'eligibility order',
      [
        candidate(1),
        candidate(2, {
          receiptRecordedAt: new Date('2026-10-05T12:00:04.000Z'),
          eligibleAt: new Date('2026-10-05T12:00:04.000Z'),
        }),
      ],
      INPUT,
    ],
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
  const providerCallCompleted =
    status === 'status_response_invalid' ||
    status === 'status_observation_recorded';
  const evaluatedAt =
    status === 'status_lookup_deferred' || providerCallCompleted
      ? new Date(EVALUATED_AT)
      : null;
  const storedObservation =
    status === 'status_observation_recorded'
      ? {
          id: uuid(101),
          observation: {
            kind: 'agentic_wallet_market_swap_status_observation' as const,
            providerId: 'agentic_wallet' as const,
            gateId: uuid(1),
            providerOrderId: 'order-1',
            providerStatus: 'PENDING' as const,
            transactionHash: null,
            bookedAt: new Date('2026-10-05T12:00:05.000Z'),
            updatedAt: new Date('2026-10-05T12:00:06.000Z'),
            terminal: false,
            executionSucceeded: false,
            statusLookupRequired: true,
            financialReconciliationRequired: true as const,
            financialReconciliationComplete: false as const,
            actualReceivedQuantity: null,
            submissionRetryAllowed: false as const,
          },
          recordedAt: new Date(EVALUATED_AT),
        }
      : null;
  return {
    scope: 'agentic_wallet_market_swap_status_reconciliation_attempt',
    status,
    blockers:
      status === 'blocked'
        ? ['invalid_reconciliation_state']
        : status === 'status_response_invalid'
          ? ['provider_reported_failure']
          : [],
    storedObservation,
    observationReplayed: false,
    evaluatedAt,
    nextStatusLookupAt:
      status === 'status_lookup_deferred'
        ? new Date(EVALUATED_AT.getTime() + 1_000)
        : null,
    providerCallStarted: providerCallCompleted,
    providerCallCompleted,
    statusLookupRequired:
      status === 'status_lookup_deferred' || providerCallCompleted,
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
