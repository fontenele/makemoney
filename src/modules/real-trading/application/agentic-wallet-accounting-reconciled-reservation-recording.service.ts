import {
  RealExecutionIntent,
  RealExecutionQuote,
} from '../domain/real-execution';
import { AgenticWalletCapabilityObservation } from '../infrastructure/agentic-wallet-capability.adapter';
import { AgenticWalletAccountingReconciledBalanceSnapshot } from '../infrastructure/agentic-wallet-accounting-reconciled-balance-snapshot';
import {
  AgenticWalletAccountingReconciledReservationCommandBlocker,
  prepareAgenticWalletAccountingReconciledReservationCommand,
} from './agentic-wallet-accounting-reconciled-reservation-command';
import { RealExecutionBudgetSnapshot } from './real-execution-budget-risk';
import { RealExecutionLocalRiskLimits } from './real-execution-local-risk-limits';
import {
  RealExecutionReservationCapacityFreshnessPolicy,
  RealExecutionReservationCapacitySnapshot,
} from './real-execution-reservation-capacity';
import {
  RealExecutionReservationStore,
  StoredRealExecutionReservation,
} from './real-execution-reservation-store';

export interface AgenticWalletAccountingReconciledReservationRecordingInput {
  readonly balances: AgenticWalletAccountingReconciledBalanceSnapshot;
  readonly observation: AgenticWalletCapabilityObservation;
  readonly intent: RealExecutionIntent;
  readonly quote: RealExecutionQuote;
  readonly nativeGasRequiredQuantity: string;
  readonly requiredUsd: string;
  readonly requirementValuedAt: Date;
  readonly limits: RealExecutionLocalRiskLimits;
  readonly budgetSnapshot: RealExecutionBudgetSnapshot;
  readonly reservationSnapshot: RealExecutionReservationCapacitySnapshot;
  readonly freshness: RealExecutionReservationCapacityFreshnessPolicy;
  readonly evaluatedAt: Date;
}

export interface AgenticWalletAccountingReconciledReservationRecordingResult {
  readonly scope: 'agentic_wallet_accounting_reconciled_reservation_recording';
  readonly status: 'blocked' | 'durable_reservation_recorded';
  readonly blockers: readonly AgenticWalletAccountingReconciledReservationCommandBlocker[];
  readonly reconciliationId: string | null;
  readonly reconciliationFingerprint: string | null;
  readonly providerObservationValidated: boolean;
  readonly requirementValuationExternallySupplied: boolean;
  readonly reservation: StoredRealExecutionReservation | null;
  readonly replayed: boolean;
  readonly durableReservationRecorded: boolean;
  readonly reservationCreatedInThisAttempt: boolean;
  readonly providerAccessPerformed: false;
  readonly providerQuotaConsumed: false;
  readonly riskApproved: false;
  readonly fundingAuthorized: false;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
  readonly strategyExecutionAuthorized: false;
  readonly automaticRetryAllowed: false;
}

export class AgenticWalletAccountingReconciledReservationRecordingService {
  constructor(private readonly reservations: RealExecutionReservationStore) {}

  async record(
    input: AgenticWalletAccountingReconciledReservationRecordingInput,
    signal?: AbortSignal,
  ): Promise<AgenticWalletAccountingReconciledReservationRecordingResult> {
    const prepared = prepareAgenticWalletAccountingReconciledReservationCommand(
      input.balances,
      input.observation,
      input.intent,
      input.quote,
      input.nativeGasRequiredQuantity,
      input.requiredUsd,
      input.requirementValuedAt,
      input.limits,
      input.budgetSnapshot,
      input.reservationSnapshot,
      input.freshness,
      input.evaluatedAt,
    );
    if (prepared.command === null) {
      return result(prepared, null, false);
    }
    if (signal?.aborted) throw signal.reason;

    const stored = await this.reservations.reserve(prepared.command);
    return result(prepared, stored.reservation, stored.replayed);
  }
}

function result(
  prepared: ReturnType<
    typeof prepareAgenticWalletAccountingReconciledReservationCommand
  >,
  reservation: StoredRealExecutionReservation | null,
  replayed: boolean,
): AgenticWalletAccountingReconciledReservationRecordingResult {
  return {
    scope: 'agentic_wallet_accounting_reconciled_reservation_recording',
    status: reservation === null ? 'blocked' : 'durable_reservation_recorded',
    blockers: [...prepared.blockers],
    reconciliationId: prepared.reconciliationId,
    reconciliationFingerprint: prepared.reconciliationFingerprint,
    providerObservationValidated: prepared.providerObservationValidated,
    requirementValuationExternallySupplied:
      prepared.requirementValuationExternallySupplied,
    reservation,
    replayed,
    durableReservationRecorded: reservation !== null,
    reservationCreatedInThisAttempt: reservation !== null && !replayed,
    providerAccessPerformed: false,
    providerQuotaConsumed: false,
    riskApproved: false,
    fundingAuthorized: false,
    quoteAuthorized: false,
    submissionAuthorized: false,
    strategyExecutionAuthorized: false,
    automaticRetryAllowed: false,
  };
}
