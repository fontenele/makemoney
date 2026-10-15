import { createHash } from 'node:crypto';

import {
  AgenticWalletMarketSwapBalanceChange,
  isValidAgenticWalletMarketSwapAccountingBalanceEvidence,
} from './agentic-wallet-market-swap-accounting-balance-evidence';
import { AgenticWalletMarketSwapAccountingMutationPlan } from './agentic-wallet-market-swap-accounting-mutation-plan';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export type AgenticWalletMarketSwapAccountingMutationCommitmentBlocker =
  | 'invalid_accounting_mutation_commitment'
  | 'invalid_accounting_mutation_plan'
  | 'invalid_accounting_mutation_identity'
  | 'invalid_accounting_mutation_prepared_at'
  | 'accounting_mutation_preparation_predates_evidence';

export interface AgenticWalletMarketSwapAccountingMutationCommitment {
  readonly scope: 'agentic_wallet_market_swap_accounting_mutation_commitment';
  readonly mutationId: string;
  readonly planFingerprint: string;
  readonly plan: AgenticWalletMarketSwapAccountingMutationPlan;
  readonly preparedAt: Date;
  readonly financialReconciliationComplete: true;
  readonly accountingMutationRequired: true;
  readonly accountingMutationAuthorized: false;
  readonly accountingMutationComplete: false;
  readonly submissionRetryAllowed: false;
}

export interface AgenticWalletMarketSwapAccountingMutationCommitmentAssessment {
  readonly scope: 'agentic_wallet_market_swap_accounting_mutation_commitment_assessment';
  readonly status: 'accounting_mutation_commitment_ready' | 'blocked';
  readonly blockers: readonly AgenticWalletMarketSwapAccountingMutationCommitmentBlocker[];
  readonly commitment: AgenticWalletMarketSwapAccountingMutationCommitment | null;
  readonly financialReconciliationComplete: boolean;
  readonly accountingMutationRequired: boolean;
  readonly accountingMutationAuthorized: false;
  readonly accountingMutationComplete: false;
  readonly submissionRetryAllowed: false;
}

export function prepareAgenticWalletMarketSwapAccountingMutationCommitment(
  plan: AgenticWalletMarketSwapAccountingMutationPlan,
  mutationId: string,
  preparedAt: Date,
): AgenticWalletMarketSwapAccountingMutationCommitmentAssessment {
  const blockers: AgenticWalletMarketSwapAccountingMutationCommitmentBlocker[] =
    [];
  const planValid = isValidPlan(plan);
  addIf(blockers, !planValid, 'invalid_accounting_mutation_plan');
  addIf(
    blockers,
    typeof mutationId !== 'string' || !UUID_PATTERN.test(mutationId),
    'invalid_accounting_mutation_identity',
  );
  const preparedAtValid =
    preparedAt instanceof Date && Number.isFinite(preparedAt.getTime());
  addIf(blockers, !preparedAtValid, 'invalid_accounting_mutation_prepared_at');
  addIf(
    blockers,
    planValid &&
      preparedAtValid &&
      preparedAt.getTime() < plan.evidenceRecordedAt.getTime(),
    'accounting_mutation_preparation_predates_evidence',
  );

  if (blockers.length > 0) return result(blockers, null, planValid);

  const committedPlan = snapshotPlan(plan);
  return result(
    [],
    {
      scope: 'agentic_wallet_market_swap_accounting_mutation_commitment',
      mutationId,
      planFingerprint: fingerprint(committedPlan),
      plan: committedPlan,
      preparedAt: new Date(preparedAt),
      financialReconciliationComplete: true,
      accountingMutationRequired: true,
      accountingMutationAuthorized: false,
      accountingMutationComplete: false,
      submissionRetryAllowed: false,
    },
    true,
  );
}

export function isValidAgenticWalletMarketSwapAccountingMutationCommitment(
  value: unknown,
): value is AgenticWalletMarketSwapAccountingMutationCommitment {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const commitment = value as Record<string, unknown>;
  const assessment = prepareAgenticWalletMarketSwapAccountingMutationCommitment(
    commitment.plan as AgenticWalletMarketSwapAccountingMutationPlan,
    commitment.mutationId as string,
    commitment.preparedAt as Date,
  );
  return (
    commitment.scope ===
      'agentic_wallet_market_swap_accounting_mutation_commitment' &&
    typeof commitment.planFingerprint === 'string' &&
    SHA256_PATTERN.test(commitment.planFingerprint) &&
    commitment.financialReconciliationComplete === true &&
    commitment.accountingMutationRequired === true &&
    commitment.accountingMutationAuthorized === false &&
    commitment.accountingMutationComplete === false &&
    commitment.submissionRetryAllowed === false &&
    assessment.commitment !== null &&
    assessment.commitment.planFingerprint === commitment.planFingerprint
  );
}

function isValidPlan(
  value: AgenticWalletMarketSwapAccountingMutationPlan,
): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const evidenceValid = isValidAgenticWalletMarketSwapAccountingBalanceEvidence(
    {
      scope: 'agentic_wallet_market_swap_accounting_balance_evidence',
      completionEvidenceId: value.completionEvidenceId,
      gateId: value.gateId,
      transactionHash: value.transactionHash,
      balanceChanges: value.balanceTransitions,
      coverageComplete: true,
      observedAt: value.evidenceObservedAt,
    },
  );
  return (
    value.scope === 'agentic_wallet_market_swap_accounting_mutation_plan' &&
    UUID_PATTERN.test(value.accountingEvidenceId) &&
    evidenceValid &&
    value.evidenceRecordedAt instanceof Date &&
    Number.isFinite(value.evidenceRecordedAt.getTime()) &&
    value.evidenceRecordedAt.getTime() >= value.evidenceObservedAt.getTime() &&
    value.financialReconciliationComplete === true &&
    value.accountingMutationRequired === true &&
    value.accountingMutationAuthorized === false &&
    value.accountingMutationComplete === false &&
    value.submissionRetryAllowed === false
  );
}

function snapshotPlan(
  plan: AgenticWalletMarketSwapAccountingMutationPlan,
): AgenticWalletMarketSwapAccountingMutationPlan {
  return {
    ...plan,
    balanceTransitions: plan.balanceTransitions
      .map(canonicalTransition)
      .sort((left, right) =>
        balanceIdentity(left).localeCompare(balanceIdentity(right)),
      ),
    evidenceObservedAt: new Date(plan.evidenceObservedAt),
    evidenceRecordedAt: new Date(plan.evidenceRecordedAt),
  };
}

function canonicalTransition(
  transition: AgenticWalletMarketSwapBalanceChange,
): AgenticWalletMarketSwapBalanceChange {
  const quantities = {
    direction: transition.direction,
    beforeQuantity: transition.beforeQuantity,
    afterQuantity: transition.afterQuantity,
    deltaQuantity: transition.deltaQuantity,
  };
  return transition.assetType === 'token'
    ? {
        assetType: 'token',
        assetAddress: transition.assetAddress,
        ...quantities,
      }
    : {
        assetType: 'native',
        assetSymbol: transition.assetSymbol,
        ...quantities,
      };
}

function fingerprint(
  plan: AgenticWalletMarketSwapAccountingMutationPlan,
): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        scope: plan.scope,
        accountingEvidenceId: plan.accountingEvidenceId,
        completionEvidenceId: plan.completionEvidenceId,
        gateId: plan.gateId,
        transactionHash: plan.transactionHash,
        balanceTransitions: plan.balanceTransitions,
        evidenceObservedAt: plan.evidenceObservedAt.toISOString(),
        evidenceRecordedAt: plan.evidenceRecordedAt.toISOString(),
        financialReconciliationComplete: plan.financialReconciliationComplete,
        accountingMutationRequired: plan.accountingMutationRequired,
        accountingMutationAuthorized: plan.accountingMutationAuthorized,
        accountingMutationComplete: plan.accountingMutationComplete,
        submissionRetryAllowed: plan.submissionRetryAllowed,
      }),
    )
    .digest('hex');
}

function balanceIdentity(
  transition: AgenticWalletMarketSwapBalanceChange,
): string {
  return transition.assetType === 'token'
    ? `token:${transition.assetAddress}`
    : `native:${transition.assetSymbol}`;
}

function result(
  blockers: readonly AgenticWalletMarketSwapAccountingMutationCommitmentBlocker[],
  commitment: AgenticWalletMarketSwapAccountingMutationCommitment | null,
  planValid: boolean,
): AgenticWalletMarketSwapAccountingMutationCommitmentAssessment {
  return {
    scope:
      'agentic_wallet_market_swap_accounting_mutation_commitment_assessment',
    status:
      commitment === null ? 'blocked' : 'accounting_mutation_commitment_ready',
    blockers,
    commitment,
    financialReconciliationComplete: planValid,
    accountingMutationRequired: planValid,
    accountingMutationAuthorized: false,
    accountingMutationComplete: false,
    submissionRetryAllowed: false,
  };
}

function addIf(
  blockers: AgenticWalletMarketSwapAccountingMutationCommitmentBlocker[],
  condition: boolean,
  blocker: AgenticWalletMarketSwapAccountingMutationCommitmentBlocker,
): void {
  if (condition) blockers.push(blocker);
}
