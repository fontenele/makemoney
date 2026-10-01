import {
  RealExecutionIntent,
  validateRealExecutionIntent,
} from '../domain/real-execution';
import {
  evaluateRealExecutionInstrumentReview,
  RealExecutionInstrumentReviewEvidence,
} from './real-execution-instrument-review';

const APPROVED_BSC_BTCB_ADDRESS = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';
const APPROVED_BSC_USDT_ADDRESS = '0x55d398326f99059ff775485246999027b3197955';

export const APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT = {
  scope: 'agentic_wallet_bsc_btcb_usdt_candidate',
  providerId: 'agentic_wallet',
  chainId: '56',
  btc: {
    economicAsset: 'BTC',
    symbol: 'BTCB',
    tokenAddress: APPROVED_BSC_BTCB_ADDRESS,
    representation: 'binance_peg_btc',
  },
  usdt: {
    economicAsset: 'USDT',
    symbol: 'USDT',
    tokenAddress: APPROVED_BSC_USDT_ADDRESS,
    representation: 'bsc_usdt',
  },
  decision: 'approved_candidate',
  approvedBy: 'project_owner',
  approvedAt: new Date('2026-10-01T02:27:00.000Z'),
} as const satisfies RealExecutionInstrumentApproval;

export interface RealExecutionApprovedToken {
  readonly economicAsset: 'BTC' | 'USDT';
  readonly symbol: 'BTCB' | 'USDT';
  readonly tokenAddress: string;
  readonly representation: 'binance_peg_btc' | 'bsc_usdt';
}

export interface RealExecutionInstrumentApproval {
  readonly scope: 'agentic_wallet_bsc_btcb_usdt_candidate';
  readonly providerId: 'agentic_wallet';
  readonly chainId: '56';
  readonly btc: RealExecutionApprovedToken;
  readonly usdt: RealExecutionApprovedToken;
  readonly decision: 'approved_candidate';
  readonly approvedBy: 'project_owner';
  readonly approvedAt: Date;
}

export type RealExecutionInstrumentApprovalBlocker =
  | 'invalid_intent'
  | 'invalid_approval'
  | 'compatibility_review_blocked'
  | 'chain_not_approved'
  | 'source_token_not_approved'
  | 'target_token_not_approved'
  | 'economic_direction_not_approved'
  | 'approval_from_future';

export interface RealExecutionInstrumentApprovalAssessment {
  readonly scope: 'instrument_candidate_approval';
  readonly status: 'instrument_approved' | 'blocked';
  readonly blockers: readonly RealExecutionInstrumentApprovalBlocker[];
  readonly instrumentApproved: boolean;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
  readonly evaluatedAt: Date;
}

export function evaluateRealExecutionInstrumentApproval(
  intent: RealExecutionIntent,
  evidence: RealExecutionInstrumentReviewEvidence,
  approval: RealExecutionInstrumentApproval,
  evaluatedAt: Date,
): RealExecutionInstrumentApprovalAssessment {
  validateEvaluationTime(evaluatedAt);
  const blockers: RealExecutionInstrumentApprovalBlocker[] = [];

  try {
    validateRealExecutionIntent(intent);
  } catch {
    blockers.push('invalid_intent');
  }

  if (!isValidApproval(approval)) blockers.push('invalid_approval');

  const review = evaluateRealExecutionInstrumentReview(
    intent,
    evidence,
    evaluatedAt,
  );
  if (review.status !== 'review_ready') {
    blockers.push('compatibility_review_blocked');
  }

  if (!blockers.includes('invalid_intent') && isValidApproval(approval)) {
    addIf(blockers, intent.chainId !== approval.chainId, 'chain_not_approved');

    const expectedSource =
      evidence.strategyAction === 'buy' ? approval.usdt : approval.btc;
    const expectedTarget =
      evidence.strategyAction === 'buy' ? approval.btc : approval.usdt;

    addIf(
      blockers,
      normalizeAddress(intent.sourceAsset.tokenAddress) !==
        normalizeAddress(expectedSource.tokenAddress),
      'source_token_not_approved',
    );
    addIf(
      blockers,
      normalizeAddress(intent.targetAsset.tokenAddress) !==
        normalizeAddress(expectedTarget.tokenAddress),
      'target_token_not_approved',
    );
    addIf(
      blockers,
      evidence.sourceEconomicAsset !== expectedSource.economicAsset ||
        evidence.targetEconomicAsset !== expectedTarget.economicAsset,
      'economic_direction_not_approved',
    );
    addIf(
      blockers,
      approval.approvedAt.getTime() > evaluatedAt.getTime(),
      'approval_from_future',
    );
  }

  const instrumentApproved = blockers.length === 0;
  return {
    scope: 'instrument_candidate_approval',
    status: instrumentApproved ? 'instrument_approved' : 'blocked',
    blockers,
    instrumentApproved,
    quoteAuthorized: false,
    submissionAuthorized: false,
    evaluatedAt: new Date(evaluatedAt),
  };
}

function isValidApproval(approval: RealExecutionInstrumentApproval): boolean {
  try {
    return (
      approval.scope === 'agentic_wallet_bsc_btcb_usdt_candidate' &&
      approval.providerId === 'agentic_wallet' &&
      approval.chainId === '56' &&
      approval.decision === 'approved_candidate' &&
      approval.approvedBy === 'project_owner' &&
      approval.btc.economicAsset === 'BTC' &&
      approval.btc.symbol === 'BTCB' &&
      approval.btc.representation === 'binance_peg_btc' &&
      isEvmAddress(approval.btc.tokenAddress) &&
      normalizeAddress(approval.btc.tokenAddress) ===
        APPROVED_BSC_BTCB_ADDRESS &&
      approval.usdt.economicAsset === 'USDT' &&
      approval.usdt.symbol === 'USDT' &&
      approval.usdt.representation === 'bsc_usdt' &&
      isEvmAddress(approval.usdt.tokenAddress) &&
      normalizeAddress(approval.usdt.tokenAddress) ===
        APPROVED_BSC_USDT_ADDRESS &&
      normalizeAddress(approval.btc.tokenAddress) !==
        normalizeAddress(approval.usdt.tokenAddress) &&
      approval.approvedAt instanceof Date &&
      Number.isFinite(approval.approvedAt.getTime())
    );
  } catch {
    return false;
  }
}

function isEvmAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function normalizeAddress(value: string): string {
  return value.toLowerCase();
}

function validateEvaluationTime(evaluatedAt: Date): void {
  if (
    !(evaluatedAt instanceof Date) ||
    !Number.isFinite(evaluatedAt.getTime())
  ) {
    throw new Error('Real execution instrument approval time must be valid');
  }
}

function addIf(
  blockers: RealExecutionInstrumentApprovalBlocker[],
  condition: boolean,
  blocker: RealExecutionInstrumentApprovalBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
