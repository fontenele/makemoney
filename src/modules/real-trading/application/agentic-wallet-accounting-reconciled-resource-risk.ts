import {
  RealExecutionIntent,
  RealExecutionQuote,
} from '../domain/real-execution';
import { AgenticWalletAccountingReconciledBalanceSnapshot } from '../infrastructure/agentic-wallet-accounting-reconciled-balance-snapshot';
import {
  AgenticWalletAccountingReconciledResourceSnapshotAssessment,
  prepareAgenticWalletAccountingReconciledResourceSnapshot,
} from './agentic-wallet-accounting-reconciled-resource-snapshot';
import { RealExecutionBudgetSnapshot } from './real-execution-budget-risk';
import { RealExecutionLocalRiskLimits } from './real-execution-local-risk-limits';
import {
  assessRealExecutionResourceRisk,
  RealExecutionResourceFreshnessPolicy,
  RealExecutionResourceRiskAssessment,
} from './real-execution-resource-risk';

export type AgenticWalletAccountingReconciledResourceRiskBlocker =
  'resource_snapshot_projection_blocked' | 'resource_risk_blocked';

export interface AgenticWalletAccountingReconciledResourceRiskAssessment {
  readonly scope: 'agentic_wallet_accounting_reconciled_resource_risk_assessment';
  readonly status: 'resources_sufficient' | 'blocked';
  readonly blockers: readonly AgenticWalletAccountingReconciledResourceRiskBlocker[];
  readonly resourceSnapshotStatus: AgenticWalletAccountingReconciledResourceSnapshotAssessment['status'];
  readonly resourceSnapshotBlockers: AgenticWalletAccountingReconciledResourceSnapshotAssessment['blockers'];
  readonly resourceRisk: RealExecutionResourceRiskAssessment | null;
  readonly reconciliationId: string | null;
  readonly reconciliationFingerprint: string | null;
  readonly durableResourceReservation: false;
  readonly riskApproved: false;
  readonly fundingAuthorized: false;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
}

export function assessAgenticWalletAccountingReconciledResourceRisk(
  balances: AgenticWalletAccountingReconciledBalanceSnapshot,
  intent: RealExecutionIntent,
  quote: RealExecutionQuote,
  nativeGasRequiredQuantity: string,
  limits: RealExecutionLocalRiskLimits,
  budgetSnapshot: RealExecutionBudgetSnapshot,
  freshness: RealExecutionResourceFreshnessPolicy,
  evaluatedAt: Date,
): AgenticWalletAccountingReconciledResourceRiskAssessment {
  const projection = prepareAgenticWalletAccountingReconciledResourceSnapshot(
    balances,
    intent,
    quote,
    nativeGasRequiredQuantity,
  );
  if (projection.resourceSnapshot === null) {
    return assessment(projection, null, [
      'resource_snapshot_projection_blocked',
    ]);
  }

  const resourceRisk = assessRealExecutionResourceRisk(
    intent,
    quote,
    limits,
    budgetSnapshot,
    projection.resourceSnapshot,
    freshness,
    evaluatedAt,
  );
  return assessment(
    projection,
    resourceRisk,
    resourceRisk.status === 'resources_sufficient'
      ? []
      : ['resource_risk_blocked'],
  );
}

function assessment(
  projection: AgenticWalletAccountingReconciledResourceSnapshotAssessment,
  resourceRisk: RealExecutionResourceRiskAssessment | null,
  blockers: readonly AgenticWalletAccountingReconciledResourceRiskBlocker[],
): AgenticWalletAccountingReconciledResourceRiskAssessment {
  return {
    scope: 'agentic_wallet_accounting_reconciled_resource_risk_assessment',
    status: blockers.length === 0 ? 'resources_sufficient' : 'blocked',
    blockers: [...blockers],
    resourceSnapshotStatus: projection.status,
    resourceSnapshotBlockers: [...projection.blockers],
    resourceRisk:
      resourceRisk === null
        ? null
        : {
            ...resourceRisk,
            blockers: [...resourceRisk.blockers],
            evaluatedAt: new Date(resourceRisk.evaluatedAt),
          },
    reconciliationId: projection.reconciliationId,
    reconciliationFingerprint: projection.reconciliationFingerprint,
    durableResourceReservation: false,
    riskApproved: false,
    fundingAuthorized: false,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
}
