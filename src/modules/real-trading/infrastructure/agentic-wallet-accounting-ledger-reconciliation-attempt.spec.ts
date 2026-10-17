import { jest } from '@jest/globals';

import {
  AgenticWalletAccountingLedgerReconciliationAttempt,
  AgenticWalletAccountingLedgerReconciliationAttemptCancelledError,
  AgenticWalletAccountingLedgerReconciliationAttemptClockError,
  AgenticWalletAccountingLedgerReconciliationAttemptRequestError,
  AgenticWalletAccountingLedgerReconciliationPort,
  AgenticWalletCapabilityObservationLoader,
} from './agentic-wallet-accounting-ledger-reconciliation-attempt';
import { AgenticWalletAccountingLedgerReconciliationAssessment } from './agentic-wallet-accounting-ledger-reconciliation';
import { AgenticWalletCapabilityObservation } from './agentic-wallet-capability.adapter';

const INITIALIZATION_ID = '018f1f54-7b8c-7a9d-8e0f-123456789abc';
const OBSERVED_AT = new Date('2026-10-17T12:00:00.000Z');
const EVALUATED_AT = new Date('2026-10-17T12:00:01.000Z');

describe('Agentic Wallet accounting ledger reconciliation attempt', () => {
  it('performs one bounded read and one durable reconciliation', async () => {
    const harness = attemptHarness();

    await expect(harness.attempt.run(INITIALIZATION_ID, 30_000)).resolves.toBe(
      harness.assessment,
    );
    expect(harness.load).toHaveBeenCalledWith('56', OBSERVED_AT, undefined);
    expect(harness.load.mock.calls[0][1]).not.toBe(OBSERVED_AT);
    expect(harness.reconcile).toHaveBeenCalledWith(
      INITIALIZATION_ID,
      harness.observation,
      { maximumObservationAgeMs: 30_000, evaluatedAt: EVALUATED_AT },
    );
    expect(harness.reconcile.mock.calls[0][2].evaluatedAt).not.toBe(
      EVALUATED_AT,
    );
  });

  it.each([
    ['invalid identity', 'invalid', 30_000],
    ['zero maximum age', INITIALIZATION_ID, 0],
    ['excessive maximum age', INITIALIZATION_ID, 60_001],
  ] as const)('rejects %s before provider access', async (_name, id, age) => {
    const harness = attemptHarness();
    await expect(harness.attempt.run(id, age)).rejects.toBeInstanceOf(
      AgenticWalletAccountingLedgerReconciliationAttemptRequestError,
    );
    expect(harness.load).not.toHaveBeenCalled();
    expect(harness.reconcile).not.toHaveBeenCalled();
  });

  it('rejects pre-cancellation before provider access', async () => {
    const harness = attemptHarness();
    const controller = new AbortController();
    controller.abort();
    await expect(
      harness.attempt.run(INITIALIZATION_ID, 30_000, controller.signal),
    ).rejects.toBeInstanceOf(
      AgenticWalletAccountingLedgerReconciliationAttemptCancelledError,
    );
    expect(harness.load).not.toHaveBeenCalled();
  });

  it('stops after provider access when cancellation arrives in flight', async () => {
    const controller = new AbortController();
    const harness = attemptHarness({
      load: () => {
        controller.abort();
        return Promise.resolve(validObservation());
      },
    });
    await expect(
      harness.attempt.run(INITIALIZATION_ID, 30_000, controller.signal),
    ).rejects.toBeInstanceOf(
      AgenticWalletAccountingLedgerReconciliationAttemptCancelledError,
    );
    expect(harness.reconcile).not.toHaveBeenCalled();
  });

  it.each([
    ['invalid initial clock', [new Date('invalid')]],
    ['invalid completion clock', [OBSERVED_AT, new Date('invalid')]],
    [
      'regressed completion clock',
      [OBSERVED_AT, new Date('2026-10-17T11:59:59.999Z')],
    ],
  ] as const)('rejects an %s', async (_name, dates) => {
    const harness = attemptHarness({ dates: [...dates] });
    await expect(
      harness.attempt.run(INITIALIZATION_ID, 30_000),
    ).rejects.toBeInstanceOf(
      AgenticWalletAccountingLedgerReconciliationAttemptClockError,
    );
    expect(harness.reconcile).not.toHaveBeenCalled();
    if (dates.length === 1) expect(harness.load).not.toHaveBeenCalled();
  });

  it('propagates provider failure without durable access or retry', async () => {
    const failure = new Error('provider read failed');
    const harness = attemptHarness({
      load: async () => Promise.reject(failure),
    });
    await expect(harness.attempt.run(INITIALIZATION_ID, 30_000)).rejects.toBe(
      failure,
    );
    expect(harness.load).toHaveBeenCalledTimes(1);
    expect(harness.reconcile).not.toHaveBeenCalled();
  });

  it('preserves explicit durable absence', async () => {
    const harness = attemptHarness({ result: null });
    await expect(
      harness.attempt.run(INITIALIZATION_ID, 30_000),
    ).resolves.toBeNull();
    expect(harness.load).toHaveBeenCalledTimes(1);
    expect(harness.reconcile).toHaveBeenCalledTimes(1);
  });
});

function attemptHarness(
  overrides: {
    dates?: Date[];
    load?: AgenticWalletCapabilityObservationLoader['load'];
    result?: AgenticWalletAccountingLedgerReconciliationAssessment | null;
  } = {},
) {
  const dates = overrides.dates ?? [OBSERVED_AT, EVALUATED_AT];
  const now = jest.fn(() => new Date(dates.shift() ?? EVALUATED_AT));
  const observation = validObservation();
  const load = jest
    .fn<AgenticWalletCapabilityObservationLoader['load']>()
    .mockImplementation(overrides.load ?? (() => Promise.resolve(observation)));
  const assessment = validAssessment();
  const reconcile = jest
    .fn<AgenticWalletAccountingLedgerReconciliationPort['reconcile']>()
    .mockResolvedValue(
      overrides.result === undefined ? assessment : overrides.result,
    );
  return {
    attempt: new AgenticWalletAccountingLedgerReconciliationAttempt(
      { load },
      { reconcile },
      now,
    ),
    load,
    reconcile,
    observation,
    assessment,
  };
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

function validObservation(): AgenticWalletCapabilityObservation {
  return {
    cliVersion: '1.10.0',
    requiredCliVersion: '1.10.0',
    capabilities: {
      providerId: 'agentic_wallet',
      connected: true,
      chains: [{ chainId: '56', operations: [] }],
      reads: {
        securitySettings: true,
        quota: true,
        balances: true,
        gas: true,
      },
      observedAt: OBSERVED_AT,
    },
    settings: null,
    quota: null,
    addresses: [],
    balances: [],
    gas: null,
  };
}
