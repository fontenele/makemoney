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
import { RealExecutionProviderQuotaFreshnessPolicy } from './real-execution-provider-quota-risk';
import {
  planRealExecutionReservation,
  RealExecutionReservationPlanAssessment,
} from './real-execution-reservation-plan';

export type AgenticWalletAccountingReconciledReservationPlanBlocker =
  | 'resource_snapshot_projection_blocked'
  | 'provider_quota_snapshot_projection_blocked'
  | 'reservation_plan_blocked';

export interface AgenticWalletAccountingReconciledReservationPlanAssessment {
  readonly scope: 'agentic_wallet_accounting_reconciled_reservation_plan_assessment';
  readonly status: 'reservation_plan_ready' | 'blocked';
  readonly blockers: readonly AgenticWalletAccountingReconciledReservationPlanBlocker[];
  readonly resourceSnapshotStatus: AgenticWalletAccountingReconciledResourceSnapshotAssessment['status'];
  readonly resourceSnapshotBlockers: AgenticWalletAccountingReconciledResourceSnapshotAssessment['blockers'];
  readonly providerQuotaSnapshotStatus:
    AgenticWalletProviderQuotaSnapshotAssessment['status'] | 'not_evaluated';
  readonly providerQuotaSnapshotBlockers: AgenticWalletProviderQuotaSnapshotAssessment['blockers'];
  readonly reservationPlan: RealExecutionReservationPlanAssessment | null;
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

export function planAgenticWalletAccountingReconciledReservation(
  balances: AgenticWalletAccountingReconciledBalanceSnapshot,
  observation: AgenticWalletCapabilityObservation,
  intent: RealExecutionIntent,
  quote: RealExecutionQuote,
  nativeGasRequiredQuantity: string,
  requiredUsd: string,
  requirementValuedAt: Date,
  limits: RealExecutionLocalRiskLimits,
  budgetSnapshot: RealExecutionBudgetSnapshot,
  freshness: RealExecutionProviderQuotaFreshnessPolicy,
  evaluatedAt: Date,
): AgenticWalletAccountingReconciledReservationPlanAssessment {
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

  const reservationPlan = planRealExecutionReservation(
    intent,
    quote,
    limits,
    budgetSnapshot,
    resourceProjection.resourceSnapshot,
    quotaProjection.quotaSnapshot,
    freshness,
    evaluatedAt,
  );
  return assessment(
    resourceProjection,
    quotaProjection,
    reservationPlan,
    reservationPlan.status === 'reservation_plan_ready'
      ? []
      : ['reservation_plan_blocked'],
  );
}

function assessment(
  resourceProjection: AgenticWalletAccountingReconciledResourceSnapshotAssessment,
  quotaProjection: AgenticWalletProviderQuotaSnapshotAssessment | null,
  reservationPlan: RealExecutionReservationPlanAssessment | null,
  blockers: readonly AgenticWalletAccountingReconciledReservationPlanBlocker[],
): AgenticWalletAccountingReconciledReservationPlanAssessment {
  return {
    scope: 'agentic_wallet_accounting_reconciled_reservation_plan_assessment',
    status: blockers.length === 0 ? 'reservation_plan_ready' : 'blocked',
    blockers: [...blockers],
    resourceSnapshotStatus: resourceProjection.status,
    resourceSnapshotBlockers: [...resourceProjection.blockers],
    providerQuotaSnapshotStatus: quotaProjection?.status ?? 'not_evaluated',
    providerQuotaSnapshotBlockers: [...(quotaProjection?.blockers ?? [])],
    reservationPlan:
      reservationPlan === null
        ? null
        : {
            ...reservationPlan,
            blockers: [...reservationPlan.blockers],
            plan:
              reservationPlan.plan === null
                ? null
                : {
                    ...reservationPlan.plan,
                    expiresAt: new Date(reservationPlan.plan.expiresAt),
                    plannedAt: new Date(reservationPlan.plan.plannedAt),
                  },
            evaluatedAt: new Date(reservationPlan.evaluatedAt),
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
