import {
  RealExecutionIntent,
  RealExecutionQuote,
} from '../domain/real-execution';
import { AgenticWalletCapabilityObservation } from '../infrastructure/agentic-wallet-capability.adapter';
import { AgenticWalletAccountingReconciledBalanceSnapshot } from '../infrastructure/agentic-wallet-accounting-reconciled-balance-snapshot';
import {
  AgenticWalletAccountingReconciledResourceSnapshotAssessment,
  prepareAgenticWalletAccountingReconciledResourceSnapshot,
} from './agentic-wallet-accounting-reconciled-resource-snapshot';
import {
  AgenticWalletProviderQuotaSnapshotAssessment,
  prepareAgenticWalletProviderQuotaSnapshot,
} from './agentic-wallet-provider-quota-snapshot';
import { RealExecutionBudgetSnapshot } from './real-execution-budget-risk';
import { RealExecutionLocalRiskLimits } from './real-execution-local-risk-limits';
import {
  assessRealExecutionReservationCapacity,
  RealExecutionReservationCapacityAssessment,
  RealExecutionReservationCapacityFreshnessPolicy,
  RealExecutionReservationCapacitySnapshot,
} from './real-execution-reservation-capacity';

export type AgenticWalletAccountingReconciledReservationCapacityBlocker =
  | 'resource_snapshot_projection_blocked'
  | 'provider_quota_snapshot_projection_blocked'
  | 'reservation_capacity_blocked';

export interface AgenticWalletAccountingReconciledReservationCapacityAssessment {
  readonly scope: 'agentic_wallet_accounting_reconciled_reservation_capacity_assessment';
  readonly status: 'reservation_capacity_available' | 'blocked';
  readonly blockers: readonly AgenticWalletAccountingReconciledReservationCapacityBlocker[];
  readonly resourceSnapshotStatus: AgenticWalletAccountingReconciledResourceSnapshotAssessment['status'];
  readonly resourceSnapshotBlockers: AgenticWalletAccountingReconciledResourceSnapshotAssessment['blockers'];
  readonly providerQuotaSnapshotStatus:
    AgenticWalletProviderQuotaSnapshotAssessment['status'] | 'not_evaluated';
  readonly providerQuotaSnapshotBlockers: AgenticWalletProviderQuotaSnapshotAssessment['blockers'];
  readonly reservationCapacity: RealExecutionReservationCapacityAssessment | null;
  readonly reconciliationId: string | null;
  readonly reconciliationFingerprint: string | null;
  readonly providerObservationValidated: boolean;
  readonly requirementValuationExternallySupplied: boolean;
  readonly usdtUsdParityAssumed: false;
  readonly providerDailyLimitAcceptedAsProjectRiskLimit: false;
  readonly durableReservationCreated: false;
  readonly atomicEnforcement: false;
  readonly riskApproved: false;
  readonly fundingAuthorized: false;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
}

export function assessAgenticWalletAccountingReconciledReservationCapacity(
  balances: AgenticWalletAccountingReconciledBalanceSnapshot,
  observation: AgenticWalletCapabilityObservation,
  intent: RealExecutionIntent,
  quote: RealExecutionQuote,
  nativeGasRequiredQuantity: string,
  requiredUsd: string,
  requirementValuedAt: Date,
  limits: RealExecutionLocalRiskLimits,
  budgetSnapshot: RealExecutionBudgetSnapshot,
  reservationSnapshot: RealExecutionReservationCapacitySnapshot,
  freshness: RealExecutionReservationCapacityFreshnessPolicy,
  evaluatedAt: Date,
): AgenticWalletAccountingReconciledReservationCapacityAssessment {
  const resourceProjection =
    prepareAgenticWalletAccountingReconciledResourceSnapshot(
      balances,
      intent,
      quote,
      nativeGasRequiredQuantity,
    );
  if (resourceProjection.resourceSnapshot === null) {
    return assessment(resourceProjection, null, null, [
      'resource_snapshot_projection_blocked',
    ]);
  }

  const quotaProjection = prepareAgenticWalletProviderQuotaSnapshot(
    observation,
    intent,
    quote,
    requiredUsd,
    requirementValuedAt,
  );
  if (quotaProjection.quotaSnapshot === null) {
    return assessment(resourceProjection, quotaProjection, null, [
      'provider_quota_snapshot_projection_blocked',
    ]);
  }

  const reservationCapacity = assessRealExecutionReservationCapacity(
    intent,
    quote,
    limits,
    budgetSnapshot,
    resourceProjection.resourceSnapshot,
    quotaProjection.quotaSnapshot,
    reservationSnapshot,
    freshness,
    evaluatedAt,
  );
  return assessment(
    resourceProjection,
    quotaProjection,
    reservationCapacity,
    reservationCapacity.status === 'reservation_capacity_available'
      ? []
      : ['reservation_capacity_blocked'],
  );
}

function assessment(
  resourceProjection: AgenticWalletAccountingReconciledResourceSnapshotAssessment,
  quotaProjection: AgenticWalletProviderQuotaSnapshotAssessment | null,
  reservationCapacity: RealExecutionReservationCapacityAssessment | null,
  blockers: readonly AgenticWalletAccountingReconciledReservationCapacityBlocker[],
): AgenticWalletAccountingReconciledReservationCapacityAssessment {
  return {
    scope:
      'agentic_wallet_accounting_reconciled_reservation_capacity_assessment',
    status:
      blockers.length === 0 ? 'reservation_capacity_available' : 'blocked',
    blockers: [...blockers],
    resourceSnapshotStatus: resourceProjection.status,
    resourceSnapshotBlockers: [...resourceProjection.blockers],
    providerQuotaSnapshotStatus: quotaProjection?.status ?? 'not_evaluated',
    providerQuotaSnapshotBlockers: [...(quotaProjection?.blockers ?? [])],
    reservationCapacity:
      reservationCapacity === null
        ? null
        : {
            ...reservationCapacity,
            blockers: [...reservationCapacity.blockers],
            evaluatedAt: new Date(reservationCapacity.evaluatedAt),
          },
    reconciliationId: resourceProjection.reconciliationId,
    reconciliationFingerprint: resourceProjection.reconciliationFingerprint,
    providerObservationValidated:
      quotaProjection?.providerObservationValidated ?? false,
    requirementValuationExternallySupplied:
      quotaProjection?.requirementValuationExternallySupplied ?? false,
    usdtUsdParityAssumed: false,
    providerDailyLimitAcceptedAsProjectRiskLimit: false,
    durableReservationCreated: false,
    atomicEnforcement: false,
    riskApproved: false,
    fundingAuthorized: false,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
}
