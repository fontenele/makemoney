import { createHash } from 'node:crypto';

import { RealExecutionSubmissionOutcome } from '../application/real-execution-submission-outcome.store';
import { assessAgenticWalletMarketSwapSubmissionResponse } from './agentic-wallet-market-swap-submission-response';

export function assessAgenticWalletMarketSwapSubmissionOutcome(
  attemptId: string,
  gateId: string,
  response: unknown,
): RealExecutionSubmissionOutcome {
  const assessment = assessAgenticWalletMarketSwapSubmissionResponse(
    gateId,
    response,
  );
  return {
    attemptId,
    gateId,
    status: assessment.status,
    providerOrderId: assessment.receipt?.providerOrderId ?? null,
    responseFingerprint: createHash('sha256')
      .update(JSON.stringify(canonicalize(response)) ?? 'undefined')
      .digest('hex'),
    blockers: [...assessment.blockers],
    executionSucceeded: false,
    reconciliationRequired: true,
    automaticRetryAllowed: false,
  };
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
