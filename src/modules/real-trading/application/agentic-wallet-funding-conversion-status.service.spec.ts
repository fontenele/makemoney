import { jest } from '@jest/globals';

import { FundingConversionStatusContextIdentityError } from './agentic-wallet-funding-conversion-status-context.store';
import { FundingConversionStatusObservationBlockedError } from './agentic-wallet-funding-conversion-status-observation.store';
import {
  AgenticWalletFundingConversionStatusService,
  FundingConversionStatusDependencyUnavailableError,
} from './agentic-wallet-funding-conversion-status.service';
import {
  BSC_NATIVE_BNB_ADDRESS,
  BSC_USDT_ADDRESS,
} from '../infrastructure/agentic-wallet-funding-conversion-quote.adapter';

const ATTEMPT_ID = '019a0db1-bfea-7000-8000-000000000002';
const OBSERVATION_ID = '019a0db1-bfea-7000-8000-000000000003';
const RECORDED_AT = new Date('2026-10-22T12:00:32.000Z');

describe('AgenticWalletFundingConversionStatusService', () => {
  it('loads, looks up, assesses, and records one pending observation', async () => {
    const harness = createHarness();

    await expect(
      harness.service.reconcileOnce(ATTEMPT_ID),
    ).resolves.toMatchObject({
      status: 'status_observation_recorded',
      blockers: [],
      observationReplayed: false,
      providerCallStarted: true,
      providerCallCompleted: true,
      statusLookupRequired: true,
      financialReconciliationComplete: false,
      automaticRetryAllowed: false,
    });
    expect(harness.run).toHaveBeenCalledWith(
      { kind: 'market_order_status_lookup', providerOrderId: 'order_123' },
      undefined,
    );
    expect(harness.record).toHaveBeenCalledWith(
      OBSERVATION_ID,
      expect.objectContaining({
        attemptId: ATTEMPT_ID,
        providerStatus: 'PENDING',
      }),
      RECORDED_AT,
    );
  });

  it('records FINISHED without claiming financial reconciliation', async () => {
    const harness = createHarness({
      response: providerResponse({
        status: 'FINISHED',
        txHash: `0x${'a'.repeat(64)}`,
      }),
    });

    await expect(
      harness.service.reconcileOnce(ATTEMPT_ID),
    ).resolves.toMatchObject({
      status: 'status_observation_recorded',
      statusLookupRequired: false,
      storedObservation: {
        observation: {
          providerStatus: 'FINISHED',
          financialReconciliationRequired: true,
          financialReconciliationComplete: false,
        },
      },
    });
  });

  it('withholds invalid provider responses from persistence', async () => {
    const harness = createHarness({
      response: providerResponse({ fromTokenQty: '0.007' }),
    });

    await expect(
      harness.service.reconcileOnce(ATTEMPT_ID),
    ).resolves.toMatchObject({
      status: 'status_response_invalid',
      blockers: ['order_payload_mismatch'],
      providerCallStarted: true,
      providerCallCompleted: true,
    });
    expect(harness.record).not.toHaveBeenCalled();
  });

  it('forwards cancellation and classifies provider failure without retry', async () => {
    const failure = new Error('lookup unavailable');
    const harness = createHarness({ response: Promise.reject(failure) });
    const controller = new AbortController();

    await expect(
      harness.service.reconcileOnce(ATTEMPT_ID, controller.signal),
    ).rejects.toMatchObject({
      stage: 'provider_status',
      message:
        'Funding conversion status dependency unavailable: provider_status',
    });
    expect(harness.run).toHaveBeenCalledTimes(1);
    expect(harness.run).toHaveBeenCalledWith(
      { kind: 'market_order_status_lookup', providerOrderId: 'order_123' },
      controller.signal,
    );
    expect(harness.record).not.toHaveBeenCalled();
  });

  it.each([
    ['status_context', 'context'],
    ['status_observation', 'record'],
  ] as const)(
    'classifies %s dependency failure without repeating work',
    async (stage, dependency) => {
      const harness = createHarness({
        ...(dependency === 'context'
          ? { contextError: new Error('sensitive dependency error') }
          : { recordError: new Error('sensitive dependency error') }),
      });

      await expect(harness.service.reconcileOnce(ATTEMPT_ID)).rejects.toEqual(
        expect.objectContaining<FundingConversionStatusDependencyUnavailableError>(
          { stage },
        ),
      );
      expect(harness.getByAttemptId).toHaveBeenCalledTimes(1);
      expect(harness.run).toHaveBeenCalledTimes(
        stage === 'status_context' ? 0 : 1,
      );
      expect(harness.record).toHaveBeenCalledTimes(
        stage === 'status_observation' ? 1 : 0,
      );
    },
  );

  it('preserves typed observation conflicts for the controller 409 path', async () => {
    const conflict = new FundingConversionStatusObservationBlockedError();
    const harness = createHarness({ recordError: conflict });

    await expect(harness.service.reconcileOnce(ATTEMPT_ID)).rejects.toBe(
      conflict,
    );
    expect(harness.run).toHaveBeenCalledTimes(1);
    expect(harness.record).toHaveBeenCalledTimes(1);
  });

  it('does not call the provider for absent or terminal context', async () => {
    const absent = createHarness({ context: null });
    await expect(
      absent.service.reconcileOnce(ATTEMPT_ID),
    ).resolves.toMatchObject({
      status: 'blocked',
      blockers: ['status_context_not_found'],
    });
    expect(absent.run).not.toHaveBeenCalled();

    const terminal = createHarness({
      context: {
        attemptId: ATTEMPT_ID,
        attemptState: 'provider_failed',
        statusLookupRequired: false,
        statusContext: null,
      },
    });
    await expect(
      terminal.service.reconcileOnce(ATTEMPT_ID),
    ).resolves.toMatchObject({ status: 'status_lookup_not_required' });
    expect(terminal.run).not.toHaveBeenCalled();
  });

  it('blocks overlapping same-attempt calls and releases the claim', async () => {
    const pending = deferred<unknown>();
    const harness = createHarness({ response: pending.promise });

    const first = harness.service.reconcileOnce(ATTEMPT_ID);
    await Promise.resolve();
    await expect(
      harness.service.reconcileOnce(ATTEMPT_ID),
    ).resolves.toMatchObject({
      status: 'blocked',
      blockers: ['status_reconciliation_in_progress'],
      providerCallStarted: false,
    });
    pending.resolve(providerResponse());
    await expect(first).resolves.toMatchObject({
      status: 'status_observation_recorded',
    });
    await expect(
      harness.service.reconcileOnce(ATTEMPT_ID),
    ).resolves.toMatchObject({ status: 'status_observation_recorded' });
    expect(harness.run).toHaveBeenCalledTimes(2);
  });

  it('rejects malformed identity before dependency access', async () => {
    const harness = createHarness();
    await expect(harness.service.reconcileOnce('bad')).rejects.toBeInstanceOf(
      FundingConversionStatusContextIdentityError,
    );
    expect(harness.getByAttemptId).not.toHaveBeenCalled();
  });

  it('fails closed on an invalid recording clock after the read', async () => {
    const harness = createHarness({
      recordedAt: new Date('2026-10-22T12:00:30.000Z'),
    });
    await expect(
      harness.service.reconcileOnce(ATTEMPT_ID),
    ).resolves.toMatchObject({
      status: 'blocked',
      blockers: ['invalid_recording_identity_or_time'],
      providerCallCompleted: true,
    });
    expect(harness.record).not.toHaveBeenCalled();
  });
});

function createHarness(
  options: {
    context?: ReturnType<typeof context> | null;
    response?: unknown;
    contextError?: Error;
    recordError?: Error;
    recordedAt?: Date;
  } = {},
) {
  const loadedContext = Object.prototype.hasOwnProperty.call(options, 'context')
    ? (options.context ?? null)
    : context();
  const getByAttemptId = jest.fn(() =>
    options.contextError
      ? Promise.reject(options.contextError)
      : Promise.resolve(loadedContext),
  );
  const run = jest.fn(() =>
    Promise.resolve(options.response ?? providerResponse()),
  );
  const record = jest.fn((id, observation, recordedAt) => {
    if (options.recordError) return Promise.reject(options.recordError);
    return Promise.resolve({
      stored: { id, observation, recordedAt },
      replayed: false,
    });
  });
  return {
    getByAttemptId,
    run,
    record,
    service: new AgenticWalletFundingConversionStatusService(
      { getByAttemptId },
      { run },
      { record },
      () => new Date(options.recordedAt ?? RECORDED_AT),
      () => OBSERVATION_ID,
    ),
  };
}

function context() {
  return {
    attemptId: ATTEMPT_ID,
    attemptState: 'submitted_pending_confirmation' as const,
    statusLookupRequired: true,
    statusContext: {
      attemptId: ATTEMPT_ID,
      providerOrderId: 'order_123',
      sourceQuantityBnb: '0.008',
      maximumSlippagePercent: '0.5',
    },
  };
}

function providerResponse(changed: Record<string, unknown> = {}) {
  return {
    success: true,
    data: {
      total: 1,
      page: 1,
      pageSize: 10,
      list: [
        {
          orderType: 'market',
          orderId: 'order_123',
          chain: '56',
          fromToken: BSC_NATIVE_BNB_ADDRESS,
          toToken: BSC_USDT_ADDRESS,
          fromTokenName: 'BNB',
          toTokenName: 'USDT',
          fromTokenQty: '0.008',
          slippage: '0.5',
          status: 'PENDING',
          txHash: null,
          bookTime: '2026-10-22T12:00:30.000Z',
          updatedTime: '2026-10-22T12:00:31.000Z',
          ...changed,
        },
      ],
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}
