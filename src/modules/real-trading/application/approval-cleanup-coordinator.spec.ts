import { jest } from '@jest/globals';
import {
  ApprovalCleanupCoordinator,
  CleanupExecutionPort,
  CleanupCoordinatorStore,
  CleanupExecutionPreflight,
  cleanupPreflightIsAdmissible,
} from './approval-cleanup-coordinator';
import { transitionApprovalCleanup } from './approval-cleanup';
import {
  cleanupNow,
  cleanupSubmitted,
} from '../../../../test/fixtures/approval-cleanup';
function harness() {
  let record = {
    ...cleanupSubmitted(),
    state: 'ready' as ReturnType<typeof cleanupSubmitted>['state'],
    transactionHash: null,
  };
  let now = new Date(cleanupNow);
  const preflight: CleanupExecutionPreflight = {
    planFingerprint: record.fingerprint,
    operationOrderId: record.operationOrderId!,
    executionAuthorizationVerified: true,
    riskApproved: true,
    operationTerminalVerified: true,
    allowanceRaw: '1',
    nativeBalanceBnb: '0.01',
    gasEstimateBnb: '0.000002',
    reservedGasBnb: '0.000003',
    gasSafetyMultiplier: '1.5',
    observedAt: new Date(cleanupNow),
  };
  const store = {
    unresolved: jest.fn<CleanupCoordinatorStore['unresolved']>(() =>
      Promise.resolve([structuredClone(record)]),
    ),
    transition: jest.fn<CleanupCoordinatorStore['transition']>(
      (_id, _fp, event) => {
        record = transitionApprovalCleanup(record, event, now);
        return Promise.resolve(structuredClone(record));
      },
    ),
  };
  const port = {
    preflight: jest.fn<CleanupExecutionPort['preflight']>(() =>
      Promise.resolve(preflight),
    ),
    revoke: jest.fn<CleanupExecutionPort['revoke']>(() =>
      Promise.resolve({ providerOrderId: 'revoke456' }),
    ),
  };
  const controls = {
    cleanupEnabled: jest.fn(() => true),
    operatorSubmissionEnabled: jest.fn(() => true),
    emergencyStopActive: jest.fn(() => false),
  };
  const coordinator = new ApprovalCleanupCoordinator(
    store,
    port,
    controls,
    () => now,
  );
  return {
    store,
    port,
    controls,
    coordinator,
    preflight,
    record: () => record,
    setNow: (date: Date) => {
      now = date;
    },
    run: () =>
      coordinator.run(
        record.plan.walletHash,
        record.plan.id,
        record.fingerprint,
      ),
  };
}
describe('One-attempt cleanup coordinator', () => {
  it('claims durably before one mutation and persists provider acceptance', async () => {
    const t = harness();
    t.port.revoke.mockImplementation((r) => {
      expect(t.record().state).toBe('claimed');
      expect(r.state).toBe('claimed');
      return Promise.resolve({ providerOrderId: 'revoke456' });
    });
    await expect(t.run()).resolves.toMatchObject({
      status: 'accepted_pending_confirmation',
      providerMutationAttempted: true,
      executionSucceeded: false,
      automaticRetryAllowed: false,
    });
    expect(t.record()).toMatchObject({
      state: 'accepted',
      revocationOrderId: 'revoke456',
    });
    await t.run();
    expect(t.port.revoke).toHaveBeenCalledTimes(1);
  });
  it.each([
    'cleanupEnabled',
    'operatorSubmissionEnabled',
    'emergencyStopActive',
  ] as const)('requires independent %s control', async (key) => {
    const t = harness();
    t.controls[key].mockReturnValue(key === 'emergencyStopActive');
    await expect(t.run()).resolves.toMatchObject({
      status: 'blocked',
      providerMutationAttempted: false,
    });
    expect(t.port.preflight).not.toHaveBeenCalled();
    expect(t.store.transition).not.toHaveBeenCalled();
  });
  it.each([
    'executionAuthorizationVerified',
    'riskApproved',
    'operationTerminalVerified',
  ] as const)('requires independent %s evidence', async (key) => {
    const t = harness();
    t.preflight[key] = false;
    await t.run();
    expect(t.port.revoke).not.toHaveBeenCalled();
    expect(t.store.transition).not.toHaveBeenCalled();
  });
  it.each([
    'stale',
    'future',
    'fingerprint',
    'order',
    'zeroAllowance',
    'hugeAllowance',
    'zeroGas',
    'margin',
    'funds',
    'reserve',
    'decimal',
  ])('blocks invalid %s before claim', async (fault) => {
    const t = harness(),
      p = t.preflight;
    if (fault === 'stale') p.observedAt = new Date(cleanupNow.getTime() - 5001);
    if (fault === 'future') p.observedAt = new Date(cleanupNow.getTime() + 1);
    if (fault === 'fingerprint') p.planFingerprint = 'f'.repeat(64);
    if (fault === 'order') p.operationOrderId = 'different';
    if (fault === 'zeroAllowance') p.allowanceRaw = '0';
    if (fault === 'hugeAllowance') p.allowanceRaw = (1n << 256n).toString();
    if (fault === 'zeroGas') p.gasEstimateBnb = '0';
    if (fault === 'margin') p.gasSafetyMultiplier = '1';
    if (fault === 'funds') p.nativeBalanceBnb = '0.000002';
    if (fault === 'reserve') p.reservedGasBnb = '0.0000029';
    if (fault === 'decimal') p.gasEstimateBnb = '2e-6';
    await expect(t.run()).resolves.toMatchObject({ status: 'blocked' });
    expect(t.store.transition).not.toHaveBeenCalled();
    expect(t.port.revoke).not.toHaveBeenCalled();
  });
  it('rounds a fractional wei reserve upward', () => {
    const t = harness();
    t.preflight.gasEstimateBnb = '0.000000000000000001';
    t.preflight.gasSafetyMultiplier = '1.1';
    t.preflight.reservedGasBnb = '0.000000000000000001';
    expect(
      cleanupPreflightIsAdmissible(t.record(), t.preflight, cleanupNow),
    ).toBe(false);
    t.preflight.reservedGasBnb = '0.000000000000000002';
    expect(
      cleanupPreflightIsAdmissible(t.record(), t.preflight, cleanupNow),
    ).toBe(true);
  });
  it.each(['stop', 'stale'])(
    'rechecks %s after durable claim and never retries the consumed claim',
    async (fault) => {
      const t = harness();
      const transition = t.store.transition.getMockImplementation()!;
      t.store.transition.mockImplementation((id, fp, event) => {
        const result = transition(id, fp, event);
        if (event.type === 'claim') {
          if (fault === 'stop')
            t.controls.emergencyStopActive.mockReturnValue(true);
          else t.setNow(new Date(cleanupNow.getTime() + 5001));
        }
        return result;
      });
      await expect(t.run()).resolves.toMatchObject({
        status: 'claimed_blocked',
        providerMutationAttempted: false,
      });
      expect(t.record().state).toBe('claimed');
      expect(t.port.revoke).not.toHaveBeenCalled();
    },
  );
  it.each(['timeout', 'missing', 'invalid', 'parentOrder'])(
    'consumes ambiguous %s without retry',
    async (fault) => {
      const t = harness();
      if (fault === 'timeout')
        t.port.revoke.mockRejectedValue(new Error('raw secret dependency'));
      if (fault === 'missing') t.port.revoke.mockResolvedValue(null);
      if (fault === 'invalid')
        t.port.revoke.mockResolvedValue({ providerOrderId: 'invalid id' });
      if (fault === 'parentOrder')
        t.port.revoke.mockResolvedValue({
          providerOrderId: t.preflight.operationOrderId,
        });
      const result = await t.run();
      expect(result.status).toBe('outcome_unknown');
      expect(JSON.stringify(result)).not.toContain('secret');
      expect(t.record().state).toBe('unknown');
      await t.run();
      expect(t.port.revoke).toHaveBeenCalledTimes(1);
    },
  );
  it('does not mutate the provider if claim persistence fails', async () => {
    const t = harness();
    t.store.transition.mockRejectedValue(new Error('DB unavailable'));
    await expect(t.run()).resolves.toMatchObject({
      status: 'persistence_unavailable',
      providerMutationAttempted: false,
    });
    expect(t.port.revoke).not.toHaveBeenCalled();
  });
  it('never retries after acceptance is committed but its acknowledgement is lost', async () => {
    const t = harness();
    const transition = t.store.transition.getMockImplementation()!;
    t.store.transition.mockImplementation(async (id, fp, event) => {
      const result = await transition(id, fp, event);
      if (event.type === 'accepted') throw new Error('lost acknowledgement');
      return result;
    });
    await expect(t.run()).resolves.toMatchObject({ status: 'outcome_unknown' });
    expect(t.record().state).toBe('accepted');
    await t.run();
    expect(t.port.revoke).toHaveBeenCalledTimes(1);
  });
});
