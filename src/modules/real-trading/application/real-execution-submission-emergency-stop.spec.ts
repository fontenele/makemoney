import { RealExecutionEmergencyStopSnapshot } from './real-execution-emergency-stop-assessment';
import { StoredRealExecutionFinalConfirmation } from './real-execution-final-confirmation-store';
import {
  assessRealExecutionSubmissionEmergencyStop,
  RealExecutionSubmissionEmergencyStopPolicy,
} from './real-execution-submission-emergency-stop';

const NOW = new Date('2026-10-02T15:00:06.000Z');
const POLICY: RealExecutionSubmissionEmergencyStopPolicy = {
  snapshotMaxAgeMs: 5_000,
};

describe('assessRealExecutionSubmissionEmergencyStop', () => {
  it('accepts a fresh unchanged persisted inactive stop observation', () => {
    expect(
      assessRealExecutionSubmissionEmergencyStop(
        confirmation(),
        snapshot(),
        POLICY,
        NOW,
      ),
    ).toMatchObject({
      scope: 'real_execution_submission_emergency_stop',
      status: 'emergency_stop_clear_for_submission_review',
      blockers: [],
      confirmationId: '88888888-8888-4888-8888-888888888888',
      emergencyStopChangeId: 'real-trading-stop-clear-1',
      riskApproved: true,
      confirmationRecorded: true,
      emergencyStopRecheckedForSubmission: true,
      atomicEnforcement: false,
      submissionAuthorized: false,
    });
  });

  it('fails closed on malformed confirmation facts', () => {
    expect(
      assessRealExecutionSubmissionEmergencyStop(
        confirmation({ confirmationRecorded: false as true }),
        snapshot(),
        POLICY,
        NOW,
      ),
    ).toMatchObject({
      status: 'blocked',
      blockers: ['invalid_final_confirmation'],
      confirmationId: null,
      submissionAuthorized: false,
    });
    expect(
      assessRealExecutionSubmissionEmergencyStop(
        confirmation({ payloadCommitmentDigest: 'invalid' }),
        snapshot(),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('invalid_final_confirmation');
  });

  it('blocks future and expired confirmations', () => {
    expect(
      assessRealExecutionSubmissionEmergencyStop(
        confirmation({ createdAt: new Date('2026-10-02T15:00:06.001Z') }),
        snapshot(),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('confirmation_from_future');
    expect(
      assessRealExecutionSubmissionEmergencyStop(
        confirmation({ expiresAt: NOW }),
        snapshot(),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('confirmation_expired');
  });

  it('rejects malformed, future, and stale stop snapshots', () => {
    expect(
      assessRealExecutionSubmissionEmergencyStop(
        confirmation(),
        snapshot({ observedAt: new Date(Number.NaN) }),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('invalid_emergency_stop_snapshot');
    expect(
      assessRealExecutionSubmissionEmergencyStop(
        confirmation(),
        snapshot({ observedAt: new Date('2026-10-02T15:00:06.001Z') }),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('emergency_stop_snapshot_from_future');
    expect(
      assessRealExecutionSubmissionEmergencyStop(
        confirmation(),
        snapshot({ observedAt: new Date('2026-10-02T15:00:00.999Z') }),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('emergency_stop_snapshot_stale');
  });

  it('requires complete persisted inactive state', () => {
    expect(
      assessRealExecutionSubmissionEmergencyStop(
        confirmation(),
        snapshot({ coverage: 'partial' }),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('emergency_stop_coverage_incomplete');
    expect(
      assessRealExecutionSubmissionEmergencyStop(
        confirmation(),
        snapshot({
          source: 'configuration',
          changeId: null,
          changedAt: null,
        }),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('emergency_stop_not_persisted');
    expect(
      assessRealExecutionSubmissionEmergencyStop(
        confirmation(),
        snapshot({ active: true }),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('emergency_stop_active');
  });

  it('requires an observation made after durable confirmation', () => {
    expect(
      assessRealExecutionSubmissionEmergencyStop(
        confirmation(),
        snapshot({ observedAt: new Date('2026-10-02T15:00:05.100Z') }),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('emergency_stop_observed_before_confirmation');
  });

  it('rejects any stop change after the approved change', () => {
    const assessment = assessRealExecutionSubmissionEmergencyStop(
      confirmation(),
      snapshot({
        changeId: 'later-stop-clear',
        changedAt: new Date('2026-10-02T15:00:05.200Z'),
      }),
      POLICY,
      NOW,
    );

    expect(assessment.blockers).toEqual(
      expect.arrayContaining([
        'emergency_stop_change_mismatch',
        'emergency_stop_changed_after_confirmation',
      ]),
    );
    expect(assessment.submissionAuthorized).toBe(false);
  });

  it('rejects stop changes reported after their observation', () => {
    expect(
      assessRealExecutionSubmissionEmergencyStop(
        confirmation(),
        snapshot({ changedAt: new Date('2026-10-02T15:00:05.600Z') }),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('emergency_stop_change_from_future');
  });

  it('fails closed on invalid evaluation time and policy bounds', () => {
    expect(
      assessRealExecutionSubmissionEmergencyStop(
        confirmation(),
        snapshot(),
        POLICY,
        new Date(Number.NaN),
      ).blockers,
    ).toContain('invalid_evaluation_time');
    expect(() =>
      assessRealExecutionSubmissionEmergencyStop(
        confirmation(),
        snapshot(),
        { snapshotMaxAgeMs: 60_001 },
        NOW,
      ),
    ).toThrow(RangeError);
  });
});

function confirmation(
  overrides: Partial<StoredRealExecutionFinalConfirmation> = {},
): StoredRealExecutionFinalConfirmation {
  return {
    id: '88888888-8888-4888-8888-888888888888',
    approvalId: '77777777-7777-4777-8777-777777777777',
    reservationId: '33333333-3333-4333-8333-333333333333',
    armId: '55555555-5555-4555-8555-555555555555',
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: '11111111-1111-4111-8111-111111111111',
    quoteId: '22222222-2222-4222-8222-222222222222',
    payloadCommitmentVersion: 'real_execution_intent_quote_v1',
    payloadCommitmentDigest: 'c'.repeat(64),
    emergencyStopChangeId: 'real-trading-stop-clear-1',
    acknowledgment:
      'risk_approval_and_final_quote_reviewed_for_immediate_submission',
    requestedAt: new Date('2026-10-02T15:00:04.000Z'),
    createdAt: new Date('2026-10-02T15:00:05.100Z'),
    expiresAt: new Date('2026-10-02T15:00:09.000Z'),
    riskApproved: true,
    confirmationRecorded: true,
    emergencyStopRecheckedForSubmission: false,
    submissionAuthorized: false,
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
    changedAt: new Date('2026-10-02T14:59:00.000Z'),
    coverage: 'complete',
    observedAt: new Date('2026-10-02T15:00:05.500Z'),
    ...overrides,
  };
}
