import { RealExecutionIntent } from '../domain/real-execution';
import {
  evaluateRealExecutionInstrumentReview,
  RealExecutionInstrumentReviewEvidence,
} from './real-execution-instrument-review';

describe('evaluateRealExecutionInstrumentReview', () => {
  it('marks complete evidence ready only for human review and authorizes nothing', () => {
    expect(
      evaluateRealExecutionInstrumentReview(
        intent(),
        evidence(),
        new Date('2026-09-30T12:00:05.000Z'),
      ),
    ).toEqual({
      scope: 'instrument_compatibility_review',
      status: 'review_ready',
      blockers: [],
      instrumentApproved: false,
      quoteAuthorized: false,
      submissionAuthorized: false,
      evaluatedAt: new Date('2026-09-30T12:00:05.000Z'),
    });
  });

  it('requires the intent and evidence to identify the same exact instrument', () => {
    const divergent = evidence();

    const assessment = evaluateRealExecutionInstrumentReview(
      intent(),
      {
        ...divergent,
        chainId: '1',
        sourceTokenAddress: '0xother-source',
        targetTokenAddress: '0xother-target',
      },
      new Date('2026-09-30T12:00:05.000Z'),
    );

    expect(assessment.status).toBe('blocked');
    expect(assessment.blockers).toEqual([
      'chain_mismatch',
      'source_token_mismatch',
      'target_token_mismatch',
    ]);
  });

  it.each([
    ['buy', 'BTC', 'USDT'],
    ['sell', 'USDT', 'BTC'],
  ] as const)(
    'rejects reversed economic assets for a %s candidate',
    (strategyAction, sourceEconomicAsset, targetEconomicAsset) => {
      const assessment = evaluateRealExecutionInstrumentReview(
        intent(),
        {
          ...evidence(),
          strategyAction,
          sourceEconomicAsset,
          targetEconomicAsset,
        },
        new Date('2026-09-30T12:00:05.000Z'),
      );

      expect(assessment.blockers).toEqual([
        'source_economic_asset_mismatch',
        'target_economic_asset_mismatch',
      ]);
    },
  );

  it('reports every missing compatibility and cost evidence independently', () => {
    const assessment = evaluateRealExecutionInstrumentReview(
      intent(),
      {
        ...evidence(),
        sourceTokenIdentity: 'unverified',
        targetTokenIdentity: 'unverified',
        representationRisk: 'unverified',
        crossVenuePriceBasisRisk: 'unverified',
        onchainLiquidityRisk: 'unverified',
        providerFeeCoverage: 'unverified',
        networkFeeCoverage: 'unverified',
        routeSlippageCoverage: 'unverified',
        asynchronousFinalityRisk: 'unverified',
      },
      new Date('2026-09-30T12:00:05.000Z'),
    );

    expect(assessment.blockers).toEqual([
      'source_token_identity_unverified',
      'target_token_identity_unverified',
      'representation_risk_undocumented',
      'cross_venue_price_basis_risk_undocumented',
      'onchain_liquidity_risk_undocumented',
      'provider_fee_coverage_incomplete',
      'network_fee_coverage_incomplete',
      'route_slippage_coverage_incomplete',
      'asynchronous_finality_risk_undocumented',
    ]);
    expect(assessment.instrumentApproved).toBe(false);
    expect(assessment.quoteAuthorized).toBe(false);
    expect(assessment.submissionAuthorized).toBe(false);
  });

  it('rejects future-dated review evidence', () => {
    const assessment = evaluateRealExecutionInstrumentReview(
      intent(),
      {
        ...evidence(),
        reviewedAt: new Date('2026-09-30T12:00:06.000Z'),
      },
      new Date('2026-09-30T12:00:05.000Z'),
    );

    expect(assessment.blockers).toEqual(['review_from_future']);
  });

  it('blocks malformed intent and evidence without trusting their fields', () => {
    const assessment = evaluateRealExecutionInstrumentReview(
      { ...intent(), sourceQuantity: '0' },
      {
        ...evidence(),
        chainId: '56;swap',
        sourceTokenAddress: '0xsame',
        targetTokenAddress: '0xsame',
      },
      new Date('2026-09-30T12:00:05.000Z'),
    );

    expect(assessment.blockers).toEqual(['invalid_intent', 'invalid_evidence']);
  });

  it('rejects invalid review and evaluation dates', () => {
    expect(
      evaluateRealExecutionInstrumentReview(
        intent(),
        { ...evidence(), reviewedAt: new Date('invalid') },
        new Date('2026-09-30T12:00:05.000Z'),
      ).blockers,
    ).toEqual(['invalid_evidence']);
    expect(() =>
      evaluateRealExecutionInstrumentReview(
        intent(),
        evidence(),
        new Date('invalid'),
      ),
    ).toThrow('Real execution instrument review time must be valid');
  });
});

function intent(): RealExecutionIntent {
  return {
    id: '0199a123-4567-7abc-8def-0123456789ab',
    idempotencyKey: 'intent:0199a123-4567-7abc-8def-0123456789ab',
    kind: 'market_swap',
    chainId: '56',
    sourceAsset: { tokenAddress: '0xsource', symbol: 'USDT' },
    targetAsset: { tokenAddress: '0xtarget', symbol: 'BTCB' },
    sourceQuantity: '10',
    maxSlippageRate: '0.005',
    createdAt: new Date('2026-09-30T12:00:00.000Z'),
  };
}

function evidence(): RealExecutionInstrumentReviewEvidence {
  return {
    scope: 'binance_spot_btc_usdt_to_agentic_wallet_onchain_swap',
    providerId: 'agentic_wallet',
    strategyAction: 'buy',
    chainId: '56',
    sourceTokenAddress: '0xsource',
    targetTokenAddress: '0xtarget',
    sourceEconomicAsset: 'USDT',
    targetEconomicAsset: 'BTC',
    sourceTokenIdentity: 'documented',
    targetTokenIdentity: 'documented',
    representationRisk: 'documented',
    crossVenuePriceBasisRisk: 'documented',
    onchainLiquidityRisk: 'documented',
    providerFeeCoverage: 'documented',
    networkFeeCoverage: 'documented',
    routeSlippageCoverage: 'documented',
    asynchronousFinalityRisk: 'documented',
    reviewedAt: new Date('2026-09-30T12:00:04.000Z'),
  };
}
