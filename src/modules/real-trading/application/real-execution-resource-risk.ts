import Decimal from 'decimal.js';

import {
  RealExecutionIntent,
  RealExecutionQuote,
} from '../domain/real-execution';
import {
  assessRealExecutionBudgetRisk,
  RealExecutionBudgetRiskAssessment,
  RealExecutionBudgetSnapshot,
} from './real-execution-budget-risk';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from './real-execution-instrument-approval';
import { RealExecutionLocalRiskLimits } from './real-execution-local-risk-limits';

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
const TOKEN_ADDRESS_PATTERN = /^\S{1,256}$/;
const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,31}$/;
const NON_NEGATIVE_DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const POSITIVE_DECIMAL_PATTERN = /^(?:[1-9]\d*(?:\.\d+)?|0\.\d*[1-9]\d*)$/;
const MAXIMUM_RESOURCE_SNAPSHOT_AGE_MS = 60_000;

export interface RealExecutionResourceSnapshot {
  readonly providerId: string;
  readonly chainId: string;
  readonly intentId: string;
  readonly quoteId: string;
  readonly sourceTokenAddress: string;
  readonly sourceSymbol: string;
  readonly sourceAvailableQuantity: string;
  readonly sourceBalanceCoverage: 'complete' | 'partial';
  readonly nativeGasSymbol: string;
  readonly nativeGasAvailableQuantity: string;
  readonly nativeGasRequiredQuantity: string;
  readonly nativeGasCoverage: 'complete' | 'partial';
  readonly observedAt: Date;
}

export interface RealExecutionResourceFreshnessPolicy {
  readonly budgetSnapshotMaxAgeMs: number;
  readonly resourceSnapshotMaxAgeMs: number;
}

export type RealExecutionResourceRiskBlocker =
  | 'budget_risk_blocked'
  | 'invalid_resource_snapshot'
  | 'resource_provider_mismatch'
  | 'resource_chain_mismatch'
  | 'resource_intent_mismatch'
  | 'resource_quote_mismatch'
  | 'source_token_mismatch'
  | 'source_symbol_mismatch'
  | 'native_gas_asset_mismatch'
  | 'resource_snapshot_from_future'
  | 'resource_snapshot_stale'
  | 'source_balance_coverage_incomplete'
  | 'native_gas_coverage_incomplete'
  | 'source_balance_insufficient'
  | 'native_gas_balance_insufficient';

export interface RealExecutionResourceRiskAssessment {
  readonly scope: 'real_execution_resource_risk';
  readonly status: 'resources_sufficient' | 'blocked';
  readonly blockers: readonly RealExecutionResourceRiskBlocker[];
  readonly budgetRiskStatus: RealExecutionBudgetRiskAssessment['status'];
  readonly requiredSourceQuantity: string | null;
  readonly availableSourceQuantity: string | null;
  readonly requiredNativeGasQuantity: string | null;
  readonly availableNativeGasQuantity: string | null;
  readonly sourceBalanceSufficient: boolean | null;
  readonly nativeGasBalanceSufficient: boolean | null;
  readonly providerQuotaEvaluated: false;
  readonly durableResourceReservation: false;
  readonly riskApproved: false;
  readonly fundingAuthorized: false;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
  readonly evaluatedAt: Date;
}

export function assessRealExecutionResourceRisk(
  intent: RealExecutionIntent,
  quote: RealExecutionQuote,
  limits: RealExecutionLocalRiskLimits,
  budgetSnapshot: RealExecutionBudgetSnapshot,
  resourceSnapshot: RealExecutionResourceSnapshot,
  freshness: RealExecutionResourceFreshnessPolicy,
  evaluatedAt: Date,
): RealExecutionResourceRiskAssessment {
  validateEvaluationInputs(freshness, evaluatedAt);
  const blockers: RealExecutionResourceRiskBlocker[] = [];
  const budgetRisk = assessRealExecutionBudgetRisk(
    intent,
    quote,
    limits,
    budgetSnapshot,
    freshness.budgetSnapshotMaxAgeMs,
    evaluatedAt,
  );
  addIf(
    blockers,
    budgetRisk.status !== 'within_budget_limits',
    'budget_risk_blocked',
  );

  const snapshotValid = isValidResourceSnapshot(resourceSnapshot);
  addIf(blockers, !snapshotValid, 'invalid_resource_snapshot');

  let availableSourceQuantity: string | null = null;
  let requiredNativeGasQuantity: string | null = null;
  let availableNativeGasQuantity: string | null = null;
  if (snapshotValid) {
    availableSourceQuantity = new ExactDecimal(
      resourceSnapshot.sourceAvailableQuantity,
    ).toFixed();
    requiredNativeGasQuantity = new ExactDecimal(
      resourceSnapshot.nativeGasRequiredQuantity,
    ).toFixed();
    availableNativeGasQuantity = new ExactDecimal(
      resourceSnapshot.nativeGasAvailableQuantity,
    ).toFixed();

    const approved = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
    addIf(
      blockers,
      resourceSnapshot.providerId !== approved.providerId,
      'resource_provider_mismatch',
    );
    addIf(
      blockers,
      resourceSnapshot.chainId !== approved.chainId,
      'resource_chain_mismatch',
    );
    addIf(
      blockers,
      resourceSnapshot.intentId !== intent.id,
      'resource_intent_mismatch',
    );
    addIf(
      blockers,
      resourceSnapshot.quoteId !== quote.id,
      'resource_quote_mismatch',
    );
    addIf(
      blockers,
      resourceSnapshot.sourceTokenAddress.toLowerCase() !==
        intent.sourceAsset.tokenAddress.toLowerCase(),
      'source_token_mismatch',
    );
    addIf(
      blockers,
      intent.sourceAsset.symbol === null ||
        resourceSnapshot.sourceSymbol !== intent.sourceAsset.symbol,
      'source_symbol_mismatch',
    );
    addIf(
      blockers,
      resourceSnapshot.nativeGasSymbol !== 'BNB',
      'native_gas_asset_mismatch',
    );
    const ageMs = evaluatedAt.getTime() - resourceSnapshot.observedAt.getTime();
    addIf(blockers, ageMs < 0, 'resource_snapshot_from_future');
    addIf(
      blockers,
      ageMs > freshness.resourceSnapshotMaxAgeMs,
      'resource_snapshot_stale',
    );
    addIf(
      blockers,
      resourceSnapshot.sourceBalanceCoverage !== 'complete',
      'source_balance_coverage_incomplete',
    );
    addIf(
      blockers,
      resourceSnapshot.nativeGasCoverage !== 'complete',
      'native_gas_coverage_incomplete',
    );
  }

  const requiredSourceQuantity =
    budgetRisk.status === 'within_budget_limits'
      ? deriveRequiredSourceQuantity(intent, quote)
      : null;
  const sourceBalanceSufficient =
    requiredSourceQuantity !== null && availableSourceQuantity !== null
      ? new ExactDecimal(availableSourceQuantity).greaterThanOrEqualTo(
          requiredSourceQuantity,
        )
      : null;
  const nativeGasBalanceSufficient =
    requiredNativeGasQuantity !== null && availableNativeGasQuantity !== null
      ? new ExactDecimal(availableNativeGasQuantity).greaterThanOrEqualTo(
          requiredNativeGasQuantity,
        )
      : null;
  addIf(
    blockers,
    sourceBalanceSufficient === false,
    'source_balance_insufficient',
  );
  addIf(
    blockers,
    nativeGasBalanceSufficient === false,
    'native_gas_balance_insufficient',
  );

  return {
    scope: 'real_execution_resource_risk',
    status: blockers.length === 0 ? 'resources_sufficient' : 'blocked',
    blockers,
    budgetRiskStatus: budgetRisk.status,
    requiredSourceQuantity,
    availableSourceQuantity,
    requiredNativeGasQuantity,
    availableNativeGasQuantity,
    sourceBalanceSufficient,
    nativeGasBalanceSufficient,
    providerQuotaEvaluated: false,
    durableResourceReservation: false,
    riskApproved: false,
    fundingAuthorized: false,
    quoteAuthorized: false,
    submissionAuthorized: false,
    evaluatedAt: new Date(evaluatedAt),
  };
}

function deriveRequiredSourceQuantity(
  intent: RealExecutionIntent,
  quote: RealExecutionQuote,
): string {
  return quote.costs
    .filter((cost) => cost.kind === 'provider_fee')
    .reduce(
      (required, cost) => required.plus(cost.quantity),
      new ExactDecimal(intent.sourceQuantity),
    )
    .toFixed();
}

function isValidResourceSnapshot(
  snapshot: RealExecutionResourceSnapshot,
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
    typeof snapshot.sourceTokenAddress === 'string' &&
    TOKEN_ADDRESS_PATTERN.test(snapshot.sourceTokenAddress) &&
    typeof snapshot.sourceSymbol === 'string' &&
    SYMBOL_PATTERN.test(snapshot.sourceSymbol) &&
    typeof snapshot.sourceAvailableQuantity === 'string' &&
    NON_NEGATIVE_DECIMAL_PATTERN.test(snapshot.sourceAvailableQuantity) &&
    (snapshot.sourceBalanceCoverage === 'complete' ||
      snapshot.sourceBalanceCoverage === 'partial') &&
    typeof snapshot.nativeGasSymbol === 'string' &&
    SYMBOL_PATTERN.test(snapshot.nativeGasSymbol) &&
    typeof snapshot.nativeGasAvailableQuantity === 'string' &&
    NON_NEGATIVE_DECIMAL_PATTERN.test(snapshot.nativeGasAvailableQuantity) &&
    typeof snapshot.nativeGasRequiredQuantity === 'string' &&
    POSITIVE_DECIMAL_PATTERN.test(snapshot.nativeGasRequiredQuantity) &&
    (snapshot.nativeGasCoverage === 'complete' ||
      snapshot.nativeGasCoverage === 'partial') &&
    snapshot.observedAt instanceof Date &&
    Number.isFinite(snapshot.observedAt.getTime())
  );
}

function validateEvaluationInputs(
  freshness: RealExecutionResourceFreshnessPolicy,
  evaluatedAt: Date,
): void {
  if (
    typeof freshness !== 'object' ||
    freshness === null ||
    !validMaximumAge(freshness.budgetSnapshotMaxAgeMs) ||
    !validMaximumAge(freshness.resourceSnapshotMaxAgeMs)
  ) {
    throw new Error(
      'Real execution resource snapshot maximum ages must be between 1 and 60000 ms',
    );
  }
  if (
    !(evaluatedAt instanceof Date) ||
    !Number.isFinite(evaluatedAt.getTime())
  ) {
    throw new Error(
      'Real execution resource risk evaluation time must be valid',
    );
  }
}

function validMaximumAge(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value > 0 &&
    value <= MAXIMUM_RESOURCE_SNAPSHOT_AGE_MS
  );
}

function addIf(
  blockers: RealExecutionResourceRiskBlocker[],
  condition: boolean,
  blocker: RealExecutionResourceRiskBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
