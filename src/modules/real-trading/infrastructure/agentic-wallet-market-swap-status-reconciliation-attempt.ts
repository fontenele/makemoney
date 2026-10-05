import { isStructurallyValidAgenticWalletMarketSwapGate } from './agentic-wallet-market-swap-command';
import {
  AgenticWalletMarketSwapReconciliationState,
  isValidAgenticWalletMarketSwapReconciliationState,
} from './agentic-wallet-market-swap-reconciliation-state.store';
import {
  AgenticWalletMarketSwapStatusReconciliationContext,
  AgenticWalletMarketSwapStatusReconciliationContextStore,
} from './agentic-wallet-market-swap-status-reconciliation-context.store';
import { AgenticWalletMarketSwapStatusLookupRunner } from './agentic-wallet-market-swap-status-lookup-runner';
import {
  AgenticWalletMarketSwapStatusObservationStore,
  StoredAgenticWalletMarketSwapStatusObservation,
} from './agentic-wallet-market-swap-status-observation.store';
import {
  AgenticWalletMarketSwapStatusResponseBlocker,
  assessAgenticWalletMarketSwapStatusResponse,
} from './agentic-wallet-market-swap-status-response';
import {
  AgenticWalletMarketSwapStatusLookupCadenceBlocker,
  decideAgenticWalletMarketSwapStatusLookupCadence,
} from './agentic-wallet-market-swap-status-lookup-cadence';
import { isValidAgenticWalletMarketSwapSubmissionReceipt } from './agentic-wallet-market-swap-submission-response';

export type AgenticWalletMarketSwapStatusReconciliationAttemptBlocker =
  | 'reconciliation_attempt_in_progress'
  | 'invalid_submission_gate'
  | 'invalid_submission_receipt'
  | 'invalid_submission_receipt_timing'
  | 'gate_receipt_mismatch'
  | 'reconciliation_context_not_found'
  | 'invalid_reconciliation_state'
  | 'reconciliation_evidence_mismatch'
  | AgenticWalletMarketSwapStatusLookupCadenceBlocker
  | AgenticWalletMarketSwapStatusResponseBlocker;

export interface AgenticWalletMarketSwapStatusReconciliationAttemptResult {
  readonly scope: 'agentic_wallet_market_swap_status_reconciliation_attempt';
  readonly status:
    | 'blocked'
    | 'status_lookup_deferred'
    | 'status_lookup_not_required'
    | 'status_response_invalid'
    | 'status_observation_recorded';
  readonly blockers: readonly AgenticWalletMarketSwapStatusReconciliationAttemptBlocker[];
  readonly storedObservation: StoredAgenticWalletMarketSwapStatusObservation | null;
  readonly observationReplayed: boolean;
  readonly evaluatedAt: Date | null;
  readonly nextStatusLookupAt: Date | null;
  readonly providerCallStarted: boolean;
  readonly providerCallCompleted: boolean;
  readonly statusLookupRequired: boolean;
  readonly financialReconciliationRequired: true;
  readonly financialReconciliationComplete: false;
  readonly submissionRetryAllowed: false;
}

export class AgenticWalletMarketSwapStatusReconciliationAttempt {
  private readonly activeGateIds = new Set<string>();

  constructor(
    private readonly contextStore: AgenticWalletMarketSwapStatusReconciliationContextStore,
    private readonly lookupRunner: AgenticWalletMarketSwapStatusLookupRunner,
    private readonly observationStore: AgenticWalletMarketSwapStatusObservationStore,
    private readonly now: () => Date,
    private readonly minimumLookupIntervalMs: number,
  ) {}

  async reconcileOnce(
    gateId: string,
    signal?: AbortSignal,
  ): Promise<AgenticWalletMarketSwapStatusReconciliationAttemptResult> {
    if (this.activeGateIds.has(gateId)) {
      return result('blocked', ['reconciliation_attempt_in_progress']);
    }
    this.activeGateIds.add(gateId);
    try {
      return await this.reconcileClaimedOnce(gateId, signal);
    } finally {
      this.activeGateIds.delete(gateId);
    }
  }

  private async reconcileClaimedOnce(
    gateId: string,
    signal?: AbortSignal,
  ): Promise<AgenticWalletMarketSwapStatusReconciliationAttemptResult> {
    const context = await this.contextStore.getByGateId(gateId);
    if (context === null) {
      return result('blocked', ['reconciliation_context_not_found']);
    }
    const { gate, submissionReceipt, reconciliationState: state } = context;
    const { receipt } = submissionReceipt;
    if (!isStructurallyValidAgenticWalletMarketSwapGate(gate)) {
      return result('blocked', ['invalid_submission_gate']);
    }
    if (!isValidAgenticWalletMarketSwapSubmissionReceipt(receipt)) {
      return result('blocked', ['invalid_submission_receipt']);
    }
    if (gate.id !== gateId || gate.id !== receipt.gateId) {
      return result('blocked', ['gate_receipt_mismatch']);
    }
    if (!isValidStoredReceiptTime(context)) {
      return result('blocked', ['invalid_submission_receipt_timing']);
    }
    if (!isValidAgenticWalletMarketSwapReconciliationState(state)) {
      return result('blocked', ['invalid_reconciliation_state']);
    }
    if (!matchesEvidence(context, state)) {
      return result('blocked', ['reconciliation_evidence_mismatch']);
    }
    if (!state.statusLookupRequired) {
      return result('status_lookup_not_required', [], false);
    }

    const evaluatedAt = this.now();
    const decision = decideAgenticWalletMarketSwapStatusLookupCadence(
      state,
      evaluatedAt,
      this.minimumLookupIntervalMs,
    );
    if (decision.status === 'blocked') {
      return result('blocked', decision.blockers);
    }
    if (decision.status === 'status_lookup_not_required') {
      return result('status_lookup_not_required', [], false);
    }
    if (decision.status === 'status_lookup_deferred') {
      return result(
        'status_lookup_deferred',
        [],
        true,
        false,
        false,
        null,
        false,
        decision.evaluatedAt,
        decision.nextStatusLookupAt,
      );
    }
    if (decision.command === null) {
      return result('blocked', ['invalid_reconciliation_state']);
    }
    const command = {
      kind: 'market_order_status_lookup' as const,
      providerOrderId: decision.command.providerOrderId,
    };

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
        null,
        false,
        decision.evaluatedAt,
        decision.nextStatusLookupAt,
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
      decision.evaluatedAt,
      decision.nextStatusLookupAt,
    );
  }
}

function matchesEvidence(
  context: AgenticWalletMarketSwapStatusReconciliationContext,
  state: AgenticWalletMarketSwapReconciliationState,
): boolean {
  const { gate, submissionReceipt } = context;
  const { receipt } = submissionReceipt;
  return (
    state.gateId === gate.id &&
    state.gateId === receipt.gateId &&
    state.providerId === receipt.providerId &&
    state.providerOrderId === receipt.providerOrderId &&
    state.receiptRecordedAt.getTime() === submissionReceipt.recordedAt.getTime()
  );
}

function isValidStoredReceiptTime(
  context: AgenticWalletMarketSwapStatusReconciliationContext,
): boolean {
  const recordedAt = context.submissionReceipt.recordedAt;
  return (
    recordedAt instanceof Date &&
    Number.isFinite(recordedAt.getTime()) &&
    recordedAt.getTime() >= context.gate.createdAt.getTime()
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
  evaluatedAt: Date | null = null,
  nextStatusLookupAt: Date | null = null,
): AgenticWalletMarketSwapStatusReconciliationAttemptResult {
  return {
    scope: 'agentic_wallet_market_swap_status_reconciliation_attempt',
    status,
    blockers,
    storedObservation,
    observationReplayed,
    evaluatedAt,
    nextStatusLookupAt,
    providerCallStarted,
    providerCallCompleted,
    statusLookupRequired,
    financialReconciliationRequired: true,
    financialReconciliationComplete: false,
    submissionRetryAllowed: false,
  };
}
