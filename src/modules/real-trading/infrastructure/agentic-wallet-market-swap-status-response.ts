import Decimal from 'decimal.js';

import { StoredRealExecutionSubmissionGate } from '../application/real-execution-submission-gate-store';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from '../application/real-execution-instrument-approval';
import { isStructurallyValidAgenticWalletMarketSwapGate } from './agentic-wallet-market-swap-command';
import {
  AgenticWalletMarketSwapSubmissionReceipt,
  isSafeAgenticWalletProviderOrderId,
  isValidAgenticWalletMarketSwapSubmissionReceipt,
} from './agentic-wallet-market-swap-submission-response';

const ExactDecimal = Decimal.clone({
  precision: 80,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -80,
  toExpPos: 80,
});
const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
const EVM_TRANSACTION_HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/;
const CANONICAL_EVM_TRANSACTION_HASH_PATTERN = /^0x[a-f0-9]{64}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export type AgenticWalletMarketSwapProviderStatus =
  'PENDING' | 'FINISHED' | 'FAILED';

export type AgenticWalletMarketSwapStatusResponseBlocker =
  | 'invalid_submission_gate'
  | 'invalid_submission_receipt'
  | 'gate_receipt_mismatch'
  | 'invalid_response_envelope'
  | 'provider_reported_failure'
  | 'invalid_order_lookup_payload'
  | 'order_identity_mismatch'
  | 'order_payload_mismatch'
  | 'invalid_order_status'
  | 'invalid_order_timestamps'
  | 'invalid_transaction_hash';

export const AGENTIC_WALLET_MARKET_SWAP_STATUS_RESPONSE_BLOCKER_ORDER = [
  'invalid_submission_gate',
  'invalid_submission_receipt',
  'gate_receipt_mismatch',
  'invalid_response_envelope',
  'provider_reported_failure',
  'invalid_order_lookup_payload',
  'order_identity_mismatch',
  'order_payload_mismatch',
  'invalid_order_status',
  'invalid_order_timestamps',
  'invalid_transaction_hash',
] as const satisfies readonly AgenticWalletMarketSwapStatusResponseBlocker[];

export interface AgenticWalletMarketSwapStatusObservation {
  readonly kind: 'agentic_wallet_market_swap_status_observation';
  readonly providerId: 'agentic_wallet';
  readonly gateId: string;
  readonly providerOrderId: string;
  readonly providerStatus: AgenticWalletMarketSwapProviderStatus;
  readonly transactionHash: string | null;
  readonly bookedAt: Date;
  readonly updatedAt: Date;
  readonly terminal: boolean;
  readonly executionSucceeded: boolean;
  readonly statusLookupRequired: boolean;
  readonly financialReconciliationRequired: true;
  readonly financialReconciliationComplete: false;
  readonly actualReceivedQuantity: null;
  readonly submissionRetryAllowed: false;
}

export interface AgenticWalletMarketSwapStatusResponseAssessment {
  readonly scope: 'agentic_wallet_market_swap_status_response';
  readonly status:
    'pending' | 'finished' | 'failed' | 'status_response_invalid';
  readonly blockers: readonly AgenticWalletMarketSwapStatusResponseBlocker[];
  readonly observation: AgenticWalletMarketSwapStatusObservation | null;
  readonly financialReconciliationRequired: true;
  readonly submissionRetryAllowed: false;
}

export function assessAgenticWalletMarketSwapStatusResponse(
  gate: StoredRealExecutionSubmissionGate,
  receipt: AgenticWalletMarketSwapSubmissionReceipt,
  response: unknown,
): AgenticWalletMarketSwapStatusResponseAssessment {
  const blockers: AgenticWalletMarketSwapStatusResponseBlocker[] = [];
  const gateValid = isStructurallyValidAgenticWalletMarketSwapGate(gate);
  const receiptValid = isValidAgenticWalletMarketSwapSubmissionReceipt(receipt);
  addIf(blockers, !gateValid, 'invalid_submission_gate');
  addIf(blockers, !receiptValid, 'invalid_submission_receipt');
  addIf(
    blockers,
    gateValid && receiptValid && gate.id !== receipt.gateId,
    'gate_receipt_mismatch',
  );

  const envelope = asRecord(response);
  if (
    envelope === null ||
    typeof envelope.success !== 'boolean' ||
    !('data' in envelope)
  ) {
    addIf(blockers, true, 'invalid_response_envelope');
  } else if (!envelope.success) {
    addIf(blockers, true, 'provider_reported_failure');
  }

  const data = envelope?.success === true ? asRecord(envelope.data) : null;
  const rows = data === null || !Array.isArray(data.list) ? null : data.list;
  const row = rows?.length === 1 ? asRecord(rows[0]) : null;
  if (
    envelope?.success === true &&
    (data === null ||
      data.total !== 1 ||
      data.page !== 1 ||
      !isValidPageSize(data.pageSize) ||
      rows === null ||
      row === null)
  ) {
    addIf(blockers, true, 'invalid_order_lookup_payload');
  }

  let providerStatus: AgenticWalletMarketSwapProviderStatus | null = null;
  let bookedAt: Date | null = null;
  let updatedAt: Date | null = null;
  let transactionHash: string | null = null;

  if (row !== null && gateValid && receiptValid) {
    addIf(
      blockers,
      row.orderType !== 'market' || row.orderId !== receipt.providerOrderId,
      'order_identity_mismatch',
    );
    addIf(blockers, !matchesGatePayload(row, gate), 'order_payload_mismatch');

    providerStatus = parseProviderStatus(row.status);
    addIf(blockers, providerStatus === null, 'invalid_order_status');

    bookedAt = parseTimestamp(row.bookTime);
    updatedAt = parseTimestamp(row.updatedTime);
    addIf(
      blockers,
      bookedAt === null ||
        updatedAt === null ||
        updatedAt.getTime() < bookedAt.getTime(),
      'invalid_order_timestamps',
    );

    const hashValid =
      row.txHash === null ||
      (typeof row.txHash === 'string' &&
        EVM_TRANSACTION_HASH_PATTERN.test(row.txHash));
    addIf(
      blockers,
      !hashValid || (providerStatus === 'FINISHED' && row.txHash === null),
      'invalid_transaction_hash',
    );
    if (hashValid && typeof row.txHash === 'string') {
      transactionHash = row.txHash.toLowerCase();
    }
  }

  const observation =
    blockers.length === 0 &&
    providerStatus !== null &&
    bookedAt !== null &&
    updatedAt !== null
      ? {
          kind: 'agentic_wallet_market_swap_status_observation' as const,
          providerId: 'agentic_wallet' as const,
          gateId: gate.id,
          providerOrderId: receipt.providerOrderId,
          providerStatus,
          transactionHash,
          bookedAt,
          updatedAt,
          terminal: providerStatus !== 'PENDING',
          executionSucceeded: providerStatus === 'FINISHED',
          statusLookupRequired: providerStatus === 'PENDING',
          financialReconciliationRequired: true as const,
          financialReconciliationComplete: false as const,
          actualReceivedQuantity: null,
          submissionRetryAllowed: false as const,
        }
      : null;

  return {
    scope: 'agentic_wallet_market_swap_status_response',
    status:
      observation === null
        ? 'status_response_invalid'
        : (observation.providerStatus.toLowerCase() as
            'pending' | 'finished' | 'failed'),
    blockers,
    observation,
    financialReconciliationRequired: true,
    submissionRetryAllowed: false,
  };
}

export function isValidAgenticWalletMarketSwapStatusObservation(
  value: unknown,
): value is AgenticWalletMarketSwapStatusObservation {
  const observation = asRecord(value);
  if (observation === null) return false;

  const providerStatus = parseProviderStatus(observation.providerStatus);
  const bookedAt = observation.bookedAt;
  const updatedAt = observation.updatedAt;
  const transactionHash = observation.transactionHash;
  const transactionHashValid =
    transactionHash === null ||
    (typeof transactionHash === 'string' &&
      CANONICAL_EVM_TRANSACTION_HASH_PATTERN.test(transactionHash));

  return (
    observation.kind === 'agentic_wallet_market_swap_status_observation' &&
    observation.providerId === 'agentic_wallet' &&
    typeof observation.gateId === 'string' &&
    UUID_PATTERN.test(observation.gateId) &&
    isSafeAgenticWalletProviderOrderId(observation.providerOrderId) &&
    providerStatus !== null &&
    transactionHashValid &&
    (providerStatus !== 'FINISHED' || transactionHash !== null) &&
    bookedAt instanceof Date &&
    Number.isFinite(bookedAt.getTime()) &&
    updatedAt instanceof Date &&
    Number.isFinite(updatedAt.getTime()) &&
    updatedAt.getTime() >= bookedAt.getTime() &&
    observation.terminal === (providerStatus !== 'PENDING') &&
    observation.executionSucceeded === (providerStatus === 'FINISHED') &&
    observation.statusLookupRequired === (providerStatus === 'PENDING') &&
    observation.financialReconciliationRequired === true &&
    observation.financialReconciliationComplete === false &&
    observation.actualReceivedQuantity === null &&
    observation.submissionRetryAllowed === false
  );
}

function matchesGatePayload(
  row: Record<string, unknown>,
  gate: StoredRealExecutionSubmissionGate,
): boolean {
  const approved = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
  const sourceIsUsdt = gate.sourceTokenAddress === approved.usdt.tokenAddress;
  return (
    row.chain === gate.chainId &&
    normalizedAddress(row.fromToken) === gate.sourceTokenAddress &&
    normalizedAddress(row.toToken) === gate.targetTokenAddress &&
    row.fromTokenName === (sourceIsUsdt ? 'USDT' : 'BTCB') &&
    row.toTokenName === (sourceIsUsdt ? 'BTCB' : 'USDT') &&
    decimalEquals(row.fromTokenQty, gate.sourceQuantity) &&
    decimalEquals(row.slippage, gate.maximumSlippagePercent)
  );
}

function decimalEquals(value: unknown, expected: string): boolean {
  if (typeof value !== 'string' || !DECIMAL_PATTERN.test(value)) return false;
  try {
    return new ExactDecimal(value).equals(expected);
  } catch {
    return false;
  }
}

function normalizedAddress(value: unknown): string | null {
  return typeof value === 'string' ? value.toLowerCase() : null;
}

function parseProviderStatus(
  value: unknown,
): AgenticWalletMarketSwapProviderStatus | null {
  return value === 'PENDING' || value === 'FINISHED' || value === 'FAILED'
    ? value
    : null;
}

function parseTimestamp(value: unknown): Date | null {
  if (typeof value !== 'string' || !ISO_TIMESTAMP_PATTERN.test(value)) {
    return null;
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function isValidPageSize(value: unknown): boolean {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 100;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function addIf(
  blockers: AgenticWalletMarketSwapStatusResponseBlocker[],
  condition: boolean,
  blocker: AgenticWalletMarketSwapStatusResponseBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
