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
  assessRealExecutionProviderQuotaRisk,
  RealExecutionProviderQuotaFreshnessPolicy,
  RealExecutionProviderQuotaRiskAssessment,
} from './real-execution-provider-quota-risk';

export type AgenticWalletAccountingReconciledProviderQuotaRiskBlocker =
  | 'resource_snapshot_projection_blocked'
  | 'provider_quota_snapshot_projection_blocked'
  | 'provider_quota_risk_blocked';

export interface AgenticWalletAccountingReconciledProviderQuotaRiskAssessment {
  readonly scope: 'agentic_wallet_accounting_reconciled_provider_quota_risk_assessment';
  readonly status: 'provider_quota_sufficient' | 'blocked';
  readonly blockers: readonly AgenticWalletAccountingReconciledProviderQuotaRiskBlocker[];
  readonly resourceSnapshotStatus: AgenticWalletAccountingReconciledResourceSnapshotAssessment['status'];
  readonly resourceSnapshotBlockers: AgenticWalletAccountingReconciledResourceSnapshotAssessment['blockers'];
  readonly providerQuotaSnapshotStatus:
    AgenticWalletProviderQuotaSnapshotAssessment['status'] | 'not_evaluated';
  readonly providerQuotaSnapshotBlockers: AgenticWalletProviderQuotaSnapshotAssessment['blockers'];
  readonly providerQuotaRisk: RealExecutionProviderQuotaRiskAssessment | null;
  readonly reconciliationId: string | null;
  readonly reconciliationFingerprint: string | null;
  readonly providerObservationValidated: boolean;
  readonly requirementValuationExternallySupplied: boolean;
  readonly usdtUsdParityAssumed: false;
  readonly providerDailyLimitAcceptedAsProjectRiskLimit: false;
  readonly durableResourceReservation: false;
  readonly durableQuotaReservation: false;
  readonly riskApproved: false;
  readonly fundingAuthorized: false;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
}

export function assessAgenticWalletAccountingReconciledProviderQuotaRisk(
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
): AgenticWalletAccountingReconciledProviderQuotaRiskAssessment {
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

  const providerQuotaRisk = assessRealExecutionProviderQuotaRisk(
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
    providerQuotaRisk,
    providerQuotaRisk.status === 'provider_quota_sufficient'
      ? []
      : ['provider_quota_risk_blocked'],
  );
}

function assessment(
  resourceProjection: AgenticWalletAccountingReconciledResourceSnapshotAssessment,
  quotaProjection: AgenticWalletProviderQuotaSnapshotAssessment | null,
  providerQuotaRisk: RealExecutionProviderQuotaRiskAssessment | null,
  blockers: readonly AgenticWalletAccountingReconciledProviderQuotaRiskBlocker[],
): AgenticWalletAccountingReconciledProviderQuotaRiskAssessment {
  return {
    scope:
      'agentic_wallet_accounting_reconciled_provider_quota_risk_assessment',
    status: blockers.length === 0 ? 'provider_quota_sufficient' : 'blocked',
    blockers: [...blockers],
    resourceSnapshotStatus: resourceProjection.status,
    resourceSnapshotBlockers: [...resourceProjection.blockers],
    providerQuotaSnapshotStatus: quotaProjection?.status ?? 'not_evaluated',
    providerQuotaSnapshotBlockers: [...(quotaProjection?.blockers ?? [])],
    providerQuotaRisk:
      providerQuotaRisk === null
        ? null
        : {
            ...providerQuotaRisk,
            blockers: [...providerQuotaRisk.blockers],
            evaluatedAt: new Date(providerQuotaRisk.evaluatedAt),
          },
    reconciliationId: resourceProjection.reconciliationId,
    reconciliationFingerprint: resourceProjection.reconciliationFingerprint,
    providerObservationValidated:
      quotaProjection?.providerObservationValidated ?? false,
    requirementValuationExternallySupplied:
      quotaProjection?.requirementValuationExternallySupplied ?? false,
    usdtUsdParityAssumed: false,
    providerDailyLimitAcceptedAsProjectRiskLimit: false,
    durableResourceReservation: false,
    durableQuotaReservation: false,
    riskApproved: false,
    fundingAuthorized: false,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
}
