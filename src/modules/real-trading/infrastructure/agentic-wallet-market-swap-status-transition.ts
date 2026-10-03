import {
  AgenticWalletMarketSwapStatusObservation,
  isValidAgenticWalletMarketSwapStatusObservation,
} from './agentic-wallet-market-swap-status-response';

export type AgenticWalletMarketSwapStatusTransitionBlocker =
  | 'invalid_previous_observation'
  | 'invalid_next_observation'
  | 'observation_identity_mismatch'
  | 'booked_at_changed'
  | 'updated_at_regressed'
  | 'terminal_status_changed'
  | 'transaction_hash_changed';

export interface AgenticWalletMarketSwapStatusTransitionAssessment {
  readonly scope: 'agentic_wallet_market_swap_status_transition';
  readonly status:
    | 'initial_observation_accepted'
    | 'observation_advanced'
    | 'observation_replayed'
    | 'blocked';
  readonly blockers: readonly AgenticWalletMarketSwapStatusTransitionBlocker[];
  readonly acceptedObservation: AgenticWalletMarketSwapStatusObservation | null;
  readonly persistenceRequired: boolean;
  readonly statusLookupRequired: boolean;
  readonly financialReconciliationRequired: true;
  readonly financialReconciliationComplete: false;
  readonly submissionRetryAllowed: false;
}

export function assessAgenticWalletMarketSwapStatusTransition(
  previous: AgenticWalletMarketSwapStatusObservation | null,
  next: AgenticWalletMarketSwapStatusObservation,
): AgenticWalletMarketSwapStatusTransitionAssessment {
  const blockers: AgenticWalletMarketSwapStatusTransitionBlocker[] = [];
  const previousValid =
    previous === null ||
    isValidAgenticWalletMarketSwapStatusObservation(previous);
  const nextValid = isValidAgenticWalletMarketSwapStatusObservation(next);
  addIf(blockers, !previousValid, 'invalid_previous_observation');
  addIf(blockers, !nextValid, 'invalid_next_observation');

  if (previous !== null && previousValid && nextValid) {
    addIf(
      blockers,
      previous.gateId !== next.gateId ||
        previous.providerOrderId !== next.providerOrderId,
      'observation_identity_mismatch',
    );
    addIf(
      blockers,
      previous.bookedAt.getTime() !== next.bookedAt.getTime(),
      'booked_at_changed',
    );
    addIf(
      blockers,
      next.updatedAt.getTime() < previous.updatedAt.getTime(),
      'updated_at_regressed',
    );
    addIf(
      blockers,
      previous.terminal && previous.providerStatus !== next.providerStatus,
      'terminal_status_changed',
    );
    addIf(
      blockers,
      previous.transactionHash !== null &&
        previous.transactionHash !== next.transactionHash,
      'transaction_hash_changed',
    );
  }

  if (blockers.length > 0) {
    return result(
      'blocked',
      blockers,
      null,
      false,
      previous !== null && previousValid
        ? previous.statusLookupRequired
        : false,
    );
  }

  if (previous === null) {
    return result(
      'initial_observation_accepted',
      [],
      next,
      true,
      next.statusLookupRequired,
    );
  }

  const replayed = observationsEqual(previous, next);
  return result(
    replayed ? 'observation_replayed' : 'observation_advanced',
    [],
    next,
    !replayed,
    next.statusLookupRequired,
  );
}

function observationsEqual(
  left: AgenticWalletMarketSwapStatusObservation,
  right: AgenticWalletMarketSwapStatusObservation,
): boolean {
  return (
    left.gateId === right.gateId &&
    left.providerOrderId === right.providerOrderId &&
    left.providerStatus === right.providerStatus &&
    left.transactionHash === right.transactionHash &&
    left.bookedAt.getTime() === right.bookedAt.getTime() &&
    left.updatedAt.getTime() === right.updatedAt.getTime()
  );
}

function result(
  status: AgenticWalletMarketSwapStatusTransitionAssessment['status'],
  blockers: readonly AgenticWalletMarketSwapStatusTransitionBlocker[],
  acceptedObservation: AgenticWalletMarketSwapStatusObservation | null,
  persistenceRequired: boolean,
  statusLookupRequired: boolean,
): AgenticWalletMarketSwapStatusTransitionAssessment {
  return {
    scope: 'agentic_wallet_market_swap_status_transition',
    status,
    blockers,
    acceptedObservation,
    persistenceRequired,
    statusLookupRequired,
    financialReconciliationRequired: true,
    financialReconciliationComplete: false,
    submissionRetryAllowed: false,
  };
}

function addIf(
  blockers: AgenticWalletMarketSwapStatusTransitionBlocker[],
  condition: boolean,
  blocker: AgenticWalletMarketSwapStatusTransitionBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
