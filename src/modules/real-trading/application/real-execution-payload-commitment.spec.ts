import {
  RealExecutionAsset,
  RealExecutionIntent,
  RealExecutionQuote,
} from '../domain/real-execution';
import { assessRealExecutionPayloadCommitment } from './real-execution-payload-commitment';

const NOW = new Date('2026-10-02T15:00:02.000Z');
const BTCB: RealExecutionAsset = {
  tokenAddress: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
  symbol: 'BTCB',
};
const USDT: RealExecutionAsset = {
  tokenAddress: '0x55d398326f99059ff775485246999027b3197955',
  symbol: 'USDT',
};

describe('assessRealExecutionPayloadCommitment', () => {
  it('creates a non-authorizing canonical SHA-256 commitment', () => {
    const result = assessRealExecutionPayloadCommitment(intent(), quote(), NOW);

    expect(result).toEqual({
      scope: 'real_execution_payload_commitment',
      status: 'payload_commitment_ready',
      blockers: [],
      commitment: {
        algorithm: 'sha256',
        version: 'real_execution_intent_quote_v1',
        digest: result.commitment?.digest,
        providerId: 'agentic_wallet',
        chainId: '56',
        intentId: '11111111-1111-4111-8111-111111111111',
        quoteId: '22222222-2222-4222-8222-222222222222',
        quoteExpiresAt: new Date('2026-10-02T15:00:06.000Z'),
      },
      durableCommitmentRecorded: false,
      atomicGateSatisfied: false,
      submissionAuthorized: false,
      evaluatedAt: NOW,
    });
    expect(result.commitment?.digest).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is stable across decimal, address-case, and cost-order variants', () => {
    const first = assessRealExecutionPayloadCommitment(intent(), quote(), NOW);
    const equivalentIntent = intent({
      sourceAsset: { ...USDT, tokenAddress: USDT.tokenAddress.toUpperCase() },
      sourceQuantity: '5.0',
      maxSlippageRate: '0.0010',
    });
    const equivalentQuote = quote({
      intent: equivalentIntent,
      expectedTargetQuantity: '0.0000620',
      minimumTargetQuantity: '0.0000619380',
      costs: [...quote().costs].reverse(),
    });
    const second = assessRealExecutionPayloadCommitment(
      equivalentIntent,
      equivalentQuote,
      NOW,
    );

    expect(second.commitment?.digest).toBe(first.commitment?.digest);
  });

  it('changes the commitment when an execution-critical quote fact changes', () => {
    const first = assessRealExecutionPayloadCommitment(intent(), quote(), NOW);
    const second = assessRealExecutionPayloadCommitment(
      intent(),
      quote({ minimumTargetQuantity: '0.0000619' }),
      NOW,
    );

    expect(second.commitment?.digest).not.toBe(first.commitment?.digest);
  });

  it('rejects a quote carrying a different intent', () => {
    const changedIntent = intent({ sourceQuantity: '6' });
    expect(
      assessRealExecutionPayloadCommitment(
        intent(),
        quote({ intent: changedIntent }),
        NOW,
      ).blockers,
    ).toContain('quote_intent_mismatch');
  });

  it('rejects invalid intent and quote structures', () => {
    expect(
      assessRealExecutionPayloadCommitment(
        intent({ id: 'invalid' }),
        quote({ id: 'invalid' }),
        NOW,
      ).blockers,
    ).toEqual(expect.arrayContaining(['invalid_intent', 'invalid_quote']));
  });

  it('requires the approved provider and BSC BTCB/USDT instrument', () => {
    expect(
      assessRealExecutionPayloadCommitment(
        intent(),
        quote({ providerId: 'other_provider' }),
        NOW,
      ).blockers,
    ).toContain('provider_not_approved');
    const unapprovedIntent = intent({
      targetAsset: {
        tokenAddress: '0x1111111111111111111111111111111111111111',
        symbol: 'OTHER',
      },
    });
    expect(
      assessRealExecutionPayloadCommitment(
        unapprovedIntent,
        quote({ intent: unapprovedIntent }),
        NOW,
      ).blockers,
    ).toContain('instrument_not_approved');
  });

  it('requires complete quote cost coverage', () => {
    expect(
      assessRealExecutionPayloadCommitment(
        intent(),
        quote({ costCoverage: 'partial' }),
        NOW,
      ).blockers,
    ).toContain('quote_cost_coverage_incomplete');
  });

  it('rejects future and expired quotes', () => {
    expect(
      assessRealExecutionPayloadCommitment(
        intent(),
        quote({ quotedAt: new Date('2026-10-02T15:00:02.001Z') }),
        NOW,
      ).blockers,
    ).toContain('quote_from_future');
    expect(
      assessRealExecutionPayloadCommitment(
        intent(),
        quote({ expiresAt: NOW }),
        NOW,
      ).blockers,
    ).toContain('quote_expired');
  });

  it('fails closed on invalid evaluation time', () => {
    expect(
      assessRealExecutionPayloadCommitment(
        intent(),
        quote(),
        new Date(Number.NaN),
      ),
    ).toMatchObject({
      status: 'blocked',
      blockers: ['invalid_evaluation_time'],
      commitment: null,
      submissionAuthorized: false,
    });
  });
});

function intent(
  overrides: Partial<RealExecutionIntent> = {},
): RealExecutionIntent {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    idempotencyKey: 'payload-commitment-1',
    kind: 'market_swap',
    chainId: '56',
    sourceAsset: USDT,
    targetAsset: BTCB,
    sourceQuantity: '5',
    maxSlippageRate: '0.001',
    createdAt: new Date('2026-10-02T15:00:00.000Z'),
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
    quotedAt: new Date('2026-10-02T15:00:01.000Z'),
    expiresAt: new Date('2026-10-02T15:00:06.000Z'),
    executable: false,
    ...overrides,
  };
}
