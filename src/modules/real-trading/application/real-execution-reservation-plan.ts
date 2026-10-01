import {
  RealExecutionIntent,
  RealExecutionQuote,
} from '../domain/real-execution';
import {
  assessRealExecutionBudgetRisk,
  RealExecutionBudgetSnapshot,
} from './real-execution-budget-risk';
import { RealExecutionLocalRiskLimits } from './real-execution-local-risk-limits';
import {
  assessRealExecutionProviderQuotaRisk,
  RealExecutionProviderQuotaFreshnessPolicy,
  RealExecutionProviderQuotaRiskAssessment,
  RealExecutionProviderQuotaSnapshot,
} from './real-execution-provider-quota-risk';
import {
  assessRealExecutionResourceRisk,
  RealExecutionResourceSnapshot,
} from './real-execution-resource-risk';

export interface RealExecutionReservationPlan {
  readonly providerId: string;
  readonly chainId: string;
  readonly intentId: string;
  readonly quoteId: string;
  readonly idempotencyKey: string;
  readonly utcDay: string;
  readonly budgetChargeUsdt: string;
  readonly sourceTokenAddress: string;
  readonly sourceSymbol: string;
  readonly sourceQuantity: string;
  readonly nativeGasSymbol: 'BNB';
  readonly nativeGasQuantity: string;
  readonly providerQuotaUsd: string;
  readonly expiresAt: Date;
  readonly plannedAt: Date;
}

export type RealExecutionReservationPlanBlocker =
  'provider_quota_risk_blocked' | 'reservation_facts_incomplete';

export interface RealExecutionReservationPlanAssessment {
  readonly scope: 'real_execution_reservation_plan';
  readonly status: 'reservation_plan_ready' | 'blocked';
  readonly blockers: readonly RealExecutionReservationPlanBlocker[];
  readonly providerQuotaRiskStatus: RealExecutionProviderQuotaRiskAssessment['status'];
  readonly plan: RealExecutionReservationPlan | null;
  readonly durableReservationCreated: false;
  readonly atomicEnforcement: false;
  readonly riskApproved: false;
  readonly fundingAuthorized: false;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
  readonly evaluatedAt: Date;
}

export function planRealExecutionReservation(
  intent: RealExecutionIntent,
  quote: RealExecutionQuote,
  limits: RealExecutionLocalRiskLimits,
  budgetSnapshot: RealExecutionBudgetSnapshot,
  resourceSnapshot: RealExecutionResourceSnapshot,
  quotaSnapshot: RealExecutionProviderQuotaSnapshot,
  freshness: RealExecutionProviderQuotaFreshnessPolicy,
  evaluatedAt: Date,
): RealExecutionReservationPlanAssessment {
  const quotaRisk = assessRealExecutionProviderQuotaRisk(
    intent,
    quote,
    limits,
    budgetSnapshot,
    resourceSnapshot,
    quotaSnapshot,
    freshness,
    evaluatedAt,
  );
  if (quotaRisk.status !== 'provider_quota_sufficient') {
    return assessment(
      quotaRisk,
      ['provider_quota_risk_blocked'],
      null,
      evaluatedAt,
    );
  }

  const budgetRisk = assessRealExecutionBudgetRisk(
    intent,
    quote,
    limits,
    budgetSnapshot,
    freshness.budgetSnapshotMaxAgeMs,
    evaluatedAt,
  );
  const resourceRisk = assessRealExecutionResourceRisk(
    intent,
    quote,
    limits,
    budgetSnapshot,
    resourceSnapshot,
    {
      budgetSnapshotMaxAgeMs: freshness.budgetSnapshotMaxAgeMs,
      resourceSnapshotMaxAgeMs: freshness.resourceSnapshotMaxAgeMs,
    },
    evaluatedAt,
  );
  if (
    budgetRisk.quoteBudgetChargeUsdt === null ||
    resourceRisk.requiredSourceQuantity === null ||
    resourceRisk.requiredNativeGasQuantity === null ||
    quotaRisk.requiredProviderQuotaUsd === null ||
    intent.sourceAsset.symbol === null
  ) {
    return assessment(
      quotaRisk,
      ['reservation_facts_incomplete'],
      null,
      evaluatedAt,
    );
  }

  return assessment(
    quotaRisk,
    [],
    {
      providerId: quote.providerId,
      chainId: intent.chainId,
      intentId: intent.id,
      quoteId: quote.id,
      idempotencyKey: intent.idempotencyKey,
      utcDay: quotaSnapshot.utcDay,
      budgetChargeUsdt: budgetRisk.quoteBudgetChargeUsdt,
      sourceTokenAddress: intent.sourceAsset.tokenAddress.toLowerCase(),
      sourceSymbol: intent.sourceAsset.symbol,
      sourceQuantity: resourceRisk.requiredSourceQuantity,
      nativeGasSymbol: 'BNB',
      nativeGasQuantity: resourceRisk.requiredNativeGasQuantity,
      providerQuotaUsd: quotaRisk.requiredProviderQuotaUsd,
      expiresAt: new Date(quote.expiresAt),
      plannedAt: new Date(evaluatedAt),
    },
    evaluatedAt,
  );
}

function assessment(
  quotaRisk: RealExecutionProviderQuotaRiskAssessment,
  blockers: readonly RealExecutionReservationPlanBlocker[],
  plan: RealExecutionReservationPlan | null,
  evaluatedAt: Date,
): RealExecutionReservationPlanAssessment {
  return {
    scope: 'real_execution_reservation_plan',
    status: blockers.length === 0 ? 'reservation_plan_ready' : 'blocked',
    blockers,
    providerQuotaRiskStatus: quotaRisk.status,
    plan,
    durableReservationCreated: false,
    atomicEnforcement: false,
    riskApproved: false,
    fundingAuthorized: false,
    quoteAuthorized: false,
    submissionAuthorized: false,
    evaluatedAt: new Date(evaluatedAt),
  };
}
