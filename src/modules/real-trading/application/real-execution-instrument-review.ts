import {
  RealExecutionIntent,
  validateRealExecutionIntent,
} from '../domain/real-execution';

export type RealExecutionStrategyAction = 'buy' | 'sell';
export type RealExecutionEconomicAsset = 'BTC' | 'USDT';
export type RealExecutionEvidenceState = 'documented' | 'unverified';

export interface RealExecutionInstrumentReviewEvidence {
  readonly scope: 'binance_spot_btc_usdt_to_agentic_wallet_onchain_swap';
  readonly providerId: 'agentic_wallet';
  readonly strategyAction: RealExecutionStrategyAction;
  readonly chainId: string;
  readonly sourceTokenAddress: string;
  readonly targetTokenAddress: string;
  readonly sourceEconomicAsset: RealExecutionEconomicAsset;
  readonly targetEconomicAsset: RealExecutionEconomicAsset;
  readonly sourceTokenIdentity: RealExecutionEvidenceState;
  readonly targetTokenIdentity: RealExecutionEvidenceState;
  readonly representationRisk: RealExecutionEvidenceState;
  readonly crossVenuePriceBasisRisk: RealExecutionEvidenceState;
  readonly onchainLiquidityRisk: RealExecutionEvidenceState;
  readonly providerFeeCoverage: RealExecutionEvidenceState;
  readonly networkFeeCoverage: RealExecutionEvidenceState;
  readonly routeSlippageCoverage: RealExecutionEvidenceState;
  readonly asynchronousFinalityRisk: RealExecutionEvidenceState;
  readonly reviewedAt: Date;
}

export type RealExecutionInstrumentReviewBlocker =
  | 'invalid_intent'
  | 'invalid_evidence'
  | 'chain_mismatch'
  | 'source_token_mismatch'
  | 'target_token_mismatch'
  | 'source_economic_asset_mismatch'
  | 'target_economic_asset_mismatch'
  | 'source_token_identity_unverified'
  | 'target_token_identity_unverified'
  | 'representation_risk_undocumented'
  | 'cross_venue_price_basis_risk_undocumented'
  | 'onchain_liquidity_risk_undocumented'
  | 'provider_fee_coverage_incomplete'
  | 'network_fee_coverage_incomplete'
  | 'route_slippage_coverage_incomplete'
  | 'asynchronous_finality_risk_undocumented'
  | 'review_from_future';

export interface RealExecutionInstrumentReviewAssessment {
  readonly scope: 'instrument_compatibility_review';
  readonly status: 'review_ready' | 'blocked';
  readonly blockers: readonly RealExecutionInstrumentReviewBlocker[];
  readonly instrumentApproved: false;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
  readonly evaluatedAt: Date;
}

export function evaluateRealExecutionInstrumentReview(
  intent: RealExecutionIntent,
  evidence: RealExecutionInstrumentReviewEvidence,
  evaluatedAt: Date,
): RealExecutionInstrumentReviewAssessment {
  validateEvaluationTime(evaluatedAt);
  const blockers: RealExecutionInstrumentReviewBlocker[] = [];

  try {
    validateRealExecutionIntent(intent);
  } catch {
    blockers.push('invalid_intent');
  }
  const evidenceValid = validateEvidence(evidence);
  if (!evidenceValid) blockers.push('invalid_evidence');

  if (!blockers.includes('invalid_intent') && evidenceValid) {
    addIf(blockers, intent.chainId !== evidence.chainId, 'chain_mismatch');
    addIf(
      blockers,
      intent.sourceAsset.tokenAddress !== evidence.sourceTokenAddress,
      'source_token_mismatch',
    );
    addIf(
      blockers,
      intent.targetAsset.tokenAddress !== evidence.targetTokenAddress,
      'target_token_mismatch',
    );

    const expectedSource = evidence.strategyAction === 'buy' ? 'USDT' : 'BTC';
    const expectedTarget = evidence.strategyAction === 'buy' ? 'BTC' : 'USDT';
    addIf(
      blockers,
      evidence.sourceEconomicAsset !== expectedSource,
      'source_economic_asset_mismatch',
    );
    addIf(
      blockers,
      evidence.targetEconomicAsset !== expectedTarget,
      'target_economic_asset_mismatch',
    );

    addEvidenceBlocker(
      blockers,
      evidence.sourceTokenIdentity,
      'source_token_identity_unverified',
    );
    addEvidenceBlocker(
      blockers,
      evidence.targetTokenIdentity,
      'target_token_identity_unverified',
    );
    addEvidenceBlocker(
      blockers,
      evidence.representationRisk,
      'representation_risk_undocumented',
    );
    addEvidenceBlocker(
      blockers,
      evidence.crossVenuePriceBasisRisk,
      'cross_venue_price_basis_risk_undocumented',
    );
    addEvidenceBlocker(
      blockers,
      evidence.onchainLiquidityRisk,
      'onchain_liquidity_risk_undocumented',
    );
    addEvidenceBlocker(
      blockers,
      evidence.providerFeeCoverage,
      'provider_fee_coverage_incomplete',
    );
    addEvidenceBlocker(
      blockers,
      evidence.networkFeeCoverage,
      'network_fee_coverage_incomplete',
    );
    addEvidenceBlocker(
      blockers,
      evidence.routeSlippageCoverage,
      'route_slippage_coverage_incomplete',
    );
    addEvidenceBlocker(
      blockers,
      evidence.asynchronousFinalityRisk,
      'asynchronous_finality_risk_undocumented',
    );
    addIf(
      blockers,
      evidence.reviewedAt.getTime() > evaluatedAt.getTime(),
      'review_from_future',
    );
  }

  return {
    scope: 'instrument_compatibility_review',
    status: blockers.length === 0 ? 'review_ready' : 'blocked',
    blockers,
    instrumentApproved: false,
    quoteAuthorized: false,
    submissionAuthorized: false,
    evaluatedAt: new Date(evaluatedAt),
  };
}

function validateEvidence(
  evidence: RealExecutionInstrumentReviewEvidence,
): boolean {
  try {
    if (
      evidence.scope !==
        'binance_spot_btc_usdt_to_agentic_wallet_onchain_swap' ||
      evidence.providerId !== 'agentic_wallet' ||
      (evidence.strategyAction !== 'buy' && evidence.strategyAction !== 'sell')
    ) {
      return false;
    }
    if (!/^[A-Za-z0-9_-]{1,32}$/.test(evidence.chainId)) return false;
    if (!/^\S{1,256}$/.test(evidence.sourceTokenAddress)) return false;
    if (!/^\S{1,256}$/.test(evidence.targetTokenAddress)) return false;
    if (evidence.sourceTokenAddress === evidence.targetTokenAddress)
      return false;
    if (!isEconomicAsset(evidence.sourceEconomicAsset)) return false;
    if (!isEconomicAsset(evidence.targetEconomicAsset)) return false;
    for (const state of evidenceStates(evidence)) {
      if (state !== 'documented' && state !== 'unverified') return false;
    }
    if (
      !(evidence.reviewedAt instanceof Date) ||
      !Number.isFinite(evidence.reviewedAt.getTime())
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function evidenceStates(
  evidence: RealExecutionInstrumentReviewEvidence,
): readonly RealExecutionEvidenceState[] {
  return [
    evidence.sourceTokenIdentity,
    evidence.targetTokenIdentity,
    evidence.representationRisk,
    evidence.crossVenuePriceBasisRisk,
    evidence.onchainLiquidityRisk,
    evidence.providerFeeCoverage,
    evidence.networkFeeCoverage,
    evidence.routeSlippageCoverage,
    evidence.asynchronousFinalityRisk,
  ];
}

function isEconomicAsset(value: unknown): value is RealExecutionEconomicAsset {
  return value === 'BTC' || value === 'USDT';
}

function validateEvaluationTime(evaluatedAt: Date): void {
  if (
    !(evaluatedAt instanceof Date) ||
    !Number.isFinite(evaluatedAt.getTime())
  ) {
    throw new Error('Real execution instrument review time must be valid');
  }
}

function addEvidenceBlocker(
  blockers: RealExecutionInstrumentReviewBlocker[],
  state: RealExecutionEvidenceState,
  blocker: RealExecutionInstrumentReviewBlocker,
): void {
  addIf(blockers, state !== 'documented', blocker);
}

function addIf(
  blockers: RealExecutionInstrumentReviewBlocker[],
  condition: boolean,
  blocker: RealExecutionInstrumentReviewBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
