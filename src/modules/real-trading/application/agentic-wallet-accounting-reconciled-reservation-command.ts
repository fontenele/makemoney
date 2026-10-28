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
import { RealExecutionReservationCommand } from './real-execution-reservation-store';

export type AgenticWalletAccountingReconciledReservationCommandBlocker =
  | 'resource_snapshot_projection_blocked'
  | 'provider_quota_snapshot_projection_blocked'
  | 'reservation_capacity_blocked';

export interface AgenticWalletAccountingReconciledReservationCommandAssessment {
  readonly scope: 'agentic_wallet_accounting_reconciled_reservation_command_assessment';
  readonly status: 'reservation_command_ready' | 'blocked';
  readonly blockers: readonly AgenticWalletAccountingReconciledReservationCommandBlocker[];
  readonly resourceSnapshotStatus: AgenticWalletAccountingReconciledResourceSnapshotAssessment['status'];
  readonly resourceSnapshotBlockers: AgenticWalletAccountingReconciledResourceSnapshotAssessment['blockers'];
  readonly providerQuotaSnapshotStatus:
    AgenticWalletProviderQuotaSnapshotAssessment['status'] | 'not_evaluated';
  readonly providerQuotaSnapshotBlockers: AgenticWalletProviderQuotaSnapshotAssessment['blockers'];
  readonly reservationCapacity: RealExecutionReservationCapacityAssessment | null;
  readonly command: RealExecutionReservationCommand | null;
  readonly reconciliationId: string | null;
  readonly reconciliationFingerprint: string | null;
  readonly providerObservationValidated: boolean;
  readonly requirementValuationExternallySupplied: boolean;
  readonly usdtUsdParityAssumed: false;
  readonly providerDailyLimitAcceptedAsProjectRiskLimit: false;
  readonly durableReservationCommandPrepared: boolean;
  readonly durableReservationCreated: false;
  readonly atomicEnforcement: false;
  readonly riskApproved: false;
  readonly fundingAuthorized: false;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
}

export function prepareAgenticWalletAccountingReconciledReservationCommand(
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
): AgenticWalletAccountingReconciledReservationCommandAssessment {
  const resourceProjection =
    prepareAgenticWalletAccountingReconciledResourceSnapshot(
      balances,
      intent,
      quote,
      nativeGasRequiredQuantity,
    );
  if (resourceProjection.resourceSnapshot === null) {
    return assessment(resourceProjection, null, null, null, [
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
    return assessment(resourceProjection, quotaProjection, null, null, [
      'provider_quota_snapshot_projection_blocked',
    ]);
  }

  const capacity = assessRealExecutionReservationCapacity(
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
  if (capacity.status !== 'reservation_capacity_available') {
    return assessment(resourceProjection, quotaProjection, capacity, null, [
      'reservation_capacity_blocked',
    ]);
  }
  if (
    resourceProjection.reconciliationId === null ||
    resourceProjection.reconciliationFingerprint === null
  ) {
    throw new Error('Ready resource projection is missing reconciliation');
  }

  const commandIntent = cloneIntent(intent);
  return assessment(
    resourceProjection,
    quotaProjection,
    capacity,
    {
      intent: commandIntent,
      quote: cloneQuote(quote, commandIntent),
      limits: { ...limits },
      budgetSnapshot: {
        ...budgetSnapshot,
        observedAt: new Date(budgetSnapshot.observedAt),
      },
      resourceSnapshot: {
        ...resourceProjection.resourceSnapshot,
        observedAt: new Date(resourceProjection.resourceSnapshot.observedAt),
      },
      quotaSnapshot: {
        ...quotaProjection.quotaSnapshot,
        quotaObservedAt: new Date(
          quotaProjection.quotaSnapshot.quotaObservedAt,
        ),
        requirementValuedAt: new Date(
          quotaProjection.quotaSnapshot.requirementValuedAt,
        ),
      },
      freshness: { ...freshness },
      provenance: {
        accountingReconciliationId: resourceProjection.reconciliationId,
        accountingReconciliationFingerprint:
          resourceProjection.reconciliationFingerprint,
        providerObservedAt: new Date(
          quotaProjection.quotaSnapshot.quotaObservedAt,
        ),
        requirementValuationBasis:
          quotaProjection.quotaSnapshot.requirementValuationBasis,
        requirementValuedAt: new Date(
          quotaProjection.quotaSnapshot.requirementValuedAt,
        ),
      },
    },
    [],
  );
}

function cloneIntent(intent: RealExecutionIntent): RealExecutionIntent {
  return {
    ...intent,
    sourceAsset: { ...intent.sourceAsset },
    targetAsset: { ...intent.targetAsset },
    createdAt: new Date(intent.createdAt),
  };
}

function cloneQuote(
  quote: RealExecutionQuote,
  intent: RealExecutionIntent,
): RealExecutionQuote {
  return {
    ...quote,
    intent,
    costs: quote.costs.map((cost) => ({
      ...cost,
      asset: { ...cost.asset },
    })),
    quotedAt: new Date(quote.quotedAt),
    expiresAt: new Date(quote.expiresAt),
  };
}

function assessment(
  resourceProjection: AgenticWalletAccountingReconciledResourceSnapshotAssessment,
  quotaProjection: AgenticWalletProviderQuotaSnapshotAssessment | null,
  reservationCapacity: RealExecutionReservationCapacityAssessment | null,
  command: RealExecutionReservationCommand | null,
  blockers: readonly AgenticWalletAccountingReconciledReservationCommandBlocker[],
): AgenticWalletAccountingReconciledReservationCommandAssessment {
  return {
    scope:
      'agentic_wallet_accounting_reconciled_reservation_command_assessment',
    status: command === null ? 'blocked' : 'reservation_command_ready',
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
    command,
    reconciliationId: resourceProjection.reconciliationId,
    reconciliationFingerprint: resourceProjection.reconciliationFingerprint,
    providerObservationValidated:
      quotaProjection?.providerObservationValidated ?? false,
    requirementValuationExternallySupplied:
      quotaProjection?.requirementValuationExternallySupplied ?? false,
    usdtUsdParityAssumed: false,
    providerDailyLimitAcceptedAsProjectRiskLimit: false,
    durableReservationCommandPrepared: command !== null,
    durableReservationCreated: false,
    atomicEnforcement: false,
    riskApproved: false,
    fundingAuthorized: false,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
}
