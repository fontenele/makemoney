import { jest } from '@jest/globals';

import { AgenticWalletMarketSwapCommandRunner } from '../infrastructure/agentic-wallet-market-swap-command-runner';
import { RealExecutionSubmissionAttemptStore } from './real-execution-submission-attempt.store';
import { RealExecutionSubmissionOutcomeStore } from './real-execution-submission-outcome.store';
import {
  InvalidRealExecutionSubmissionRequestError,
  RealExecutionSubmissionAlreadyClaimedError,
  RealExecutionSubmissionService,
} from './real-execution-submission.service';

const ATTEMPT_ID = '00000000-0000-4000-8000-000000000151';
const GATE_ID = '00000000-0000-4000-8000-000000000034';
const NOW = new Date('2026-10-24T22:00:06.000Z');

describe('RealExecutionSubmissionService', () => {
  it('runs exactly one fresh claimed command and records acknowledgment', async () => {
    const harness = createHarness({
      success: true,
      data: { orderId: 'order-1' },
    });

    await expect(harness.service.submit(request())).resolves.toMatchObject({
      replayed: false,
      outcome: {
        attemptId: ATTEMPT_ID,
        gateId: GATE_ID,
        status: 'submitted_pending_confirmation',
        providerOrderId: 'order-1',
        automaticRetryAllowed: false,
      },
    });
    expect(harness.runnerRun).toHaveBeenCalledTimes(1);
    expect(harness.recordOutcome).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['runner rejection', new Error('provider detail')],
    ['malformed response', { success: true, data: {} }],
    ['provider failure', { success: false, data: null }],
  ])('records an unknown non-retryable outcome for %s', async (_, response) => {
    const harness = createHarness(response);
    if (response instanceof Error)
      harness.runnerRun.mockRejectedValue(response);

    await expect(harness.service.submit(request())).resolves.toMatchObject({
      outcome: {
        status: 'submission_outcome_unknown',
        providerOrderId: null,
        automaticRetryAllowed: false,
      },
    });
    expect(harness.runnerRun).toHaveBeenCalledTimes(1);
  });

  it('returns an existing immutable outcome without invoking the runner', async () => {
    const harness = createHarness(undefined, true, storedOutcome());
    await expect(harness.service.submit(request())).resolves.toEqual({
      outcome: storedOutcome(),
      replayed: true,
    });
    expect(harness.runnerRun).not.toHaveBeenCalled();
    expect(harness.recordOutcome).not.toHaveBeenCalled();
  });

  it('blocks a claimed attempt whose outcome is not durably known', async () => {
    const harness = createHarness(undefined, true, null);
    await expect(harness.service.submit(request())).rejects.toBeInstanceOf(
      RealExecutionSubmissionAlreadyClaimedError,
    );
    expect(harness.runnerRun).not.toHaveBeenCalled();
  });

  it('rejects malformed input and pre-claim cancellation before dependencies', async () => {
    const harness = createHarness(undefined);
    await expect(
      harness.service.submit({ ...request(), extra: true }),
    ).rejects.toBeInstanceOf(InvalidRealExecutionSubmissionRequestError);
    const controller = new AbortController();
    controller.abort(new Error('cancelled'));
    await expect(
      harness.service.submit(request(), controller.signal),
    ).rejects.toThrow('cancelled');
    expect(harness.claimAttempt).not.toHaveBeenCalled();
  });
});

function createHarness(
  response: unknown,
  replayed = false,
  existing: Awaited<
    ReturnType<RealExecutionSubmissionOutcomeStore['findByAttemptId']>
  > = null,
) {
  const attempt = {
    id: ATTEMPT_ID,
    gateId: GATE_ID,
    requestFingerprint: 'a'.repeat(64),
    providerId: 'agentic_wallet' as const,
    chainId: '56' as const,
    payloadCommitmentVersion: 'real_execution_intent_quote_v1' as const,
    payloadCommitmentDigest: 'b'.repeat(64),
    emergencyStopChangeId: 'stop-clear-1',
    commandArgumentsFingerprint: 'c'.repeat(64),
    state: 'submission_claimed' as const,
    automaticRetryAllowed: false as const,
    providerSubmissionStarted: false as const,
    submissionAuthorized: false as const,
    claimedAt: new Date('2026-10-24T22:00:05.000Z'),
  };
  const command = {
    kind: 'agentic_wallet_claimed_market_swap' as const,
    attemptId: ATTEMPT_ID,
    gateId: GATE_ID,
    arguments: ['market-order', 'swap'],
    commandArgumentsFingerprint: 'c'.repeat(64),
    automaticRetryAllowed: false as const,
  };
  const claimAttempt = jest
    .fn<RealExecutionSubmissionAttemptStore['claim']>()
    .mockResolvedValue({
      attempt,
      replayed,
      command: replayed ? null : command,
    });
  const attempts = {
    claim: claimAttempt,
  } as unknown as jest.Mocked<RealExecutionSubmissionAttemptStore>;
  const runnerRun = jest
    .fn<AgenticWalletMarketSwapCommandRunner['run']>()
    .mockResolvedValue(response);
  const runner = {
    run: runnerRun,
  } as unknown as jest.Mocked<AgenticWalletMarketSwapCommandRunner>;
  const recordOutcome = jest.fn<RealExecutionSubmissionOutcomeStore['record']>(
    (outcome, completedAt) =>
      Promise.resolve({
        outcome: { ...outcome, completedAt },
        replayed: false,
      }),
  );
  const outcomes = {
    findByAttemptId: jest.fn().mockResolvedValue(existing),
    record: recordOutcome,
  } as unknown as jest.Mocked<RealExecutionSubmissionOutcomeStore>;
  return {
    attempts,
    runner,
    outcomes,
    claimAttempt,
    runnerRun,
    recordOutcome,
    service: new RealExecutionSubmissionService(
      attempts,
      runner,
      outcomes,
      () => NOW,
    ),
  };
}

function request() {
  return { attemptId: ATTEMPT_ID, gateId: GATE_ID };
}

function storedOutcome() {
  return {
    attemptId: ATTEMPT_ID,
    gateId: GATE_ID,
    status: 'submission_outcome_unknown' as const,
    providerOrderId: null,
    responseFingerprint: 'd'.repeat(64),
    blockers: ['invalid_response_envelope' as const],
    executionSucceeded: false as const,
    reconciliationRequired: true as const,
    automaticRetryAllowed: false as const,
    completedAt: NOW,
  };
}
