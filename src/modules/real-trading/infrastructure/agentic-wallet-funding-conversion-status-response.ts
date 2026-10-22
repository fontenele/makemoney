import Decimal from 'decimal.js';

import {
  BSC_NATIVE_BNB_ADDRESS,
  BSC_USDT_ADDRESS,
} from './agentic-wallet-funding-conversion-quote.adapter';
import { isSafeAgenticWalletProviderOrderId } from './agentic-wallet-market-swap-submission-response';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const TX_HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/;

export interface FundingConversionStatusContext {
  readonly attemptId: string;
  readonly providerOrderId: string;
  readonly sourceQuantityBnb: string;
  readonly maximumSlippagePercent: string;
}

export interface FundingConversionStatusObservation {
  readonly attemptId: string;
  readonly providerOrderId: string;
  readonly providerStatus: 'PENDING' | 'FINISHED' | 'FAILED';
  readonly transactionHash: string | null;
  readonly bookedAt: Date;
  readonly providerUpdatedAt: Date;
  readonly terminal: boolean;
  readonly executionSucceeded: boolean;
  readonly financialReconciliationRequired: true;
  readonly financialReconciliationComplete: false;
  readonly automaticRetryAllowed: false;
}

export interface FundingConversionStatusAssessment {
  readonly status: 'pending' | 'finished' | 'failed' | 'invalid';
  readonly blockers: readonly string[];
  readonly observation: FundingConversionStatusObservation | null;
}

export function assessAgenticWalletFundingConversionStatusResponse(
  context: FundingConversionStatusContext,
  response: unknown,
): FundingConversionStatusAssessment {
  const blockers: string[] = [];
  if (!validContext(context)) blockers.push('invalid_status_context');
  const envelope = asRecord(response);
  if (envelope === null || envelope.success !== true) {
    blockers.push('invalid_response_envelope');
  }
  const data = envelope?.success === true ? asRecord(envelope.data) : null;
  const rows = data !== null && Array.isArray(data.list) ? data.list : null;
  const row = rows?.length === 1 ? asRecord(rows[0]) : null;
  if (
    data === null ||
    data.total !== 1 ||
    data.page !== 1 ||
    !Number.isInteger(data.pageSize) ||
    row === null
  ) {
    blockers.push('invalid_order_lookup_payload');
  }

  const providerStatus = parseStatus(row?.status);
  const bookedAt = parseDate(row?.bookTime);
  const providerUpdatedAt = parseDate(row?.updatedTime);
  const transactionHash =
    typeof row?.txHash === 'string' && TX_HASH_PATTERN.test(row.txHash)
      ? row.txHash.toLowerCase()
      : null;
  if (row !== null && validContext(context)) {
    if (row.orderType !== 'market' || row.orderId !== context.providerOrderId)
      blockers.push('order_identity_mismatch');
    if (!matchesPayload(row, context)) blockers.push('order_payload_mismatch');
    if (providerStatus === null) blockers.push('invalid_order_status');
    if (
      bookedAt === null ||
      providerUpdatedAt === null ||
      providerUpdatedAt.getTime() < bookedAt.getTime()
    )
      blockers.push('invalid_order_timestamps');
    if (
      (row.txHash !== null && transactionHash === null) ||
      (providerStatus === 'FINISHED' && transactionHash === null)
    )
      blockers.push('invalid_transaction_hash');
  }

  const observation =
    blockers.length === 0 &&
    providerStatus !== null &&
    bookedAt !== null &&
    providerUpdatedAt !== null
      ? {
          attemptId: context.attemptId,
          providerOrderId: context.providerOrderId,
          providerStatus,
          transactionHash,
          bookedAt,
          providerUpdatedAt,
          terminal: providerStatus !== 'PENDING',
          executionSucceeded: providerStatus === 'FINISHED',
          financialReconciliationRequired: true as const,
          financialReconciliationComplete: false as const,
          automaticRetryAllowed: false as const,
        }
      : null;
  return {
    status:
      observation === null
        ? 'invalid'
        : (observation.providerStatus.toLowerCase() as
            'pending' | 'finished' | 'failed'),
    blockers,
    observation,
  };
}

function validContext(value: FundingConversionStatusContext): boolean {
  return (
    UUID_PATTERN.test(value.attemptId) &&
    isSafeAgenticWalletProviderOrderId(value.providerOrderId) &&
    DECIMAL_PATTERN.test(value.sourceQuantityBnb) &&
    DECIMAL_PATTERN.test(value.maximumSlippagePercent)
  );
}

function matchesPayload(
  row: Record<string, unknown>,
  context: FundingConversionStatusContext,
): boolean {
  return (
    row.chain === '56' &&
    lower(row.fromToken) === BSC_NATIVE_BNB_ADDRESS.toLowerCase() &&
    lower(row.toToken) === BSC_USDT_ADDRESS.toLowerCase() &&
    row.fromTokenName === 'BNB' &&
    row.toTokenName === 'USDT' &&
    decimalEquals(row.fromTokenQty, context.sourceQuantityBnb) &&
    decimalEquals(row.slippage, context.maximumSlippagePercent)
  );
}

function decimalEquals(value: unknown, expected: string): boolean {
  return (
    typeof value === 'string' &&
    DECIMAL_PATTERN.test(value) &&
    new Decimal(value).equals(expected)
  );
}

function parseStatus(
  value: unknown,
): FundingConversionStatusObservation['providerStatus'] | null {
  return value === 'PENDING' || value === 'FINISHED' || value === 'FAILED'
    ? value
    : null;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const result = new Date(value);
  return Number.isFinite(result.getTime()) ? result : null;
}

function lower(value: unknown): string | null {
  return typeof value === 'string' ? value.toLowerCase() : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
