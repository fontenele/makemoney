import {
  planRealExecutionFinalConfirmation,
  RealExecutionFinalConfirmationPolicy,
  RealExecutionFinalConfirmationRequest,
} from './real-execution-final-confirmation-plan';
import { StoredRealExecutionRiskApproval } from './real-execution-risk-approval-store';

const NOW = new Date('2026-10-02T15:00:05.000Z');
const POLICY: RealExecutionFinalConfirmationPolicy = {
  requestMaxAgeMs: 5_000,
  maximumConfirmationLifetimeMs: 10_000,
};

describe('planRealExecutionFinalConfirmation', () => {
  it('creates an inert approval-bound plan within the bounded windows', () => {
    const assessment = planRealExecutionFinalConfirmation(
      approval(),
      request(),
      POLICY,
      NOW,
    );

    expect(assessment).toMatchObject({
      scope: 'real_execution_final_confirmation_plan',
      status: 'final_confirmation_plan_ready',
      blockers: [],
      riskApproved: true,
      durableConfirmationRecorded: false,
      emergencyStopRecheckedForSubmission: false,
      submissionAuthorized: false,
    });
    expect(assessment.plan).toEqual(request());
  });

  it.each([
    [
      'approvalId',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'confirmation_approval_mismatch',
    ],
    [
      'reservationId',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'confirmation_reservation_mismatch',
    ],
    [
      'armId',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'confirmation_arm_mismatch',
    ],
    ['providerId', 'other_provider', 'confirmation_provider_mismatch'],
    ['chainId', '1', 'confirmation_chain_mismatch'],
    [
      'intentId',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'confirmation_intent_mismatch',
    ],
    [
      'quoteId',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'confirmation_quote_mismatch',
    ],
    [
      'emergencyStopChangeId',
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'confirmation_emergency_stop_change_mismatch',
    ],
  ] as const)(
    'blocks divergent %s identity',
    (field, value, expectedBlocker) => {
      const assessment = planRealExecutionFinalConfirmation(
        approval(),
        request({ [field]: value }),
        POLICY,
        NOW,
      );

      expect(assessment.status).toBe('blocked');
      expect(assessment.blockers).toContain(expectedBlocker);
      expect(assessment.plan).toBeNull();
      expect(assessment.riskApproved).toBe(false);
    },
  );

  it('requires the exact final confirmation acknowledgment', () => {
    expect(
      planRealExecutionFinalConfirmation(
        approval(),
        request({ acknowledgment: 'missing' as never }),
        POLICY,
        NOW,
      ),
    ).toMatchObject({
      status: 'blocked',
      blockers: ['final_confirmation_acknowledgment_missing'],
      plan: null,
      submissionAuthorized: false,
    });
  });

  it('blocks future, stale, and pre-approval requests', () => {
    expect(
      planRealExecutionFinalConfirmation(
        approval(),
        request({ requestedAt: new Date('2026-10-02T15:00:05.001Z') }),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('confirmation_request_from_future');
    expect(
      planRealExecutionFinalConfirmation(
        approval(),
        request({
          requestedAt: new Date('2026-10-02T14:59:59.999Z'),
          expiresAt: new Date('2026-10-02T15:00:08.000Z'),
        }),
        POLICY,
        NOW,
      ).blockers,
    ).toEqual(
      expect.arrayContaining([
        'confirmation_request_stale',
        'confirmation_predates_approval',
      ]),
    );
  });

  it('blocks a future or expired approval', () => {
    expect(
      planRealExecutionFinalConfirmation(
        approval({ createdAt: new Date('2026-10-02T15:00:06.000Z') }),
        request(),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('approval_from_future');
    expect(
      planRealExecutionFinalConfirmation(
        approval({ expiresAt: NOW }),
        request({ expiresAt: NOW }),
        POLICY,
        NOW,
      ).blockers,
    ).toEqual(
      expect.arrayContaining(['approval_expired', 'confirmation_expired']),
    );
  });

  it('prevents confirmation from outliving approval or policy lifetime', () => {
    const assessment = planRealExecutionFinalConfirmation(
      approval(),
      request({ expiresAt: new Date('2026-10-02T15:00:15.001Z') }),
      POLICY,
      NOW,
    );

    expect(assessment.blockers).toEqual(
      expect.arrayContaining([
        'confirmation_outlives_approval',
        'confirmation_lifetime_exceeded',
      ]),
    );
  });

  it('fails closed on malformed approval facts and policy bounds', () => {
    expect(
      planRealExecutionFinalConfirmation(
        approval({ riskApproved: false as true }),
        request(),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('invalid_risk_approval');
    expect(() =>
      planRealExecutionFinalConfirmation(
        approval(),
        request(),
        { ...POLICY, maximumConfirmationLifetimeMs: 60_001 },
        NOW,
      ),
    ).toThrow(RangeError);
  });

  it('fails closed on malformed request and evaluation clocks', () => {
    const assessment = planRealExecutionFinalConfirmation(
      approval(),
      request({ expiresAt: new Date(Number.NaN) }),
      POLICY,
      new Date(Number.NaN),
    );

    expect(assessment).toMatchObject({
      status: 'blocked',
      plan: null,
    });
    expect(assessment.blockers).toEqual(
      expect.arrayContaining([
        'invalid_confirmation_request',
        'invalid_evaluation_time',
      ]),
    );
  });
});

function approval(
  overrides: Partial<StoredRealExecutionRiskApproval> = {},
): StoredRealExecutionRiskApproval {
  return {
    id: '77777777-7777-4777-8777-777777777777',
    reservationId: '33333333-3333-4333-8333-333333333333',
    armId: '55555555-5555-4555-8555-555555555555',
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: '11111111-1111-4111-8111-111111111111',
    quoteId: '22222222-2222-4222-8222-222222222222',
    emergencyStopChangeId: '66666666-6666-4666-8666-666666666666',
    revalidatedAt: new Date('2026-10-02T15:00:03.000Z'),
    createdAt: new Date('2026-10-02T15:00:04.000Z'),
    expiresAt: new Date('2026-10-02T15:00:15.000Z'),
    riskApproved: true,
    confirmationRecorded: false,
    submissionAuthorized: false,
    ...overrides,
  };
}

function request(
  overrides: Partial<RealExecutionFinalConfirmationRequest> = {},
): RealExecutionFinalConfirmationRequest {
  return {
    id: '88888888-8888-4888-8888-888888888888',
    approvalId: '77777777-7777-4777-8777-777777777777',
    reservationId: '33333333-3333-4333-8333-333333333333',
    armId: '55555555-5555-4555-8555-555555555555',
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: '11111111-1111-4111-8111-111111111111',
    quoteId: '22222222-2222-4222-8222-222222222222',
    emergencyStopChangeId: '66666666-6666-4666-8666-666666666666',
    acknowledgment:
      'risk_approval_and_final_quote_reviewed_for_immediate_submission',
    requestedAt: new Date('2026-10-02T15:00:04.000Z'),
    expiresAt: new Date('2026-10-02T15:00:14.000Z'),
    ...overrides,
  };
}
