import { jest } from '@jest/globals';

import { AgenticWalletAccountingLedgerReconciliationAssessment } from './agentic-wallet-accounting-ledger-reconciliation';
import { AgenticWalletAccountingLedgerReconciliationAttemptRequestError } from './agentic-wallet-accounting-ledger-reconciliation-attempt';
import {
  AgenticWalletAccountingLedgerReconciliationAttemptGuard,
  AgenticWalletAccountingLedgerReconciliationAttemptInProgressError,
  AgenticWalletAccountingLedgerReconciliationAttemptPort,
} from './agentic-wallet-accounting-ledger-reconciliation-attempt.guard';

const INITIALIZATION_ID = '018f1f54-7b8c-7a9d-8e0f-123456789abc';
const OTHER_INITIALIZATION_ID = '018f1f54-7b8c-7a9d-8e0f-123456789abd';

describe('Agentic Wallet accounting ledger reconciliation attempt guard', () => {
  it('delegates one valid attempt with the caller signal', async () => {
    const controller = new AbortController();
    const harness = guardHarness();

    await expect(
      harness.guard.run(INITIALIZATION_ID, 30_000, controller.signal),
    ).resolves.toBe(harness.assessment);
    expect(harness.run).toHaveBeenCalledWith(
      INITIALIZATION_ID,
      30_000,
      controller.signal,
    );
  });

  it('validates requests before consulting or acquiring a claim', async () => {
    const deferred =
      createDeferred<AgenticWalletAccountingLedgerReconciliationAssessment | null>();
    const harness = guardHarness({ result: deferred.promise });
    const active = harness.guard.run(INITIALIZATION_ID, 30_000);

    await expect(harness.guard.run('invalid', 30_000)).rejects.toBeInstanceOf(
      AgenticWalletAccountingLedgerReconciliationAttemptRequestError,
    );
    expect(harness.run).toHaveBeenCalledTimes(1);

    deferred.resolve(harness.assessment);
    await active;
  });

  it('rejects an overlapping attempt for the same initialization immediately', async () => {
    const deferred =
      createDeferred<AgenticWalletAccountingLedgerReconciliationAssessment | null>();
    const harness = guardHarness({ result: deferred.promise });
    const active = harness.guard.run(INITIALIZATION_ID, 30_000);

    await expect(
      harness.guard.run(INITIALIZATION_ID, 30_000),
    ).rejects.toBeInstanceOf(
      AgenticWalletAccountingLedgerReconciliationAttemptInProgressError,
    );
    expect(harness.run).toHaveBeenCalledTimes(1);

    deferred.resolve(harness.assessment);
    await active;
  });

  it('keeps cancellation isolated from a blocked overlapping caller', async () => {
    const deferred =
      createDeferred<AgenticWalletAccountingLedgerReconciliationAssessment | null>();
    const activeController = new AbortController();
    const blockedController = new AbortController();
    const harness = guardHarness({ result: deferred.promise });
    const active = harness.guard.run(
      INITIALIZATION_ID,
      30_000,
      activeController.signal,
    );

    await expect(
      harness.guard.run(INITIALIZATION_ID, 30_000, blockedController.signal),
    ).rejects.toBeInstanceOf(
      AgenticWalletAccountingLedgerReconciliationAttemptInProgressError,
    );
    blockedController.abort();
    expect(activeController.signal.aborted).toBe(false);
    expect(harness.run).toHaveBeenCalledWith(
      INITIALIZATION_ID,
      30_000,
      activeController.signal,
    );

    deferred.resolve(harness.assessment);
    await active;
  });

  it('allows different initialization identities to proceed concurrently', async () => {
    const deferred =
      createDeferred<AgenticWalletAccountingLedgerReconciliationAssessment | null>();
    const harness = guardHarness({ result: deferred.promise });
    const first = harness.guard.run(INITIALIZATION_ID, 30_000);
    const second = harness.guard.run(OTHER_INITIALIZATION_ID, 30_000);

    expect(harness.run).toHaveBeenCalledTimes(2);
    deferred.resolve(harness.assessment);
    await expect(Promise.all([first, second])).resolves.toEqual([
      harness.assessment,
      harness.assessment,
    ]);
  });

  it('releases the claim after successful completion', async () => {
    const harness = guardHarness();

    await harness.guard.run(INITIALIZATION_ID, 30_000);
    await expect(harness.guard.run(INITIALIZATION_ID, 30_000)).resolves.toBe(
      harness.assessment,
    );
    expect(harness.run).toHaveBeenCalledTimes(2);
  });

  it('releases the claim after a delegated failure', async () => {
    const failure = new Error('provider read failed');
    const harness = guardHarness();
    harness.run.mockRejectedValueOnce(failure);

    await expect(harness.guard.run(INITIALIZATION_ID, 30_000)).rejects.toBe(
      failure,
    );
    await expect(harness.guard.run(INITIALIZATION_ID, 30_000)).resolves.toBe(
      harness.assessment,
    );
    expect(harness.run).toHaveBeenCalledTimes(2);
  });
});

function guardHarness(
  overrides: {
    result?: Promise<AgenticWalletAccountingLedgerReconciliationAssessment | null>;
  } = {},
) {
  const assessment = validAssessment();
  const run = jest
    .fn<AgenticWalletAccountingLedgerReconciliationAttemptPort['run']>()
    .mockImplementation(() => overrides.result ?? Promise.resolve(assessment));
  return {
    guard: new AgenticWalletAccountingLedgerReconciliationAttemptGuard({ run }),
    run,
    assessment,
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

function validAssessment(): AgenticWalletAccountingLedgerReconciliationAssessment {
  return {
    scope: 'agentic_wallet_accounting_ledger_reconciliation_assessment',
    status: 'blocked',
    blockers: ['wallet_accounting_balance_mismatch'],
    reconciliation: null,
    ledgerBalancesReconciled: false,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
}
