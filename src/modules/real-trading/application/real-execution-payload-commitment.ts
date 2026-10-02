import { createHash } from 'node:crypto';

import Decimal from 'decimal.js';

import {
  RealExecutionAsset,
  RealExecutionCost,
  RealExecutionIntent,
  RealExecutionQuote,
  validateRealExecutionIntent,
  validateRealExecutionQuote,
} from '../domain/real-execution';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from './real-execution-instrument-approval';

const ExactDecimal = Decimal.clone({
  precision: 80,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -80,
  toExpPos: 80,
});
const COMMITMENT_VERSION = 'real_execution_intent_quote_v1' as const;

export type RealExecutionPayloadCommitmentBlocker =
  | 'invalid_intent'
  | 'invalid_quote'
  | 'invalid_evaluation_time'
  | 'quote_intent_mismatch'
  | 'provider_not_approved'
  | 'instrument_not_approved'
  | 'quote_cost_coverage_incomplete'
  | 'quote_from_future'
  | 'quote_expired';

export interface RealExecutionPayloadCommitment {
  readonly algorithm: 'sha256';
  readonly version: 'real_execution_intent_quote_v1';
  readonly digest: string;
  readonly providerId: 'agentic_wallet';
  readonly chainId: '56';
  readonly intentId: string;
  readonly quoteId: string;
  readonly quoteExpiresAt: Date;
}

export interface RealExecutionPayloadCommitmentAssessment {
  readonly scope: 'real_execution_payload_commitment';
  readonly status: 'payload_commitment_ready' | 'blocked';
  readonly blockers: readonly RealExecutionPayloadCommitmentBlocker[];
  readonly commitment: RealExecutionPayloadCommitment | null;
  readonly durableCommitmentRecorded: false;
  readonly atomicGateSatisfied: false;
  readonly submissionAuthorized: false;
  readonly evaluatedAt: Date;
}

export function assessRealExecutionPayloadCommitment(
  intent: RealExecutionIntent,
  quote: RealExecutionQuote,
  evaluatedAt: Date,
): RealExecutionPayloadCommitmentAssessment {
  const blockers: RealExecutionPayloadCommitmentBlocker[] = [];
  const intentValid = isValidIntent(intent);
  const quoteValid = isValidQuote(quote);
  const evaluationTimeValid = isValidDate(evaluatedAt);
  addIf(blockers, !intentValid, 'invalid_intent');
  addIf(blockers, !quoteValid, 'invalid_quote');
  addIf(blockers, !evaluationTimeValid, 'invalid_evaluation_time');

  if (intentValid && quoteValid) {
    addIf(blockers, !sameIntent(intent, quote.intent), 'quote_intent_mismatch');
    addIf(
      blockers,
      quote.providerId !==
        APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT.providerId,
      'provider_not_approved',
    );
    addIf(blockers, !isApprovedInstrument(intent), 'instrument_not_approved');
    addIf(
      blockers,
      quote.costCoverage !== 'complete',
      'quote_cost_coverage_incomplete',
    );
  }

  if (quoteValid && evaluationTimeValid) {
    addIf(
      blockers,
      quote.quotedAt.getTime() > evaluatedAt.getTime(),
      'quote_from_future',
    );
    addIf(
      blockers,
      quote.expiresAt.getTime() <= evaluatedAt.getTime(),
      'quote_expired',
    );
  }

  const commitment: RealExecutionPayloadCommitment | null =
    blockers.length === 0
      ? {
          algorithm: 'sha256' as const,
          version: COMMITMENT_VERSION,
          digest: digest(intent, quote),
          providerId: 'agentic_wallet' as const,
          chainId: '56' as const,
          intentId: intent.id,
          quoteId: quote.id,
          quoteExpiresAt: new Date(quote.expiresAt),
        }
      : null;
  return {
    scope: 'real_execution_payload_commitment',
    status: commitment === null ? 'blocked' : 'payload_commitment_ready',
    blockers,
    commitment,
    durableCommitmentRecorded: false,
    atomicGateSatisfied: false,
    submissionAuthorized: false,
    evaluatedAt: new Date(evaluatedAt),
  };
}

function digest(
  intent: RealExecutionIntent,
  quote: RealExecutionQuote,
): string {
  const canonical = {
    version: COMMITMENT_VERSION,
    providerId: quote.providerId,
    providerQuoteId: quote.providerQuoteId,
    intent: canonicalIntent(intent),
    quoteIntent: canonicalIntent(quote.intent),
    quoteId: quote.id,
    expectedTargetQuantity: decimal(quote.expectedTargetQuantity),
    minimumTargetQuantity: decimal(quote.minimumTargetQuantity),
    costs: quote.costs.map(canonicalCost).sort(compareCanonicalCosts),
    costCoverage: quote.costCoverage,
    quotedAt: quote.quotedAt.toISOString(),
    expiresAt: quote.expiresAt.toISOString(),
    executable: quote.executable,
  };
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

function canonicalIntent(intent: RealExecutionIntent) {
  return {
    id: intent.id,
    idempotencyKey: intent.idempotencyKey,
    kind: intent.kind,
    chainId: intent.chainId,
    sourceAsset: canonicalAsset(intent.sourceAsset),
    targetAsset: canonicalAsset(intent.targetAsset),
    sourceQuantity: decimal(intent.sourceQuantity),
    maxSlippageRate: decimal(intent.maxSlippageRate),
    createdAt: intent.createdAt.toISOString(),
  };
}

function canonicalCost(cost: RealExecutionCost) {
  return {
    kind: cost.kind,
    asset: canonicalAsset(cost.asset),
    quantity: decimal(cost.quantity),
  };
}

function canonicalAsset(asset: RealExecutionAsset) {
  return {
    tokenAddress: asset.tokenAddress.toLowerCase(),
    symbol: asset.symbol,
  };
}

function compareCanonicalCosts(
  left: ReturnType<typeof canonicalCost>,
  right: ReturnType<typeof canonicalCost>,
): number {
  return JSON.stringify(left).localeCompare(JSON.stringify(right));
}

function decimal(value: string): string {
  return new ExactDecimal(value).toFixed();
}

function sameIntent(
  expected: RealExecutionIntent,
  observed: RealExecutionIntent,
): boolean {
  return (
    expected.id === observed.id &&
    expected.idempotencyKey === observed.idempotencyKey &&
    expected.kind === observed.kind &&
    expected.chainId === observed.chainId &&
    sameAsset(expected.sourceAsset, observed.sourceAsset) &&
    sameAsset(expected.targetAsset, observed.targetAsset) &&
    new ExactDecimal(expected.sourceQuantity).equals(observed.sourceQuantity) &&
    new ExactDecimal(expected.maxSlippageRate).equals(
      observed.maxSlippageRate,
    ) &&
    expected.createdAt.getTime() === observed.createdAt.getTime()
  );
}

function sameAsset(
  expected: RealExecutionAsset,
  observed: RealExecutionAsset,
): boolean {
  return (
    expected.tokenAddress.toLowerCase() ===
      observed.tokenAddress.toLowerCase() && expected.symbol === observed.symbol
  );
}

function isApprovedInstrument(intent: RealExecutionIntent): boolean {
  const approved = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
  const source = intent.sourceAsset.tokenAddress.toLowerCase();
  const target = intent.targetAsset.tokenAddress.toLowerCase();
  return (
    intent.chainId === approved.chainId &&
    ((source === approved.usdt.tokenAddress &&
      target === approved.btc.tokenAddress) ||
      (source === approved.btc.tokenAddress &&
        target === approved.usdt.tokenAddress))
  );
}

function isValidIntent(intent: RealExecutionIntent): boolean {
  try {
    validateRealExecutionIntent(intent);
    return true;
  } catch {
    return false;
  }
}

function isValidQuote(quote: RealExecutionQuote): boolean {
  try {
    validateRealExecutionQuote(quote);
    return true;
  } catch {
    return false;
  }
}

function isValidDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function addIf(
  blockers: RealExecutionPayloadCommitmentBlocker[],
  condition: boolean,
  blocker: RealExecutionPayloadCommitmentBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
