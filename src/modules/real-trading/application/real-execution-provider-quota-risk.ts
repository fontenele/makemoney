import Decimal from 'decimal.js';

import {
  RealExecutionIntent,
  RealExecutionQuote,
} from '../domain/real-execution';
import { RealExecutionBudgetSnapshot } from './real-execution-budget-risk';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from './real-execution-instrument-approval';
import { RealExecutionLocalRiskLimits } from './real-execution-local-risk-limits';
import {
  assessRealExecutionResourceRisk,
  RealExecutionResourceRiskAssessment,
  RealExecutionResourceSnapshot,
} from './real-execution-resource-risk';

const ExactDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});
const PROVIDER_ID_PATTERN = /^[a-z][a-z0-9_-]{0,31}$/;
const CHAIN_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UTC_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const NON_NEGATIVE_DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const POSITIVE_DECIMAL_PATTERN = /^(?:[1-9]\d*(?:\.\d+)?|0\.\d*[1-9]\d*)$/;
const MAXIMUM_QUOTA_FACT_AGE_MS = 60_000;

export interface RealExecutionProviderQuotaSnapshot {
  readonly providerId: string;
  readonly chainId: string;
  readonly intentId: string;
  readonly quoteId: string;
  readonly utcDay: string;
  readonly dailyLimitUsd: string;
  readonly usedUsd: string;
  readonly remainingUsd: string;
  readonly quotaCoverage: 'complete' | 'partial';
  readonly requiredUsd: string;
  readonly requirementValuationBasis: 'explicit_external_usd_value';
  readonly requirementCoverage: 'complete' | 'partial';
  readonly quotaObservedAt: Date;
  readonly requirementValuedAt: Date;
}

export interface RealExecutionProviderQuotaFreshnessPolicy {
  readonly budgetSnapshotMaxAgeMs: number;
  readonly resourceSnapshotMaxAgeMs: number;
  readonly quotaSnapshotMaxAgeMs: number;
  readonly requirementValuationMaxAgeMs: number;
}

export type RealExecutionProviderQuotaRiskBlocker =
  | 'resource_risk_blocked'
  | 'invalid_provider_quota_snapshot'
  | 'quota_provider_mismatch'
  | 'quota_chain_mismatch'
  | 'quota_intent_mismatch'
  | 'quota_quote_mismatch'
  | 'quota_day_mismatch'
  | 'quota_observation_day_mismatch'
  | 'quota_observation_from_future'
  | 'quota_observation_stale'
  | 'quota_coverage_incomplete'
  | 'requirement_valuation_from_future'
  | 'requirement_valuation_stale'
  | 'requirement_coverage_incomplete'
  | 'quota_used_exceeds_daily_limit'
  | 'quota_total_mismatch'
  | 'provider_quota_insufficient';

export interface RealExecutionProviderQuotaRiskAssessment {
  readonly scope: 'real_execution_provider_quota_risk';
  readonly status: 'provider_quota_sufficient' | 'blocked';
  readonly blockers: readonly RealExecutionProviderQuotaRiskBlocker[];
  readonly resourceRiskStatus: RealExecutionResourceRiskAssessment['status'];
  readonly requiredProviderQuotaUsd: string | null;
  readonly remainingProviderQuotaUsd: string | null;
  readonly providerQuotaSufficient: boolean | null;
  readonly usdtUsdParityAssumed: false;
  readonly providerDailyLimitAcceptedAsProjectRiskLimit: false;
  readonly durableQuotaReservation: false;
  readonly riskApproved: false;
  readonly fundingAuthorized: false;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
  readonly evaluatedAt: Date;
}

export function assessRealExecutionProviderQuotaRisk(
  intent: RealExecutionIntent,
  quote: RealExecutionQuote,
  limits: RealExecutionLocalRiskLimits,
  budgetSnapshot: RealExecutionBudgetSnapshot,
  resourceSnapshot: RealExecutionResourceSnapshot,
  quotaSnapshot: RealExecutionProviderQuotaSnapshot,
  freshness: RealExecutionProviderQuotaFreshnessPolicy,
  evaluatedAt: Date,
): RealExecutionProviderQuotaRiskAssessment {
  validateEvaluationInputs(freshness, evaluatedAt);
  const blockers: RealExecutionProviderQuotaRiskBlocker[] = [];
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
  addIf(
    blockers,
    resourceRisk.status !== 'resources_sufficient',
    'resource_risk_blocked',
  );

  const snapshotValid = isValidProviderQuotaSnapshot(quotaSnapshot);
  addIf(blockers, !snapshotValid, 'invalid_provider_quota_snapshot');

  let requiredProviderQuotaUsd: string | null = null;
  let remainingProviderQuotaUsd: string | null = null;
  let providerQuotaSufficient: boolean | null = null;
  if (snapshotValid) {
    const approved = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
    requiredProviderQuotaUsd = new ExactDecimal(
      quotaSnapshot.requiredUsd,
    ).toFixed();
    remainingProviderQuotaUsd = new ExactDecimal(
      quotaSnapshot.remainingUsd,
    ).toFixed();
    addIf(
      blockers,
      quotaSnapshot.providerId !== approved.providerId,
      'quota_provider_mismatch',
    );
    addIf(
      blockers,
      quotaSnapshot.chainId !== approved.chainId,
      'quota_chain_mismatch',
    );
    addIf(
      blockers,
      quotaSnapshot.intentId !== intent.id,
      'quota_intent_mismatch',
    );
    addIf(blockers, quotaSnapshot.quoteId !== quote.id, 'quota_quote_mismatch');
    addIf(
      blockers,
      quotaSnapshot.utcDay !== utcDay(evaluatedAt),
      'quota_day_mismatch',
    );
    addIf(
      blockers,
      quotaSnapshot.utcDay !== utcDay(quotaSnapshot.quotaObservedAt),
      'quota_observation_day_mismatch',
    );
    addFreshnessBlockers(
      blockers,
      evaluatedAt,
      quotaSnapshot.quotaObservedAt,
      freshness.quotaSnapshotMaxAgeMs,
      'quota_observation_from_future',
      'quota_observation_stale',
    );
    addIf(
      blockers,
      quotaSnapshot.quotaCoverage !== 'complete',
      'quota_coverage_incomplete',
    );
    addFreshnessBlockers(
      blockers,
      evaluatedAt,
      quotaSnapshot.requirementValuedAt,
      freshness.requirementValuationMaxAgeMs,
      'requirement_valuation_from_future',
      'requirement_valuation_stale',
    );
    addIf(
      blockers,
      quotaSnapshot.requirementCoverage !== 'complete',
      'requirement_coverage_incomplete',
    );

    const dailyLimit = new ExactDecimal(quotaSnapshot.dailyLimitUsd);
    const used = new ExactDecimal(quotaSnapshot.usedUsd);
    const remaining = new ExactDecimal(quotaSnapshot.remainingUsd);
    addIf(
      blockers,
      used.greaterThan(dailyLimit),
      'quota_used_exceeds_daily_limit',
    );
    addIf(
      blockers,
      !used.plus(remaining).equals(dailyLimit),
      'quota_total_mismatch',
    );
    providerQuotaSufficient = remaining.greaterThanOrEqualTo(
      requiredProviderQuotaUsd,
    );
    addIf(blockers, !providerQuotaSufficient, 'provider_quota_insufficient');
  }

  return {
    scope: 'real_execution_provider_quota_risk',
    status: blockers.length === 0 ? 'provider_quota_sufficient' : 'blocked',
    blockers,
    resourceRiskStatus: resourceRisk.status,
    requiredProviderQuotaUsd,
    remainingProviderQuotaUsd,
    providerQuotaSufficient,
    usdtUsdParityAssumed: false,
    providerDailyLimitAcceptedAsProjectRiskLimit: false,
    durableQuotaReservation: false,
    riskApproved: false,
    fundingAuthorized: false,
    quoteAuthorized: false,
    submissionAuthorized: false,
    evaluatedAt: new Date(evaluatedAt),
  };
}

function isValidProviderQuotaSnapshot(
  snapshot: RealExecutionProviderQuotaSnapshot,
): boolean {
  return (
    typeof snapshot === 'object' &&
    snapshot !== null &&
    typeof snapshot.providerId === 'string' &&
    PROVIDER_ID_PATTERN.test(snapshot.providerId) &&
    typeof snapshot.chainId === 'string' &&
    CHAIN_ID_PATTERN.test(snapshot.chainId) &&
    typeof snapshot.intentId === 'string' &&
    UUID_PATTERN.test(snapshot.intentId) &&
    typeof snapshot.quoteId === 'string' &&
    UUID_PATTERN.test(snapshot.quoteId) &&
    typeof snapshot.utcDay === 'string' &&
    isCanonicalUtcDay(snapshot.utcDay) &&
    typeof snapshot.dailyLimitUsd === 'string' &&
    POSITIVE_DECIMAL_PATTERN.test(snapshot.dailyLimitUsd) &&
    typeof snapshot.usedUsd === 'string' &&
    NON_NEGATIVE_DECIMAL_PATTERN.test(snapshot.usedUsd) &&
    typeof snapshot.remainingUsd === 'string' &&
    NON_NEGATIVE_DECIMAL_PATTERN.test(snapshot.remainingUsd) &&
    (snapshot.quotaCoverage === 'complete' ||
      snapshot.quotaCoverage === 'partial') &&
    typeof snapshot.requiredUsd === 'string' &&
    POSITIVE_DECIMAL_PATTERN.test(snapshot.requiredUsd) &&
    snapshot.requirementValuationBasis === 'explicit_external_usd_value' &&
    (snapshot.requirementCoverage === 'complete' ||
      snapshot.requirementCoverage === 'partial') &&
    snapshot.quotaObservedAt instanceof Date &&
    Number.isFinite(snapshot.quotaObservedAt.getTime()) &&
    snapshot.requirementValuedAt instanceof Date &&
    Number.isFinite(snapshot.requirementValuedAt.getTime())
  );
}

function isCanonicalUtcDay(value: string): boolean {
  if (!UTC_DAY_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && utcDay(parsed) === value;
}

function utcDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addFreshnessBlockers(
  blockers: RealExecutionProviderQuotaRiskBlocker[],
  evaluatedAt: Date,
  observedAt: Date,
  maximumAgeMs: number,
  futureBlocker: RealExecutionProviderQuotaRiskBlocker,
  staleBlocker: RealExecutionProviderQuotaRiskBlocker,
): void {
  const ageMs = evaluatedAt.getTime() - observedAt.getTime();
  addIf(blockers, ageMs < 0, futureBlocker);
  addIf(blockers, ageMs > maximumAgeMs, staleBlocker);
}

function validateEvaluationInputs(
  freshness: RealExecutionProviderQuotaFreshnessPolicy,
  evaluatedAt: Date,
): void {
  if (
    typeof freshness !== 'object' ||
    freshness === null ||
    !validMaximumAge(freshness.budgetSnapshotMaxAgeMs) ||
    !validMaximumAge(freshness.resourceSnapshotMaxAgeMs) ||
    !validMaximumAge(freshness.quotaSnapshotMaxAgeMs) ||
    !validMaximumAge(freshness.requirementValuationMaxAgeMs)
  ) {
    throw new Error(
      'Real execution provider quota maximum ages must be between 1 and 60000 ms',
    );
  }
  if (
    !(evaluatedAt instanceof Date) ||
    !Number.isFinite(evaluatedAt.getTime())
  ) {
    throw new Error(
      'Real execution provider quota risk evaluation time must be valid',
    );
  }
}

function validMaximumAge(value: number): boolean {
  return (
    Number.isInteger(value) && value > 0 && value <= MAXIMUM_QUOTA_FACT_AGE_MS
  );
}

function addIf(
  blockers: RealExecutionProviderQuotaRiskBlocker[],
  condition: boolean,
  blocker: RealExecutionProviderQuotaRiskBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
