import {
  RealExecutionAsset,
  RealExecutionIntent,
  RealExecutionQuote,
} from '../domain/real-execution';
import {
  assessRealExecutionQuoteRisk,
  RealExecutionQuoteRiskBlocker,
} from './real-execution-quote-risk';
import { RealExecutionLocalRiskLimits } from './real-execution-local-risk-limits';

const EVALUATED_AT = new Date('2026-10-01T14:00:02.000Z');
const BTCB: RealExecutionAsset = {
  tokenAddress: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
  symbol: 'BTCB',
};
const USDT: RealExecutionAsset = {
  tokenAddress: '0x55d398326f99059ff775485246999027b3197955',
  symbol: 'USDT',
};

describe('assessRealExecutionQuoteRisk', () => {
  it('derives exact comparable quote facts without granting risk approval', () => {
    expect(
      assessRealExecutionQuoteRisk(intent(), quote(), limits(), EVALUATED_AT),
    ).toEqual({
      scope: 'real_execution_quote_risk',
      status: 'within_quote_limits',
      blockers: [],
      orderNotionalUsdt: '5',
      providerFeeRate: '0.002',
      networkFeeUsdt: '0.1',
      dailySpendEvaluated: false,
      bankrollEvaluated: false,
      riskApproved: false,
      fundingAuthorized: false,
      quoteAuthorized: false,
      submissionAuthorized: false,
      evaluatedAt: EVALUATED_AT,
    });
  });

  it('uses expected USDT output as sell notional', () => {
    const sellIntent = intent({
      sourceAsset: BTCB,
      targetAsset: USDT,
      sourceQuantity: '0.0001',
    });
    const sellQuote = quote({
      intent: sellIntent,
      expectedTargetQuantity: '8',
      minimumTargetQuantity: '7.96',
      costs: [
        { kind: 'provider_fee', asset: BTCB, quantity: '0.0000001' },
        { kind: 'network_fee', asset: USDT, quantity: '0.1' },
      ],
    });

    expect(
      assessRealExecutionQuoteRisk(
        sellIntent,
        sellQuote,
        limits({ maximumOrderNotionalUsdt: '8' }),
        EVALUATED_AT,
      ),
    ).toMatchObject({
      status: 'within_quote_limits',
      orderNotionalUsdt: '8',
      providerFeeRate: '0.001',
    });
  });

  it('rejects a divergent intent, provider, instrument, or validity window', () => {
    expect(
      blockers(
        intent(),
        quote({
          providerId: 'other_provider',
          intent: intent({ sourceQuantity: '6' }),
          quotedAt: new Date('2026-10-01T14:00:03.000Z'),
          expiresAt: new Date('2026-10-01T14:00:04.000Z'),
        }),
      ),
    ).toEqual([
      'quote_intent_mismatch',
      'provider_not_approved',
      'quote_from_future',
    ]);

    const unapproved = intent({ chainId: '1' });
    expect(blockers(unapproved, quote({ intent: unapproved }))).toContain(
      'instrument_not_approved',
    );
    expect(
      blockers(
        intent(),
        quote({ expiresAt: new Date('2026-10-01T14:00:02.000Z') }),
      ),
    ).toContain('quote_expired');
  });

  it('fails closed for invalid domain facts or an undefined local envelope', () => {
    expect(
      blockers(
        intent({ sourceQuantity: '0' }),
        quote({ expectedTargetQuantity: '0' }),
        limits({ maximumDailySpendUsdt: null }),
      ),
    ).toEqual(['invalid_intent', 'invalid_quote', 'local_limits_blocked']);
  });

  it('checks order notional and slippage against exact local limits', () => {
    expect(
      blockers(
        intent({ maxSlippageRate: '0.006' }),
        quote({
          intent: intent({ maxSlippageRate: '0.006' }),
        }),
        limits({
          maximumOrderNotionalUsdt: '4.999999999999999999',
          maximumSlippageRate: '0.005',
        }),
      ),
    ).toEqual(['order_notional_exceeds_limit', 'slippage_exceeds_limit']);
  });

  it('requires complete, explicit, comparable provider and network costs', () => {
    expect(
      blockers(intent(), quote({ costCoverage: 'partial', costs: [] })),
    ).toEqual([
      'cost_coverage_incomplete',
      'provider_fee_missing',
      'network_fee_missing',
    ]);

    expect(
      blockers(
        intent(),
        quote({
          costs: [
            { kind: 'provider_fee', asset: BTCB, quantity: '0.001' },
            { kind: 'network_fee', asset: BTCB, quantity: '0.001' },
          ],
        }),
      ),
    ).toEqual(['provider_fee_not_source_asset', 'network_fee_not_usdt']);
  });

  it('aggregates exact costs before enforcing fee limits', () => {
    expect(
      blockers(
        intent(),
        quote({
          costs: [
            { kind: 'provider_fee', asset: USDT, quantity: '0.03' },
            { kind: 'provider_fee', asset: USDT, quantity: '0.03' },
            { kind: 'network_fee', asset: USDT, quantity: '0.3' },
            { kind: 'network_fee', asset: USDT, quantity: '0.3' },
          ],
        }),
        limits({
          maximumProviderFeeRate: '0.01',
          maximumNetworkFeeUsdt: '0.5',
        }),
      ),
    ).toEqual(['provider_fee_rate_exceeds_limit', 'network_fee_exceeds_limit']);
  });

  it('rejects an invalid evaluation time', () => {
    expect(() =>
      assessRealExecutionQuoteRisk(
        intent(),
        quote(),
        limits(),
        new Date('invalid'),
      ),
    ).toThrow('quote risk evaluation time must be valid');
  });
});

function blockers(
  valueIntent: RealExecutionIntent,
  valueQuote: RealExecutionQuote,
  valueLimits = limits(),
): readonly RealExecutionQuoteRiskBlocker[] {
  return assessRealExecutionQuoteRisk(
    valueIntent,
    valueQuote,
    valueLimits,
    EVALUATED_AT,
  ).blockers;
}

function intent(
  overrides: Partial<RealExecutionIntent> = {},
): RealExecutionIntent {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    idempotencyKey: 'quote-risk-1',
    kind: 'market_swap',
    chainId: '56',
    sourceAsset: USDT,
    targetAsset: BTCB,
    sourceQuantity: '5',
    maxSlippageRate: '0.005',
    createdAt: new Date('2026-10-01T13:59:59.000Z'),
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
    minimumTargetQuantity: '0.00006169',
    costs: [
      { kind: 'provider_fee', asset: USDT, quantity: '0.01' },
      { kind: 'network_fee', asset: USDT, quantity: '0.1' },
    ],
    costCoverage: 'complete',
    quotedAt: new Date('2026-10-01T14:00:01.000Z'),
    expiresAt: new Date('2026-10-01T14:00:06.000Z'),
    executable: false,
    ...overrides,
  };
}

function limits(
  overrides: Partial<RealExecutionLocalRiskLimits> = {},
): RealExecutionLocalRiskLimits {
  return {
    maximumOrderNotionalUsdt: '8',
    maximumDailySpendUsdt: '10',
    maximumBankrollUsdt: '25',
    maximumProviderFeeRate: '0.01',
    maximumNetworkFeeUsdt: '0.5',
    maximumSlippageRate: '0.005',
    ...overrides,
  };
}
