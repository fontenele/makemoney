import { createHash } from 'node:crypto';

import { isSafeAgenticWalletProviderOrderId } from './agentic-wallet-market-swap-submission-response';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export type FundingConversionSubmissionOutcomeStatus =
  'submitted_pending_confirmation' | 'submission_outcome_unknown';

export interface AgenticWalletFundingConversionSubmissionOutcome {
  readonly attemptId: string;
  readonly status: FundingConversionSubmissionOutcomeStatus;
  readonly providerOrderId: string | null;
  readonly responseFingerprint: string;
  readonly executionSucceeded: false;
  readonly statusLookupRequired: true;
  readonly automaticRetryAllowed: false;
}

export function assessAgenticWalletFundingConversionSubmissionResponse(
  attemptId: string,
  response: unknown,
): AgenticWalletFundingConversionSubmissionOutcome {
  if (!UUID_PATTERN.test(attemptId)) {
    throw new Error(
      'Funding conversion submission attempt identity is invalid',
    );
  }
  const envelope = asRecord(response);
  const data = envelope === null ? null : asRecord(envelope.data);
  const providerOrderId =
    envelope?.success === true &&
    data !== null &&
    isSafeAgenticWalletProviderOrderId(data.orderId)
      ? data.orderId
      : null;

  return {
    attemptId,
    status:
      providerOrderId === null
        ? 'submission_outcome_unknown'
        : 'submitted_pending_confirmation',
    providerOrderId,
    responseFingerprint: createHash('sha256')
      .update(JSON.stringify(canonicalize(response)) ?? 'undefined')
      .digest('hex'),
    executionSucceeded: false,
    statusLookupRequired: true,
    automaticRetryAllowed: false,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}
