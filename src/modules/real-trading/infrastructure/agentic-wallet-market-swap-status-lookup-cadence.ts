import { AgenticWalletMarketSwapReconciliationState } from './agentic-wallet-market-swap-reconciliation-state.store';
import {
  AgenticWalletMarketSwapStatusLookupDecision,
  decideAgenticWalletMarketSwapStatusLookup,
} from './agentic-wallet-market-swap-status-lookup-decision';

export const MINIMUM_STATUS_LOOKUP_INTERVAL_MS = 1_000;
export const MAXIMUM_STATUS_LOOKUP_INTERVAL_MS = 3_600_000;

export type AgenticWalletMarketSwapStatusLookupCadenceBlocker =
  | 'invalid_reconciliation_state'
  | 'invalid_evaluation_time'
  | 'invalid_minimum_lookup_interval';

export interface AgenticWalletMarketSwapStatusLookupCadenceDecision {
  readonly scope: 'agentic_wallet_market_swap_status_lookup_cadence_decision';
  readonly status:
    | 'status_command_preview_ready'
    | 'status_lookup_deferred'
    | 'status_lookup_not_required'
    | 'blocked';
  readonly blockers: readonly AgenticWalletMarketSwapStatusLookupCadenceBlocker[];
  readonly command: AgenticWalletMarketSwapStatusLookupDecision['command'];
  readonly evaluatedAt: Date | null;
  readonly minimumLookupIntervalMs: number | null;
  readonly nextStatusLookupAt: Date | null;
  readonly statusLookupRequired: boolean;
  readonly providerCallStarted: false;
  readonly financialReconciliationRequired: true;
  readonly financialReconciliationComplete: false;
  readonly submissionRetryAllowed: false;
}

export function decideAgenticWalletMarketSwapStatusLookupCadence(
  state: AgenticWalletMarketSwapReconciliationState,
  evaluatedAt: Date,
  minimumLookupIntervalMs: number,
): AgenticWalletMarketSwapStatusLookupCadenceDecision {
  const lookup = decideAgenticWalletMarketSwapStatusLookup(state);
  if (lookup.status === 'blocked') {
    return result('blocked', ['invalid_reconciliation_state']);
  }
  if (lookup.status === 'status_lookup_not_required') {
    return result('status_lookup_not_required', [], null, null, null, false);
  }
  if (!isValidMinimumInterval(minimumLookupIntervalMs)) {
    return result('blocked', ['invalid_minimum_lookup_interval']);
  }
  if (!isValidEvaluationTime(evaluatedAt, state)) {
    return result('blocked', ['invalid_evaluation_time']);
  }

  const evaluatedAtCopy = new Date(evaluatedAt);
  if (state.phase === 'awaiting_status_observation') {
    return result(
      'status_command_preview_ready',
      [],
      lookup.command,
      evaluatedAtCopy,
      minimumLookupIntervalMs,
      true,
    );
  }

  const latestObservationRecordedAt = state.latestObservationRecordedAt;
  if (latestObservationRecordedAt === null) {
    return result('blocked', ['invalid_reconciliation_state']);
  }
  const nextLookupTime =
    latestObservationRecordedAt.getTime() + minimumLookupIntervalMs;
  if (!Number.isSafeInteger(nextLookupTime)) {
    return result('blocked', ['invalid_evaluation_time']);
  }
  const nextStatusLookupAt = new Date(nextLookupTime);
  if (!Number.isFinite(nextStatusLookupAt.getTime())) {
    return result('blocked', ['invalid_evaluation_time']);
  }
  if (evaluatedAtCopy.getTime() < nextLookupTime) {
    return result(
      'status_lookup_deferred',
      [],
      null,
      evaluatedAtCopy,
      minimumLookupIntervalMs,
      true,
      nextStatusLookupAt,
    );
  }
  return result(
    'status_command_preview_ready',
    [],
    lookup.command,
    evaluatedAtCopy,
    minimumLookupIntervalMs,
    true,
    nextStatusLookupAt,
  );
}

function isValidMinimumInterval(value: number): boolean {
  return (
    Number.isSafeInteger(value) &&
    value >= MINIMUM_STATUS_LOOKUP_INTERVAL_MS &&
    value <= MAXIMUM_STATUS_LOOKUP_INTERVAL_MS
  );
}

function isValidEvaluationTime(
  evaluatedAt: Date,
  state: AgenticWalletMarketSwapReconciliationState,
): boolean {
  if (
    !(evaluatedAt instanceof Date) ||
    !Number.isFinite(evaluatedAt.getTime()) ||
    evaluatedAt.getTime() < state.receiptRecordedAt.getTime()
  ) {
    return false;
  }
  return (
    state.latestObservationRecordedAt === null ||
    evaluatedAt.getTime() >= state.latestObservationRecordedAt.getTime()
  );
}

function result(
  status: AgenticWalletMarketSwapStatusLookupCadenceDecision['status'],
  blockers: readonly AgenticWalletMarketSwapStatusLookupCadenceBlocker[],
  command: AgenticWalletMarketSwapStatusLookupDecision['command'] = null,
  evaluatedAt: Date | null = null,
  minimumLookupIntervalMs: number | null = null,
  statusLookupRequired = false,
  nextStatusLookupAt: Date | null = null,
): AgenticWalletMarketSwapStatusLookupCadenceDecision {
  return {
    scope: 'agentic_wallet_market_swap_status_lookup_cadence_decision',
    status,
    blockers,
    command,
    evaluatedAt,
    minimumLookupIntervalMs,
    nextStatusLookupAt,
    statusLookupRequired,
    providerCallStarted: false,
    financialReconciliationRequired: true,
    financialReconciliationComplete: false,
    submissionRetryAllowed: false,
  };
}
