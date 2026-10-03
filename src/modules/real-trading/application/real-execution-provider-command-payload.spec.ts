import {
  RealExecutionAsset,
  RealExecutionIntent,
  RealExecutionQuote,
} from '../domain/real-execution';
import { StoredRealExecutionFinalConfirmation } from './real-execution-final-confirmation-store';
import { assessRealExecutionPayloadCommitment } from './real-execution-payload-commitment';
import {
  assessRealExecutionProviderCommandPayload,
  RealExecutionProviderCommandPayloadAssessment,
} from './real-execution-provider-command-payload';
import { RealExecutionSubmissionPlan } from './real-execution-submission-plan';

const NOW = new Date('2026-10-03T12:00:04.000Z');
const BTCB: RealExecutionAsset = {
  tokenAddress: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
  symbol: 'BTCB',
};
const USDT: RealExecutionAsset = {
  tokenAddress: '0x55d398326f99059ff775485246999027b3197955',
  symbol: 'USDT',
};

describe('assessRealExecutionProviderCommandPayload', () => {
  it('verifies and canonicalizes an inert provider-bound payload', () => {
    const result = assess();

    expect(result).toEqual({
      scope: 'real_execution_provider_command_payload',
      status: 'provider_command_payload_verified',
      blockers: [],
      payload: {
        kind: 'agentic_wallet_market_order_swap',
        providerId: 'agentic_wallet',
        chainId: '56',
        sourceTokenAddress: USDT.tokenAddress,
        targetTokenAddress: BTCB.tokenAddress,
        sourceQuantity: '5',
        maximumSlippagePercent: '0.1',
        mevProtection: true,
        gasLevel: 'MEDIUM',
        payloadCommitmentVersion: 'real_execution_intent_quote_v1',
        payloadCommitmentDigest: commitmentDigest(),
        executable: false,
        automaticRetryAllowed: false,
      },
      payloadCommitmentMatched: true,
      atomicGateRequired: true,
      confirmationConsumptionRequired: true,
      submissionAuthorized: false,
      evaluatedAt: NOW,
    });
  });

  it('rejects any changed committed payload fact', () => {
    const result = assess({
      quote: quote({ minimumTargetQuantity: '0.0000619' }),
    });

    expect(result).toMatchObject({
      status: 'blocked',
      blockers: ['payload_commitment_mismatch'],
      payload: null,
      payloadCommitmentMatched: false,
      submissionAuthorized: false,
    });
  });

  it('requires exact confirmation, plan, intent, and quote identities', () => {
    const result = assess({
      plan: plan({ confirmationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }),
      intent: intent({ id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }),
      quote: quote({ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' }),
    });

    expect(result.blockers).toEqual(
      expect.arrayContaining([
        'submission_plan_identity_mismatch',
        'intent_identity_mismatch',
        'quote_identity_mismatch',
        'payload_commitment_blocked',
      ]),
    );
  });

  it('fails closed on malformed durable and transient inputs', () => {
    const result = assess({
      confirmation: confirmation({ payloadCommitmentDigest: 'invalid' }),
      plan: plan({ initialSubmissionOnly: false as true }),
      intent: intent({ id: 'invalid' }),
      quote: quote({ id: 'invalid' }),
      evaluatedAt: new Date(Number.NaN),
    });

    expect(result.blockers).toEqual(
      expect.arrayContaining([
        'invalid_final_confirmation',
        'invalid_submission_plan',
        'invalid_intent',
        'invalid_quote',
        'invalid_evaluation_time',
      ]),
    );
  });

  it('requires active confirmation, plan, and complete quote commitment', () => {
    expect(
      assess({ confirmation: confirmation({ expiresAt: NOW }) }).blockers,
    ).toContain('confirmation_expired');
    expect(assess({ plan: plan({ expiresAt: NOW }) }).blockers).toContain(
      'submission_plan_expired',
    );
    expect(
      assess({ quote: quote({ costCoverage: 'partial' }) }).blockers,
    ).toContain('payload_commitment_blocked');
    expect(
      assess({
        confirmation: confirmation({
          createdAt: new Date('2026-10-03T12:00:04.001Z'),
        }),
      }).blockers,
    ).toContain('confirmation_from_future');
    expect(
      assess({
        plan: plan({ requestedAt: new Date('2026-10-03T12:00:04.001Z') }),
      }).blockers,
    ).toContain('submission_plan_from_future');
  });

  it('canonicalizes equivalent decimals and address casing', () => {
    const equivalentIntent = intent({
      sourceAsset: { ...USDT, tokenAddress: USDT.tokenAddress.toUpperCase() },
      sourceQuantity: '5.0',
      maxSlippageRate: '0.0010',
    });
    const result = assess({
      intent: equivalentIntent,
      quote: quote({ intent: equivalentIntent }),
    });

    expect(result.payload).toMatchObject({
      sourceTokenAddress: USDT.tokenAddress,
      sourceQuantity: '5',
      maximumSlippagePercent: '0.1',
    });
  });
});

function assess(
  overrides: {
    confirmation?: StoredRealExecutionFinalConfirmation;
    plan?: RealExecutionSubmissionPlan;
    intent?: RealExecutionIntent;
    quote?: RealExecutionQuote;
    evaluatedAt?: Date;
  } = {},
): RealExecutionProviderCommandPayloadAssessment {
  return assessRealExecutionProviderCommandPayload(
    overrides.confirmation ?? confirmation(),
    overrides.plan ?? plan(),
    overrides.intent ?? intent(),
    overrides.quote ?? quote(),
    overrides.evaluatedAt ?? NOW,
  );
}

function commitmentDigest(): string {
  const result = assessRealExecutionPayloadCommitment(intent(), quote(), NOW);
  if (result.commitment === null) throw new Error('test commitment is blocked');
  return result.commitment.digest;
}

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
    intentId: intent().id,
    quoteId: quote().id,
    payloadCommitmentVersion: 'real_execution_intent_quote_v1',
    payloadCommitmentDigest: commitmentDigest(),
    emergencyStopChangeId: 'real-trading-stop-clear-1',
    acknowledgment:
      'risk_approval_and_final_quote_reviewed_for_immediate_submission',
    requestedAt: new Date('2026-10-03T12:00:01.000Z'),
    createdAt: new Date('2026-10-03T12:00:02.000Z'),
    expiresAt: new Date('2026-10-03T12:00:08.000Z'),
    riskApproved: true,
    confirmationRecorded: true,
    emergencyStopRecheckedForSubmission: false,
    submissionAuthorized: false,
    ...overrides,
  };
}

function plan(
  overrides: Partial<RealExecutionSubmissionPlan> = {},
): RealExecutionSubmissionPlan {
  return {
    id: '99999999-9999-4999-8999-999999999999',
    confirmationId: '88888888-8888-4888-8888-888888888888',
    approvalId: '77777777-7777-4777-8777-777777777777',
    reservationId: '33333333-3333-4333-8333-333333333333',
    armId: '55555555-5555-4555-8555-555555555555',
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: intent().id,
    quoteId: quote().id,
    emergencyStopChangeId: 'real-trading-stop-clear-1',
    requestedAt: new Date('2026-10-03T12:00:03.000Z'),
    expiresAt: new Date('2026-10-03T12:00:07.000Z'),
    initialSubmissionOnly: true,
    automaticRetryAllowed: false,
    ...overrides,
  };
}

function intent(
  overrides: Partial<RealExecutionIntent> = {},
): RealExecutionIntent {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    idempotencyKey: 'provider-command-payload-1',
    kind: 'market_swap',
    chainId: '56',
    sourceAsset: USDT,
    targetAsset: BTCB,
    sourceQuantity: '5',
    maxSlippageRate: '0.001',
    createdAt: new Date('2026-10-03T12:00:00.000Z'),
    ...overrides,
  };
}

function quote(
  overrides: Partial<RealExecutionQuote> = {},
): RealExecutionQuote {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    providerId: 'agentic_wallet',
    providerQuoteId: null,
    intent: intent(),
    expectedTargetQuantity: '0.000062',
    minimumTargetQuantity: '0.000061938',
    costs: [
      { kind: 'provider_fee', asset: USDT, quantity: '0.005' },
      { kind: 'network_fee', asset: USDT, quantity: '0.1' },
    ],
    costCoverage: 'complete',
    quotedAt: new Date('2026-10-03T12:00:00.500Z'),
    expiresAt: new Date('2026-10-03T12:00:08.000Z'),
    executable: false,
    ...overrides,
  };
}
