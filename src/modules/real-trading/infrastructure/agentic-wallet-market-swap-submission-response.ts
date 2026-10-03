const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const PROVIDER_ORDER_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;

export type AgenticWalletMarketSwapSubmissionResponseBlocker =
  | 'invalid_gate_id'
  | 'invalid_response_envelope'
  | 'provider_reported_failure'
  | 'invalid_provider_order_id';

export interface AgenticWalletMarketSwapSubmissionReceipt {
  readonly kind: 'agentic_wallet_market_swap_submission_receipt';
  readonly providerId: 'agentic_wallet';
  readonly gateId: string;
  readonly providerOrderId: string;
  readonly lifecycleStatus: 'pending_confirmation';
  readonly providerSubmissionAcknowledged: true;
  readonly terminal: false;
  readonly executionSucceeded: false;
  readonly statusLookupRequired: true;
  readonly automaticRetryAllowed: false;
}

export interface AgenticWalletMarketSwapSubmissionResponseAssessment {
  readonly scope: 'agentic_wallet_market_swap_submission_response';
  readonly status:
    'submitted_pending_confirmation' | 'submission_outcome_unknown';
  readonly blockers: readonly AgenticWalletMarketSwapSubmissionResponseBlocker[];
  readonly receipt: AgenticWalletMarketSwapSubmissionReceipt | null;
  readonly executionSucceeded: false;
  readonly reconciliationRequired: true;
  readonly automaticRetryAllowed: false;
}

export function assessAgenticWalletMarketSwapSubmissionResponse(
  gateId: string,
  response: unknown,
): AgenticWalletMarketSwapSubmissionResponseAssessment {
  const blockers: AgenticWalletMarketSwapSubmissionResponseBlocker[] = [];
  if (typeof gateId !== 'string' || !UUID_PATTERN.test(gateId)) {
    blockers.push('invalid_gate_id');
  }

  const envelope = asRecord(response);
  if (
    envelope === null ||
    !('success' in envelope) ||
    !('data' in envelope) ||
    typeof envelope.success !== 'boolean'
  ) {
    blockers.push('invalid_response_envelope');
  } else if (!envelope.success) {
    blockers.push('provider_reported_failure');
  }

  const data = envelope === null ? null : asRecord(envelope.data);
  if (
    envelope !== null &&
    envelope.success === true &&
    (data === null ||
      typeof data.orderId !== 'string' ||
      !isSafeAgenticWalletProviderOrderId(data.orderId))
  ) {
    blockers.push('invalid_provider_order_id');
  }

  const receipt =
    blockers.length === 0 && data !== null && typeof data.orderId === 'string'
      ? {
          kind: 'agentic_wallet_market_swap_submission_receipt' as const,
          providerId: 'agentic_wallet' as const,
          gateId,
          providerOrderId: data.orderId,
          lifecycleStatus: 'pending_confirmation' as const,
          providerSubmissionAcknowledged: true as const,
          terminal: false as const,
          executionSucceeded: false as const,
          statusLookupRequired: true as const,
          automaticRetryAllowed: false as const,
        }
      : null;

  return {
    scope: 'agentic_wallet_market_swap_submission_response',
    status:
      receipt === null
        ? 'submission_outcome_unknown'
        : 'submitted_pending_confirmation',
    blockers,
    receipt,
    executionSucceeded: false,
    reconciliationRequired: true,
    automaticRetryAllowed: false,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function isSafeAgenticWalletProviderOrderId(
  value: unknown,
): value is string {
  return typeof value === 'string' && PROVIDER_ORDER_ID_PATTERN.test(value);
}
