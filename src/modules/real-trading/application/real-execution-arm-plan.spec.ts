import {
  planRealExecutionArm,
  RealExecutionArmPolicy,
  RealExecutionArmRequest,
} from './real-execution-arm-plan';
import { StoredRealExecutionReservation } from './real-execution-reservation-store';

const NOW = new Date('2026-10-01T14:00:03.000Z');
const POLICY: RealExecutionArmPolicy = {
  requestMaxAgeMs: 5_000,
  maximumArmLifetimeMs: 10_000,
};

describe('planRealExecutionArm', () => {
  it('creates an inert reservation-bound plan at inclusive limits', () => {
    const assessment = planRealExecutionArm(
      reservation(),
      request({
        requestedAt: new Date('2026-10-01T14:00:02.000Z'),
        expiresAt: new Date('2026-10-01T14:00:06.000Z'),
      }),
      POLICY,
      NOW,
    );

    expect(assessment).toMatchObject({
      scope: 'real_execution_arm_plan',
      status: 'arm_plan_ready',
      blockers: [],
      durableArmCreated: false,
      emergencyStopChecked: false,
      riskApproved: false,
      confirmationRecorded: false,
      submissionAuthorized: false,
    });
    expect(assessment.plan).toEqual(request());
  });

  it.each([
    [
      'reservationId',
      '44444444-4444-4444-8444-444444444444',
      'arm_reservation_mismatch',
    ],
    ['providerId', 'other_provider', 'arm_provider_mismatch'],
    ['chainId', '1', 'arm_chain_mismatch'],
    ['intentId', '44444444-4444-4444-8444-444444444444', 'arm_intent_mismatch'],
    ['quoteId', '44444444-4444-4444-8444-444444444444', 'arm_quote_mismatch'],
  ] as const)(
    'blocks divergent %s identity',
    (field, value, expectedBlocker) => {
      const assessment = planRealExecutionArm(
        reservation(),
        request({ [field]: value }),
        POLICY,
        NOW,
      );

      expect(assessment.status).toBe('blocked');
      expect(assessment.blockers).toContain(expectedBlocker);
      expect(assessment.plan).toBeNull();
    },
  );

  it('requires the exact operator review acknowledgment', () => {
    const assessment = planRealExecutionArm(
      reservation(),
      request({ acknowledgment: 'missing' as never }),
      POLICY,
      NOW,
    );

    expect(assessment).toMatchObject({
      status: 'blocked',
      blockers: ['operator_acknowledgment_missing'],
      plan: null,
    });
  });

  it('blocks future, stale, and pre-reservation requests', () => {
    expect(
      planRealExecutionArm(
        reservation(),
        request({ requestedAt: new Date('2026-10-01T14:00:04.000Z') }),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('arm_request_from_future');
    expect(
      planRealExecutionArm(
        reservation(),
        request({
          requestedAt: new Date('2026-10-01T13:59:57.999Z'),
          expiresAt: new Date('2026-10-01T14:00:05.000Z'),
        }),
        POLICY,
        NOW,
      ).blockers,
    ).toEqual(
      expect.arrayContaining(['arm_request_stale', 'arm_predates_reservation']),
    );
  });

  it('blocks expired reservations and arms', () => {
    expect(
      planRealExecutionArm(
        reservation({ expiresAt: NOW }),
        request({ expiresAt: NOW }),
        POLICY,
        NOW,
      ).blockers,
    ).toEqual(expect.arrayContaining(['reservation_expired', 'arm_expired']));
  });

  it('prevents an arm from outliving its reservation or maximum lifetime', () => {
    const assessment = planRealExecutionArm(
      reservation(),
      request({ expiresAt: new Date('2026-10-01T14:00:12.001Z') }),
      POLICY,
      NOW,
    );

    expect(assessment.blockers).toEqual(
      expect.arrayContaining([
        'arm_outlives_reservation',
        'arm_lifetime_exceeded',
      ]),
    );
  });

  it('fails closed on malformed reservation facts and policy bounds', () => {
    expect(
      planRealExecutionArm(
        reservation({ nativeGasSymbol: 'ETH' as 'BNB' }),
        request(),
        POLICY,
        NOW,
      ).blockers,
    ).toContain('invalid_reservation');
    expect(() =>
      planRealExecutionArm(
        reservation(),
        request(),
        { ...POLICY, maximumArmLifetimeMs: 60_001 },
        NOW,
      ),
    ).toThrow(RangeError);
  });

  it('fails closed on an invalid evaluation clock', () => {
    expect(
      planRealExecutionArm(
        reservation(),
        request(),
        POLICY,
        new Date(Number.NaN),
      ),
    ).toMatchObject({
      status: 'blocked',
      blockers: ['invalid_evaluation_time'],
      plan: null,
    });
  });
});

function reservation(
  overrides: Partial<StoredRealExecutionReservation> = {},
): StoredRealExecutionReservation {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: '11111111-1111-4111-8111-111111111111',
    quoteId: '22222222-2222-4222-8222-222222222222',
    idempotencyKey: 'durable-reservation-1',
    payloadCommitmentVersion: 'real_execution_intent_quote_v1',
    payloadCommitmentDigest: 'a'.repeat(64),
    utcDay: '2026-10-01',
    budgetChargeUsdt: '5.105',
    sourceTokenAddress: '0x55d398326f99059ff775485246999027b3197955',
    sourceSymbol: 'USDT',
    sourceQuantity: '5.005',
    nativeGasSymbol: 'BNB',
    nativeGasQuantity: '0.0002',
    providerQuotaUsd: '5.2',
    expiresAt: new Date('2026-10-01T14:00:12.000Z'),
    createdAt: new Date('2026-10-01T14:00:02.000Z'),
    ...overrides,
  };
}

function request(
  overrides: Partial<RealExecutionArmRequest> = {},
): RealExecutionArmRequest {
  return {
    id: '55555555-5555-4555-8555-555555555555',
    reservationId: '33333333-3333-4333-8333-333333333333',
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: '11111111-1111-4111-8111-111111111111',
    quoteId: '22222222-2222-4222-8222-222222222222',
    acknowledgment: 'reservation_and_quote_reviewed',
    requestedAt: new Date('2026-10-01T14:00:02.000Z'),
    expiresAt: new Date('2026-10-01T14:00:06.000Z'),
    ...overrides,
  };
}
