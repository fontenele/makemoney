import { StoredRealExecutionFinalConfirmation } from './real-execution-final-confirmation-store';
import { RealExecutionSubmissionEmergencyStopAssessment } from './real-execution-submission-emergency-stop';
import {
  planRealExecutionSubmission,
  RealExecutionSubmissionPlanPolicy,
  RealExecutionSubmissionPlanRequest,
} from './real-execution-submission-plan';

const NOW = new Date('2026-10-02T15:00:07.000Z');
const POLICY: RealExecutionSubmissionPlanPolicy = {
  requestMaxAgeMs: 2_000,
  stopAssessmentMaxAgeMs: 2_000,
  maximumPlanLifetimeMs: 4_000,
};

describe('planRealExecutionSubmission', () => {
  it('creates an inert initial-submission plan for the exact fresh chain', () => {
    expect(
      planRealExecutionSubmission(
        confirmation(),
        stopAssessment(),
        request(),
        POLICY,
        NOW,
      ),
    ).toMatchObject({
      scope: 'real_execution_submission_plan',
      status: 'submission_plan_ready_for_atomic_gate',
      blockers: [],
      plan: {
        id: '99999999-9999-4999-8999-999999999999',
        confirmationId: '88888888-8888-4888-8888-888888888888',
        initialSubmissionOnly: true,
        automaticRetryAllowed: false,
      },
      riskApproved: true,
      confirmationRecorded: true,
      emergencyStopRecheckedForSubmission: true,
      atomicStopEnforcementRequired: true,
      confirmationConsumptionRequired: true,
      submissionAuthorized: false,
    });
  });

  it('fails closed on malformed confirmation, stop assessment, and request', () => {
    expect(
      planRealExecutionSubmission(
        confirmation({ confirmationRecorded: false as true }),
        stopAssessment({ atomicEnforcement: true as false }),
        request({ id: 'invalid' }),
        POLICY,
        NOW,
      ).blockers,
    ).toEqual(
      expect.arrayContaining([
        'invalid_final_confirmation',
        'invalid_emergency_stop_assessment',
        'invalid_submission_request',
      ]),
    );
  });

  it('requires the exact confirmation and complete upstream identities', () => {
    const result = planRealExecutionSubmission(
      confirmation(),
      stopAssessment({
        confirmationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      }),
      request({
        confirmationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        approvalId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        reservationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        armId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        providerId: 'other_provider',
        chainId: '1',
        intentId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        quoteId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        emergencyStopChangeId: 'other-change',
      }),
      POLICY,
      NOW,
    );

    expect(result.blockers).toEqual(
      expect.arrayContaining([
        'submission_confirmation_mismatch',
        'submission_approval_mismatch',
        'submission_reservation_mismatch',
        'submission_arm_mismatch',
        'submission_provider_mismatch',
        'submission_chain_mismatch',
        'submission_intent_mismatch',
        'submission_quote_mismatch',
        'submission_emergency_stop_change_mismatch',
      ]),
    );
    expect(result.plan).toBeNull();
  });

  it('rejects expired or future confirmations', () => {
    expect(
      planRealExecutionSubmission(
        confirmation({ expiresAt: NOW }),
        stopAssessment(),
        request(),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('confirmation_expired');
    expect(
      planRealExecutionSubmission(
        confirmation({ createdAt: new Date('2026-10-02T15:00:07.001Z') }),
        stopAssessment(),
        request(),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('confirmation_from_future');
  });

  it('requires a fresh stop assessment that follows confirmation', () => {
    expect(
      planRealExecutionSubmission(
        confirmation(),
        stopAssessment({ evaluatedAt: new Date('2026-10-02T15:00:04.999Z') }),
        request(),
        POLICY,
        NOW,
      ).blockers,
    ).toEqual(
      expect.arrayContaining([
        'emergency_stop_assessment_stale',
        'emergency_stop_assessment_predates_confirmation',
      ]),
    );
    expect(
      planRealExecutionSubmission(
        confirmation(),
        stopAssessment({ evaluatedAt: new Date('2026-10-02T15:00:07.001Z') }),
        request(),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('emergency_stop_assessment_from_future');
  });

  it('requires a fresh request made after the stop assessment', () => {
    expect(
      planRealExecutionSubmission(
        confirmation(),
        stopAssessment(),
        request({ requestedAt: new Date('2026-10-02T15:00:05.400Z') }),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('submission_request_predates_stop_assessment');
    expect(
      planRealExecutionSubmission(
        confirmation(),
        stopAssessment(),
        request({ requestedAt: new Date('2026-10-02T15:00:04.999Z') }),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('submission_request_stale');
    expect(
      planRealExecutionSubmission(
        confirmation(),
        stopAssessment(),
        request({ requestedAt: new Date('2026-10-02T15:00:07.001Z') }),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('submission_request_from_future');
  });

  it('bounds plan expiry by evaluation, confirmation, and lifetime', () => {
    expect(
      planRealExecutionSubmission(
        confirmation(),
        stopAssessment(),
        request({ expiresAt: NOW }),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('submission_plan_expired');
    expect(
      planRealExecutionSubmission(
        confirmation(),
        stopAssessment(),
        request({ expiresAt: new Date('2026-10-02T15:00:09.001Z') }),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('submission_plan_outlives_confirmation');
    expect(
      planRealExecutionSubmission(
        confirmation({ expiresAt: new Date('2026-10-02T15:00:20.000Z') }),
        stopAssessment(),
        request({ expiresAt: new Date('2026-10-02T15:00:10.001Z') }),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('submission_plan_lifetime_exceeded');
  });

  it('clones request dates into the plan', () => {
    const source = request();
    const result = planRealExecutionSubmission(
      confirmation(),
      stopAssessment(),
      source,
      POLICY,
      NOW,
    );

    expect(result.plan?.requestedAt).not.toBe(source.requestedAt);
    expect(result.plan?.expiresAt).not.toBe(source.expiresAt);
  });

  it('rejects invalid evaluation time and policy bounds', () => {
    expect(
      planRealExecutionSubmission(
        confirmation(),
        stopAssessment(),
        request(),
        POLICY,
        new Date(Number.NaN),
      ).blockers,
    ).toContain('invalid_evaluation_time');
    expect(() =>
      planRealExecutionSubmission(
        confirmation(),
        stopAssessment(),
        request(),
        { ...POLICY, maximumPlanLifetimeMs: 60_001 },
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

function stopAssessment(
  overrides: Partial<RealExecutionSubmissionEmergencyStopAssessment> = {},
): RealExecutionSubmissionEmergencyStopAssessment {
  return {
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
    evaluatedAt: new Date('2026-10-02T15:00:05.500Z'),
    ...overrides,
  };
}

function request(
  overrides: Partial<RealExecutionSubmissionPlanRequest> = {},
): RealExecutionSubmissionPlanRequest {
  return {
    id: '99999999-9999-4999-8999-999999999999',
    confirmationId: '88888888-8888-4888-8888-888888888888',
    approvalId: '77777777-7777-4777-8777-777777777777',
    reservationId: '33333333-3333-4333-8333-333333333333',
    armId: '55555555-5555-4555-8555-555555555555',
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: '11111111-1111-4111-8111-111111111111',
    quoteId: '22222222-2222-4222-8222-222222222222',
    emergencyStopChangeId: 'real-trading-stop-clear-1',
    requestedAt: new Date('2026-10-02T15:00:06.000Z'),
    expiresAt: new Date('2026-10-02T15:00:08.000Z'),
    ...overrides,
  };
}
