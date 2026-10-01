import { RealExecutionIntent } from '../domain/real-execution';
import {
  APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT,
  evaluateRealExecutionInstrumentApproval,
  RealExecutionInstrumentApproval,
} from './real-execution-instrument-approval';
import { RealExecutionInstrumentReviewEvidence } from './real-execution-instrument-review';

describe('evaluateRealExecutionInstrumentApproval', () => {
  it('approves the exact reviewed BSC USDT-to-BTCB candidate but authorizes no provider action', () => {
    expect(
      evaluateRealExecutionInstrumentApproval(
        intent(),
        evidence(),
        APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT,
        new Date('2026-10-01T02:28:00.000Z'),
      ),
    ).toEqual({
      scope: 'instrument_candidate_approval',
      status: 'instrument_approved',
      blockers: [],
      instrumentApproved: true,
      quoteAuthorized: false,
      submissionAuthorized: false,
      evaluatedAt: new Date('2026-10-01T02:28:00.000Z'),
    });
  });

  it('accepts checksum casing without weakening exact address identity', () => {
    const candidate = intent();

    expect(
      evaluateRealExecutionInstrumentApproval(
        {
          ...candidate,
          sourceAsset: {
            ...candidate.sourceAsset,
            tokenAddress: '0x55d398326f99059fF775485246999027B3197955',
          },
        },
        {
          ...evidence(),
          sourceTokenAddress: '0x55d398326f99059fF775485246999027B3197955',
        },
        APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT,
        new Date('2026-10-01T02:28:00.000Z'),
      ).status,
    ).toBe('instrument_approved');
  });

  it('supports only the exact reverse BTCB-to-USDT direction for sell', () => {
    const buyIntent = intent();
    const sellIntent: RealExecutionIntent = {
      ...buyIntent,
      sourceAsset: buyIntent.targetAsset,
      targetAsset: buyIntent.sourceAsset,
    };
    const sellEvidence: RealExecutionInstrumentReviewEvidence = {
      ...evidence(),
      strategyAction: 'sell',
      sourceTokenAddress: sellIntent.sourceAsset.tokenAddress,
      targetTokenAddress: sellIntent.targetAsset.tokenAddress,
      sourceEconomicAsset: 'BTC',
      targetEconomicAsset: 'USDT',
    };

    expect(
      evaluateRealExecutionInstrumentApproval(
        sellIntent,
        sellEvidence,
        APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT,
        new Date('2026-10-01T02:28:00.000Z'),
      ).status,
    ).toBe('instrument_approved');
  });

  it('blocks another chain or either unapproved token address independently', () => {
    const candidate = intent();
    const assessment = evaluateRealExecutionInstrumentApproval(
      {
        ...candidate,
        chainId: '1',
        sourceAsset: {
          ...candidate.sourceAsset,
          tokenAddress: evmAddress('1'),
        },
        targetAsset: {
          ...candidate.targetAsset,
          tokenAddress: evmAddress('2'),
        },
      },
      {
        ...evidence(),
        chainId: '1',
        sourceTokenAddress: evmAddress('1'),
        targetTokenAddress: evmAddress('2'),
      },
      APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT,
      new Date('2026-10-01T02:28:00.000Z'),
    );

    expect(assessment.blockers).toEqual([
      'chain_not_approved',
      'source_token_not_approved',
      'target_token_not_approved',
    ]);
  });

  it('blocks incomplete compatibility evidence even for the approved pair', () => {
    const assessment = evaluateRealExecutionInstrumentApproval(
      intent(),
      { ...evidence(), onchainLiquidityRisk: 'unverified' },
      APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT,
      new Date('2026-10-01T02:28:00.000Z'),
    );

    expect(assessment.blockers).toEqual(['compatibility_review_blocked']);
    expect(assessment.instrumentApproved).toBe(false);
  });

  it('rejects malformed approval facts and future approval dates', () => {
    const malformed = {
      ...APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT,
      btc: {
        ...APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT.btc,
        tokenAddress: 'BTCB',
      },
    } as RealExecutionInstrumentApproval;
    const future = {
      ...APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT,
      approvedAt: new Date('2026-10-01T02:29:00.000Z'),
    };

    expect(
      evaluateRealExecutionInstrumentApproval(
        intent(),
        evidence(),
        malformed,
        new Date('2026-10-01T02:28:00.000Z'),
      ).blockers,
    ).toEqual(['invalid_approval']);
    expect(
      evaluateRealExecutionInstrumentApproval(
        intent(),
        evidence(),
        future,
        new Date('2026-10-01T02:28:00.000Z'),
      ).blockers,
    ).toEqual(['approval_from_future']);
  });

  it('rejects malformed intent and evaluation time', () => {
    expect(
      evaluateRealExecutionInstrumentApproval(
        { ...intent(), sourceQuantity: '0' },
        evidence(),
        APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT,
        new Date('2026-10-01T02:28:00.000Z'),
      ).blockers,
    ).toEqual(['invalid_intent', 'compatibility_review_blocked']);
    expect(() =>
      evaluateRealExecutionInstrumentApproval(
        intent(),
        evidence(),
        APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT,
        new Date('invalid'),
      ),
    ).toThrow('Real execution instrument approval time must be valid');
  });
});

function intent(): RealExecutionIntent {
  return {
    id: '0199a123-4567-7abc-8def-0123456789ab',
    idempotencyKey: 'intent:0199a123-4567-7abc-8def-0123456789ab',
    kind: 'market_swap',
    chainId: '56',
    sourceAsset: {
      tokenAddress: '0x55d398326f99059ff775485246999027b3197955',
      symbol: 'USDT',
    },
    targetAsset: {
      tokenAddress: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
      symbol: 'BTCB',
    },
    sourceQuantity: '10',
    maxSlippageRate: '0.005',
    createdAt: new Date('2026-09-30T12:00:00.000Z'),
  };
}

function evidence(): RealExecutionInstrumentReviewEvidence {
  const candidate = intent();
  return {
    scope: 'binance_spot_btc_usdt_to_agentic_wallet_onchain_swap',
    providerId: 'agentic_wallet',
    strategyAction: 'buy',
    chainId: candidate.chainId,
    sourceTokenAddress: candidate.sourceAsset.tokenAddress,
    targetTokenAddress: candidate.targetAsset.tokenAddress,
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

function evmAddress(lastCharacter: string): string {
  return `0x${'0'.repeat(39)}${lastCharacter}`;
}
