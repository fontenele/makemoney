import { StoredRealExecutionArm } from './real-execution-arm-store';
import {
  assessRealExecutionEmergencyStop,
  RealExecutionEmergencyStopFreshnessPolicy,
  RealExecutionEmergencyStopSnapshot,
} from './real-execution-emergency-stop-assessment';

const NOW = new Date('2026-10-01T14:00:05.000Z');
const POLICY: RealExecutionEmergencyStopFreshnessPolicy = {
  snapshotMaxAgeMs: 2_000,
};

describe('assessRealExecutionEmergencyStop', () => {
  it('recognizes a fresh persisted inactive stop observed after the arm', () => {
    expect(
      assessRealExecutionEmergencyStop(arm(), snapshot(), POLICY, NOW),
    ).toEqual({
      scope: 'real_execution_emergency_stop',
      status: 'emergency_stop_clear_for_arm',
      blockers: [],
      armId: '55555555-5555-4555-8555-555555555555',
      emergencyStopChangeId: 'real-trading-stop-clear-1',
      emergencyStopChecked: true,
      atomicEnforcement: false,
      riskApproved: false,
      confirmationRecorded: false,
      submissionAuthorized: false,
      evaluatedAt: NOW,
    });
  });

  it('blocks an active emergency stop', () => {
    expect(
      assessRealExecutionEmergencyStop(
        arm(),
        snapshot({ active: true }),
        POLICY,
        NOW,
      ),
    ).toMatchObject({
      status: 'blocked',
      blockers: ['emergency_stop_active'],
      submissionAuthorized: false,
    });
  });

  it('requires a persisted durable stop state', () => {
    expect(
      assessRealExecutionEmergencyStop(
        arm(),
        snapshot({ source: 'configuration', changeId: null, changedAt: null }),
        POLICY,
        NOW,
      ),
    ).toMatchObject({
      status: 'blocked',
      blockers: ['emergency_stop_not_persisted'],
      emergencyStopChangeId: null,
    });
  });

  it('fails closed on partial, future, and stale observations', () => {
    expect(
      assessRealExecutionEmergencyStop(
        arm(),
        snapshot({
          coverage: 'partial',
          observedAt: new Date('2026-10-01T14:00:06.000Z'),
        }),
        POLICY,
        NOW,
      ).blockers,
    ).toEqual(
      expect.arrayContaining([
        'emergency_stop_snapshot_from_future',
        'emergency_stop_coverage_incomplete',
      ]),
    );
    expect(
      assessRealExecutionEmergencyStop(
        arm(),
        snapshot({ observedAt: new Date('2026-10-01T14:00:02.999Z') }),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('emergency_stop_snapshot_stale');
  });

  it('requires the stop to be observed after the durable arm', () => {
    expect(
      assessRealExecutionEmergencyStop(
        arm(),
        snapshot({ observedAt: new Date('2026-10-01T14:00:04.000Z') }),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('emergency_stop_observed_before_arm');
  });

  it('invalidates the arm after any later persisted stop change', () => {
    expect(
      assessRealExecutionEmergencyStop(
        arm(),
        snapshot({ changedAt: new Date('2026-10-01T14:00:04.000Z') }),
        POLICY,
        NOW,
      ),
    ).toMatchObject({
      status: 'blocked',
      blockers: ['emergency_stop_changed_after_arm'],
    });
  });

  it('rejects stop changes dated after their observation', () => {
    expect(
      assessRealExecutionEmergencyStop(
        arm(),
        snapshot({ changedAt: new Date('2026-10-01T14:00:05.001Z') }),
        POLICY,
        NOW,
      ).blockers,
    ).toEqual(
      expect.arrayContaining([
        'emergency_stop_change_from_future',
        'emergency_stop_changed_after_arm',
      ]),
    );
  });

  it('blocks expired, future, and malformed arms', () => {
    expect(
      assessRealExecutionEmergencyStop(
        arm({ expiresAt: NOW }),
        snapshot(),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('arm_expired');
    expect(
      assessRealExecutionEmergencyStop(
        arm({ createdAt: new Date('2026-10-01T14:00:06.000Z') }),
        snapshot(),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('arm_from_future');
    expect(
      assessRealExecutionEmergencyStop(
        arm({ providerId: 'other_provider' }),
        snapshot(),
        POLICY,
        NOW,
      ),
    ).toMatchObject({
      status: 'blocked',
      blockers: ['invalid_arm'],
      armId: null,
    });
    expect(
      assessRealExecutionEmergencyStop(
        arm({ payloadCommitmentDigest: 'invalid' }),
        snapshot(),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('invalid_arm');
  });

  it('fails closed on malformed stop facts and evaluation time', () => {
    expect(
      assessRealExecutionEmergencyStop(
        arm(),
        snapshot({ changeId: 'contains spaces' }),
        POLICY,
        NOW,
      ),
    ).toMatchObject({
      status: 'blocked',
      blockers: ['invalid_emergency_stop_snapshot'],
      emergencyStopChecked: false,
    });
    expect(
      assessRealExecutionEmergencyStop(
        arm(),
        snapshot(),
        POLICY,
        new Date(Number.NaN),
      ).blockers,
    ).toEqual(['invalid_evaluation_time']);
  });

  it('validates the explicit snapshot freshness bound', () => {
    expect(() =>
      assessRealExecutionEmergencyStop(
        arm(),
        snapshot(),
        { snapshotMaxAgeMs: 60_001 },
        NOW,
      ),
    ).toThrow(RangeError);
  });
});

function arm(
  overrides: Partial<StoredRealExecutionArm> = {},
): StoredRealExecutionArm {
  return {
    id: '55555555-5555-4555-8555-555555555555',
    reservationId: '33333333-3333-4333-8333-333333333333',
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: '11111111-1111-4111-8111-111111111111',
    quoteId: '22222222-2222-4222-8222-222222222222',
    payloadCommitmentVersion: 'real_execution_intent_quote_v1',
    payloadCommitmentDigest: 'a'.repeat(64),
    acknowledgment: 'reservation_and_quote_reviewed',
    requestedAt: new Date('2026-10-01T14:00:03.000Z'),
    createdAt: new Date('2026-10-01T14:00:04.000Z'),
    expiresAt: new Date('2026-10-01T14:00:08.000Z'),
    ...overrides,
  };
}

function snapshot(
  overrides: Partial<RealExecutionEmergencyStopSnapshot> = {},
): RealExecutionEmergencyStopSnapshot {
  return {
    active: false,
    source: 'persisted',
    changeId: 'real-trading-stop-clear-1',
    changedAt: new Date('2026-10-01T13:59:00.000Z'),
    coverage: 'complete',
    observedAt: new Date('2026-10-01T14:00:05.000Z'),
    ...overrides,
  };
}
