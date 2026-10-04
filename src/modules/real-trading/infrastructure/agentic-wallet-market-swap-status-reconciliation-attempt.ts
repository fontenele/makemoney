import { StoredRealExecutionSubmissionGate } from '../application/real-execution-submission-gate-store';
import { isStructurallyValidAgenticWalletMarketSwapGate } from './agentic-wallet-market-swap-command';
import {
  AgenticWalletMarketSwapReconciliationState,
  AgenticWalletMarketSwapReconciliationStateStore,
  isValidAgenticWalletMarketSwapReconciliationState,
} from './agentic-wallet-market-swap-reconciliation-state.store';
import {
  AgenticWalletMarketSwapStatusLookupRunner,
  prepareAgenticWalletMarketSwapStatusLookupCommand,
} from './agentic-wallet-market-swap-status-lookup-runner';
import {
  AgenticWalletMarketSwapStatusObservationStore,
  StoredAgenticWalletMarketSwapStatusObservation,
} from './agentic-wallet-market-swap-status-observation.store';
import {
  AgenticWalletMarketSwapStatusResponseBlocker,
  assessAgenticWalletMarketSwapStatusResponse,
} from './agentic-wallet-market-swap-status-response';
import { decideAgenticWalletMarketSwapStatusLookup } from './agentic-wallet-market-swap-status-lookup-decision';
import {
  AgenticWalletMarketSwapSubmissionReceipt,
  isValidAgenticWalletMarketSwapSubmissionReceipt,
} from './agentic-wallet-market-swap-submission-response';

export type AgenticWalletMarketSwapStatusReconciliationAttemptBlocker =
  | 'invalid_submission_gate'
  | 'invalid_submission_receipt'
  | 'gate_receipt_mismatch'
  | 'reconciliation_state_not_found'
  | 'invalid_reconciliation_state'
  | 'reconciliation_evidence_mismatch'
  | AgenticWalletMarketSwapStatusResponseBlocker;

export interface AgenticWalletMarketSwapStatusReconciliationAttemptResult {
  readonly scope: 'agentic_wallet_market_swap_status_reconciliation_attempt';
  readonly status:
    | 'blocked'
    | 'status_lookup_not_required'
    | 'status_response_invalid'
    | 'status_observation_recorded';
  readonly blockers: readonly AgenticWalletMarketSwapStatusReconciliationAttemptBlocker[];
  readonly storedObservation: StoredAgenticWalletMarketSwapStatusObservation | null;
  readonly observationReplayed: boolean;
  readonly providerCallStarted: boolean;
  readonly providerCallCompleted: boolean;
  readonly statusLookupRequired: boolean;
  readonly financialReconciliationRequired: true;
  readonly financialReconciliationComplete: false;
  readonly submissionRetryAllowed: false;
}

export class AgenticWalletMarketSwapStatusReconciliationAttempt {
  constructor(
    private readonly reconciliationStateStore: AgenticWalletMarketSwapReconciliationStateStore,
    private readonly lookupRunner: AgenticWalletMarketSwapStatusLookupRunner,
    private readonly observationStore: AgenticWalletMarketSwapStatusObservationStore,
  ) {}

  async reconcileOnce(
    gate: StoredRealExecutionSubmissionGate,
    receipt: AgenticWalletMarketSwapSubmissionReceipt,
    signal?: AbortSignal,
  ): Promise<AgenticWalletMarketSwapStatusReconciliationAttemptResult> {
    if (!isStructurallyValidAgenticWalletMarketSwapGate(gate)) {
      return result('blocked', ['invalid_submission_gate']);
    }
    if (!isValidAgenticWalletMarketSwapSubmissionReceipt(receipt)) {
      return result('blocked', ['invalid_submission_receipt']);
    }
    if (gate.id !== receipt.gateId) {
      return result('blocked', ['gate_receipt_mismatch']);
    }

    const state = await this.reconciliationStateStore.getByGateId(gate.id);
    if (state === null) {
      return result('blocked', ['reconciliation_state_not_found']);
    }
    if (!isValidAgenticWalletMarketSwapReconciliationState(state)) {
      return result('blocked', ['invalid_reconciliation_state']);
    }
    if (!matchesEvidence(gate, receipt, state)) {
      return result('blocked', ['reconciliation_evidence_mismatch']);
    }

    const decision = decideAgenticWalletMarketSwapStatusLookup(state);
    if (decision.status === 'status_lookup_not_required') {
      return result('status_lookup_not_required', [], false);
    }
    const command = prepareAgenticWalletMarketSwapStatusLookupCommand(decision);
    if (command === null) {
      return result('blocked', ['invalid_reconciliation_state']);
    }

    const response = await this.lookupRunner.run(command, signal);
    const assessment = assessAgenticWalletMarketSwapStatusResponse(
      gate,
      receipt,
      response,
    );
    if (assessment.observation === null) {
      return result(
        'status_response_invalid',
        assessment.blockers,
        state.statusLookupRequired,
        true,
        true,
      );
    }

    const recorded = await this.observationStore.record(assessment.observation);
    return result(
      'status_observation_recorded',
      [],
      recorded.stored.observation.statusLookupRequired,
      true,
      true,
      recorded.stored,
      recorded.replayed,
    );
  }
}

function matchesEvidence(
  gate: StoredRealExecutionSubmissionGate,
  receipt: AgenticWalletMarketSwapSubmissionReceipt,
  state: AgenticWalletMarketSwapReconciliationState,
): boolean {
  return (
    state.gateId === gate.id &&
    state.gateId === receipt.gateId &&
    state.providerId === receipt.providerId &&
    state.providerOrderId === receipt.providerOrderId
  );
}

function result(
  status: AgenticWalletMarketSwapStatusReconciliationAttemptResult['status'],
  blockers: readonly AgenticWalletMarketSwapStatusReconciliationAttemptBlocker[],
  statusLookupRequired = false,
  providerCallStarted = false,
  providerCallCompleted = false,
  storedObservation: StoredAgenticWalletMarketSwapStatusObservation | null = null,
  observationReplayed = false,
): AgenticWalletMarketSwapStatusReconciliationAttemptResult {
  return {
    scope: 'agentic_wallet_market_swap_status_reconciliation_attempt',
    status,
    blockers,
    storedObservation,
    observationReplayed,
    providerCallStarted,
    providerCallCompleted,
    statusLookupRequired,
    financialReconciliationRequired: true,
    financialReconciliationComplete: false,
    submissionRetryAllowed: false,
  };
}
