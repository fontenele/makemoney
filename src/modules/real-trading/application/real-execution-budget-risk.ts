import Decimal from 'decimal.js';

import {
  RealExecutionIntent,
  RealExecutionQuote,
} from '../domain/real-execution';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from './real-execution-instrument-approval';
import {
  assessRealExecutionLocalRiskLimits,
  RealExecutionLocalRiskLimits,
} from './real-execution-local-risk-limits';
import {
  assessRealExecutionQuoteRisk,
  RealExecutionQuoteRiskAssessment,
} from './real-execution-quote-risk';

const ExactDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});
const PROVIDER_ID_PATTERN = /^[a-z][a-z0-9_-]{0,31}$/;
const CHAIN_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const UTC_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const NON_NEGATIVE_DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const MAXIMUM_BUDGET_SNAPSHOT_AGE_MS = 60_000;

export interface RealExecutionBudgetSnapshot {
  readonly providerId: string;
  readonly chainId: string;
  readonly utcDay: string;
  readonly settledSpendUsdt: string;
  readonly reservedSpendUsdt: string;
  readonly spendCoverage: 'complete' | 'partial';
  readonly bankrollValueUsdt: string;
  readonly bankrollCoverage: 'complete' | 'partial';
  readonly observedAt: Date;
}

export type RealExecutionBudgetRiskBlocker =
  | 'quote_risk_blocked'
  | 'invalid_budget_snapshot'
  | 'budget_provider_mismatch'
  | 'budget_chain_mismatch'
  | 'budget_day_mismatch'
  | 'budget_snapshot_from_future'
  | 'budget_snapshot_stale'
  | 'spend_coverage_incomplete'
  | 'bankroll_coverage_incomplete'
  | 'daily_spend_exceeds_limit'
  | 'bankroll_exceeds_limit'
  | 'quote_charge_exceeds_bankroll';

export interface RealExecutionBudgetRiskAssessment {
  readonly scope: 'real_execution_budget_risk';
  readonly status: 'within_budget_limits' | 'blocked';
  readonly blockers: readonly RealExecutionBudgetRiskBlocker[];
  readonly quoteRiskStatus: RealExecutionQuoteRiskAssessment['status'];
  readonly currentDailySpendUsdt: string | null;
  readonly quoteBudgetChargeUsdt: string | null;
  readonly projectedDailySpendUsdt: string | null;
  readonly bankrollValueUsdt: string | null;
  readonly durableSpendEnforcement: false;
  readonly sourceBalanceEvaluated: false;
  readonly nativeGasBalanceEvaluated: false;
  readonly riskApproved: false;
  readonly fundingAuthorized: false;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
  readonly evaluatedAt: Date;
}

export function assessRealExecutionBudgetRisk(
  intent: RealExecutionIntent,
  quote: RealExecutionQuote,
  limits: RealExecutionLocalRiskLimits,
  snapshot: RealExecutionBudgetSnapshot,
  snapshotMaxAgeMs: number,
  evaluatedAt: Date,
): RealExecutionBudgetRiskAssessment {
  validateEvaluationInputs(snapshotMaxAgeMs, evaluatedAt);
  const blockers: RealExecutionBudgetRiskBlocker[] = [];
  const quoteRisk = assessRealExecutionQuoteRisk(
    intent,
    quote,
    limits,
    evaluatedAt,
  );
  addIf(
    blockers,
    quoteRisk.status !== 'within_quote_limits',
    'quote_risk_blocked',
  );

  const snapshotValid = isValidBudgetSnapshot(snapshot);
  addIf(blockers, !snapshotValid, 'invalid_budget_snapshot');

  let currentDailySpendUsdt: string | null = null;
  let bankrollValueUsdt: string | null = null;
  if (snapshotValid) {
    currentDailySpendUsdt = new ExactDecimal(snapshot.settledSpendUsdt)
      .plus(snapshot.reservedSpendUsdt)
      .toFixed();
    bankrollValueUsdt = new ExactDecimal(snapshot.bankrollValueUsdt).toFixed();

    const approved = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
    addIf(
      blockers,
      snapshot.providerId !== approved.providerId,
      'budget_provider_mismatch',
    );
    addIf(
      blockers,
      snapshot.chainId !== approved.chainId,
      'budget_chain_mismatch',
    );
    addIf(
      blockers,
      snapshot.utcDay !== utcDay(evaluatedAt),
      'budget_day_mismatch',
    );
    const ageMs = evaluatedAt.getTime() - snapshot.observedAt.getTime();
    addIf(blockers, ageMs < 0, 'budget_snapshot_from_future');
    addIf(blockers, ageMs > snapshotMaxAgeMs, 'budget_snapshot_stale');
    addIf(
      blockers,
      snapshot.spendCoverage !== 'complete',
      'spend_coverage_incomplete',
    );
    addIf(
      blockers,
      snapshot.bankrollCoverage !== 'complete',
      'bankroll_coverage_incomplete',
    );
  }

  const quoteBudgetChargeUsdt = deriveQuoteBudgetCharge(quoteRisk);
  const projectedDailySpendUsdt =
    currentDailySpendUsdt !== null && quoteBudgetChargeUsdt !== null
      ? new ExactDecimal(currentDailySpendUsdt)
          .plus(quoteBudgetChargeUsdt)
          .toFixed()
      : null;

  const limitsDefined =
    assessRealExecutionLocalRiskLimits(limits).status === 'defined';
  if (limitsDefined && snapshotValid) {
    if (projectedDailySpendUsdt !== null) {
      addIf(
        blockers,
        new ExactDecimal(projectedDailySpendUsdt).greaterThan(
          limits.maximumDailySpendUsdt!,
        ),
        'daily_spend_exceeds_limit',
      );
    }
    addIf(
      blockers,
      new ExactDecimal(snapshot.bankrollValueUsdt).greaterThan(
        limits.maximumBankrollUsdt!,
      ),
      'bankroll_exceeds_limit',
    );
    if (quoteBudgetChargeUsdt !== null) {
      addIf(
        blockers,
        new ExactDecimal(quoteBudgetChargeUsdt).greaterThan(
          snapshot.bankrollValueUsdt,
        ),
        'quote_charge_exceeds_bankroll',
      );
    }
  }

  return {
    scope: 'real_execution_budget_risk',
    status: blockers.length === 0 ? 'within_budget_limits' : 'blocked',
    blockers,
    quoteRiskStatus: quoteRisk.status,
    currentDailySpendUsdt,
    quoteBudgetChargeUsdt,
    projectedDailySpendUsdt,
    bankrollValueUsdt,
    durableSpendEnforcement: false,
    sourceBalanceEvaluated: false,
    nativeGasBalanceEvaluated: false,
    riskApproved: false,
    fundingAuthorized: false,
    quoteAuthorized: false,
    submissionAuthorized: false,
    evaluatedAt: new Date(evaluatedAt),
  };
}

function deriveQuoteBudgetCharge(
  quoteRisk: RealExecutionQuoteRiskAssessment,
): string | null {
  if (
    quoteRisk.status !== 'within_quote_limits' ||
    quoteRisk.orderNotionalUsdt === null ||
    quoteRisk.providerFeeRate === null ||
    quoteRisk.networkFeeUsdt === null
  ) {
    return null;
  }
  const notional = new ExactDecimal(quoteRisk.orderNotionalUsdt);
  return notional
    .plus(notional.times(quoteRisk.providerFeeRate))
    .plus(quoteRisk.networkFeeUsdt)
    .toFixed();
}

function isValidBudgetSnapshot(snapshot: RealExecutionBudgetSnapshot): boolean {
  return (
    typeof snapshot === 'object' &&
    snapshot !== null &&
    typeof snapshot.providerId === 'string' &&
    PROVIDER_ID_PATTERN.test(snapshot.providerId) &&
    typeof snapshot.chainId === 'string' &&
    CHAIN_ID_PATTERN.test(snapshot.chainId) &&
    typeof snapshot.utcDay === 'string' &&
    isCanonicalUtcDay(snapshot.utcDay) &&
    typeof snapshot.settledSpendUsdt === 'string' &&
    NON_NEGATIVE_DECIMAL_PATTERN.test(snapshot.settledSpendUsdt) &&
    typeof snapshot.reservedSpendUsdt === 'string' &&
    NON_NEGATIVE_DECIMAL_PATTERN.test(snapshot.reservedSpendUsdt) &&
    (snapshot.spendCoverage === 'complete' ||
      snapshot.spendCoverage === 'partial') &&
    typeof snapshot.bankrollValueUsdt === 'string' &&
    NON_NEGATIVE_DECIMAL_PATTERN.test(snapshot.bankrollValueUsdt) &&
    (snapshot.bankrollCoverage === 'complete' ||
      snapshot.bankrollCoverage === 'partial') &&
    snapshot.observedAt instanceof Date &&
    Number.isFinite(snapshot.observedAt.getTime())
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

function validateEvaluationInputs(
  snapshotMaxAgeMs: number,
  evaluatedAt: Date,
): void {
  if (
    !Number.isInteger(snapshotMaxAgeMs) ||
    snapshotMaxAgeMs <= 0 ||
    snapshotMaxAgeMs > MAXIMUM_BUDGET_SNAPSHOT_AGE_MS
  ) {
    throw new Error(
      'Real execution budget snapshot maximum age must be between 1 and 60000 ms',
    );
  }
  if (
    !(evaluatedAt instanceof Date) ||
    !Number.isFinite(evaluatedAt.getTime())
  ) {
    throw new Error('Real execution budget risk evaluation time must be valid');
  }
}

function addIf(
  blockers: RealExecutionBudgetRiskBlocker[],
  condition: boolean,
  blocker: RealExecutionBudgetRiskBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
