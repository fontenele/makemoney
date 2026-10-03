import Decimal from 'decimal.js';

import { StoredRealExecutionSubmissionGate } from '../application/real-execution-submission-gate-store';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from '../application/real-execution-instrument-approval';

const ExactDecimal = Decimal.clone({
  precision: 80,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -80,
  toExpPos: 80,
});
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const CHANGE_ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const CANONICAL_DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d*[1-9])?$/;

export type AgenticWalletMarketSwapCommandBlocker =
  | 'invalid_submission_gate'
  | 'invalid_evaluation_time'
  | 'submission_gate_from_future'
  | 'submission_gate_expired';

export interface AgenticWalletMarketSwapCommandPreview {
  readonly kind: 'agentic_wallet_market_order_swap_command_preview';
  readonly gateId: string;
  readonly arguments: readonly string[];
  readonly executable: false;
  readonly automaticRetryAllowed: false;
  readonly providerSubmissionStarted: false;
  readonly submissionAuthorized: false;
}

export interface AgenticWalletMarketSwapCommandAssessment {
  readonly scope: 'agentic_wallet_market_swap_command';
  readonly status: 'command_preview_ready' | 'blocked';
  readonly blockers: readonly AgenticWalletMarketSwapCommandBlocker[];
  readonly command: AgenticWalletMarketSwapCommandPreview | null;
  readonly evaluatedAt: Date;
}

export function prepareAgenticWalletMarketSwapCommand(
  gate: StoredRealExecutionSubmissionGate,
  evaluatedAt: Date,
): AgenticWalletMarketSwapCommandAssessment {
  const blockers: AgenticWalletMarketSwapCommandBlocker[] = [];
  const gateValid = isValidGate(gate);
  const evaluationTimeValid = isValidDate(evaluatedAt);
  addIf(blockers, !gateValid, 'invalid_submission_gate');
  addIf(blockers, !evaluationTimeValid, 'invalid_evaluation_time');

  if (gateValid && evaluationTimeValid) {
    addIf(
      blockers,
      gate.createdAt.getTime() > evaluatedAt.getTime(),
      'submission_gate_from_future',
    );
    addIf(
      blockers,
      gate.expiresAt.getTime() <= evaluatedAt.getTime(),
      'submission_gate_expired',
    );
  }

  const command =
    blockers.length === 0
      ? {
          kind: 'agentic_wallet_market_order_swap_command_preview' as const,
          gateId: gate.id,
          arguments: [
            'market-order',
            'swap',
            '--fromTokenQty',
            gate.sourceQuantity,
            '--fromToken',
            gate.sourceTokenAddress,
            '--toToken',
            gate.targetTokenAddress,
            '--binanceChainId',
            gate.chainId,
            '--slippage',
            gate.maximumSlippagePercent,
            '--mev',
            'true',
            '--gasLevel',
            'MEDIUM',
            '--json',
          ] as const,
          executable: false as const,
          automaticRetryAllowed: false as const,
          providerSubmissionStarted: false as const,
          submissionAuthorized: false as const,
        }
      : null;

  return {
    scope: 'agentic_wallet_market_swap_command',
    status: command === null ? 'blocked' : 'command_preview_ready',
    blockers,
    command,
    evaluatedAt: new Date(evaluatedAt),
  };
}

function isValidGate(gate: StoredRealExecutionSubmissionGate): boolean {
  if (typeof gate !== 'object' || gate === null) return false;
  const approved = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
  const source = gate.sourceTokenAddress;
  const target = gate.targetTokenAddress;
  const approvedDirection =
    (source === approved.usdt.tokenAddress &&
      target === approved.btc.tokenAddress) ||
    (source === approved.btc.tokenAddress &&
      target === approved.usdt.tokenAddress);
  return (
    UUID_PATTERN.test(gate.id) &&
    UUID_PATTERN.test(gate.confirmationId) &&
    UUID_PATTERN.test(gate.approvalId) &&
    UUID_PATTERN.test(gate.reservationId) &&
    UUID_PATTERN.test(gate.armId) &&
    UUID_PATTERN.test(gate.submissionPlanId) &&
    gate.providerId === approved.providerId &&
    gate.chainId === approved.chainId &&
    UUID_PATTERN.test(gate.intentId) &&
    UUID_PATTERN.test(gate.quoteId) &&
    gate.payloadCommitmentVersion === 'real_execution_intent_quote_v1' &&
    DIGEST_PATTERN.test(gate.payloadCommitmentDigest) &&
    CHANGE_ID_PATTERN.test(gate.emergencyStopChangeId) &&
    approvedDirection &&
    isCanonicalPositiveDecimal(gate.sourceQuantity) &&
    isCanonicalRatePercent(gate.maximumSlippagePercent) &&
    gate.mevProtection === true &&
    gate.gasLevel === 'MEDIUM' &&
    gate.status === 'prepared_not_submitted' &&
    isValidDate(gate.emergencyStopRecheckedAt) &&
    isValidDate(gate.confirmationConsumedAt) &&
    isValidDate(gate.expiresAt) &&
    isValidDate(gate.createdAt) &&
    gate.emergencyStopRecheckedAt.getTime() ===
      gate.confirmationConsumedAt.getTime() &&
    gate.confirmationConsumedAt.getTime() <= gate.createdAt.getTime() &&
    gate.createdAt.getTime() < gate.expiresAt.getTime() &&
    gate.atomicGateSatisfied === true &&
    gate.confirmationConsumed === true &&
    gate.providerSubmissionStarted === false &&
    gate.submissionAuthorized === false
  );
}

function isCanonicalPositiveDecimal(value: string): boolean {
  return (
    typeof value === 'string' &&
    CANONICAL_DECIMAL_PATTERN.test(value) &&
    new ExactDecimal(value).greaterThan(0) &&
    new ExactDecimal(value).toFixed() === value
  );
}

function isCanonicalRatePercent(value: string): boolean {
  return (
    typeof value === 'string' &&
    CANONICAL_DECIMAL_PATTERN.test(value) &&
    new ExactDecimal(value).greaterThanOrEqualTo(0) &&
    new ExactDecimal(value).lessThanOrEqualTo(100) &&
    new ExactDecimal(value).toFixed() === value
  );
}

function isValidDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function addIf(
  blockers: AgenticWalletMarketSwapCommandBlocker[],
  condition: boolean,
  blocker: AgenticWalletMarketSwapCommandBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
