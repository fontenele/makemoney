import { prepareAgenticWalletMarketSwapAccountingMutationCommitment } from './agentic-wallet-market-swap-accounting-mutation-commitment';
import {
  StoredAgenticWalletMarketSwapAccountingMutationCommitment,
  isValidStoredAgenticWalletMarketSwapAccountingMutationCommitment,
} from './agentic-wallet-market-swap-accounting-mutation-commitment.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const EVM_TRANSACTION_HASH_PATTERN = /^0x[0-9a-f]{64}$/;

export const ACCOUNTING_MUTATION_AUTHORIZATION_ACKNOWLEDGMENT =
  'durable_reconciliation_and_balance_evidence_reviewed_for_accounting_mutation' as const;

export interface AgenticWalletMarketSwapAccountingMutationAuthorizationRequest {
  readonly authorizationId: string;
  readonly mutationId: string;
  readonly planFingerprint: string;
  readonly gateId: string;
  readonly transactionHash: string;
  readonly acknowledgment: typeof ACCOUNTING_MUTATION_AUTHORIZATION_ACKNOWLEDGMENT;
  readonly authorizedAt: Date;
}

export interface AgenticWalletMarketSwapAccountingMutationAuthorization {
  readonly scope: 'agentic_wallet_market_swap_accounting_mutation_authorization';
  readonly authorizationId: string;
  readonly commitment: StoredAgenticWalletMarketSwapAccountingMutationCommitment;
  readonly acknowledgment: typeof ACCOUNTING_MUTATION_AUTHORIZATION_ACKNOWLEDGMENT;
  readonly authorizedAt: Date;
  readonly financialReconciliationComplete: true;
  readonly accountingMutationRequired: true;
  readonly accountingMutationAuthorized: true;
  readonly accountingMutationComplete: false;
  readonly submissionRetryAllowed: false;
}

export type AgenticWalletMarketSwapAccountingMutationAuthorizationBlocker =
  | 'invalid_stored_accounting_mutation_commitment'
  | 'invalid_accounting_mutation_authorization_request'
  | 'accounting_mutation_authorization_acknowledgment_missing'
  | 'authorization_mutation_mismatch'
  | 'authorization_plan_fingerprint_mismatch'
  | 'authorization_gate_mismatch'
  | 'authorization_transaction_mismatch'
  | 'accounting_mutation_authorization_predates_commitment';

export interface AgenticWalletMarketSwapAccountingMutationAuthorizationAssessment {
  readonly scope: 'agentic_wallet_market_swap_accounting_mutation_authorization_assessment';
  readonly status: 'accounting_mutation_authorization_ready' | 'blocked';
  readonly blockers: readonly AgenticWalletMarketSwapAccountingMutationAuthorizationBlocker[];
  readonly authorization: AgenticWalletMarketSwapAccountingMutationAuthorization | null;
  readonly financialReconciliationComplete: boolean;
  readonly accountingMutationRequired: boolean;
  readonly accountingMutationAuthorized: boolean;
  readonly accountingMutationComplete: false;
  readonly submissionRetryAllowed: false;
}

export function authorizeAgenticWalletMarketSwapAccountingMutation(
  stored: StoredAgenticWalletMarketSwapAccountingMutationCommitment,
  request: AgenticWalletMarketSwapAccountingMutationAuthorizationRequest,
): AgenticWalletMarketSwapAccountingMutationAuthorizationAssessment {
  const blockers: AgenticWalletMarketSwapAccountingMutationAuthorizationBlocker[] =
    [];
  const storedValid =
    isValidStoredAgenticWalletMarketSwapAccountingMutationCommitment(stored);
  const requestValid = isValidRequest(request);
  addIf(
    blockers,
    !storedValid,
    'invalid_stored_accounting_mutation_commitment',
  );
  addIf(
    blockers,
    !requestValid,
    'invalid_accounting_mutation_authorization_request',
  );
  addIf(
    blockers,
    request?.acknowledgment !==
      ACCOUNTING_MUTATION_AUTHORIZATION_ACKNOWLEDGMENT,
    'accounting_mutation_authorization_acknowledgment_missing',
  );

  if (storedValid && requestValid) {
    const commitment = stored.commitment;
    addIf(
      blockers,
      request.mutationId !== commitment.mutationId,
      'authorization_mutation_mismatch',
    );
    addIf(
      blockers,
      request.planFingerprint !== commitment.planFingerprint,
      'authorization_plan_fingerprint_mismatch',
    );
    addIf(
      blockers,
      request.gateId !== commitment.plan.gateId,
      'authorization_gate_mismatch',
    );
    addIf(
      blockers,
      request.transactionHash !== commitment.plan.transactionHash,
      'authorization_transaction_mismatch',
    );
    addIf(
      blockers,
      request.authorizedAt.getTime() < stored.recordedAt.getTime(),
      'accounting_mutation_authorization_predates_commitment',
    );
  }

  const authorization =
    blockers.length === 0 ? buildAuthorization(stored, request) : null;
  return {
    scope:
      'agentic_wallet_market_swap_accounting_mutation_authorization_assessment',
    status:
      authorization === null
        ? 'blocked'
        : 'accounting_mutation_authorization_ready',
    blockers,
    authorization,
    financialReconciliationComplete: storedValid,
    accountingMutationRequired: storedValid,
    accountingMutationAuthorized: authorization !== null,
    accountingMutationComplete: false,
    submissionRetryAllowed: false,
  };
}

function isValidRequest(
  value: AgenticWalletMarketSwapAccountingMutationAuthorizationRequest,
): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    UUID_PATTERN.test(value.authorizationId) &&
    UUID_PATTERN.test(value.mutationId) &&
    SHA256_PATTERN.test(value.planFingerprint) &&
    UUID_PATTERN.test(value.gateId) &&
    EVM_TRANSACTION_HASH_PATTERN.test(value.transactionHash) &&
    value.authorizedAt instanceof Date &&
    Number.isFinite(value.authorizedAt.getTime())
  );
}

function buildAuthorization(
  stored: StoredAgenticWalletMarketSwapAccountingMutationCommitment,
  request: AgenticWalletMarketSwapAccountingMutationAuthorizationRequest,
): AgenticWalletMarketSwapAccountingMutationAuthorization {
  const snapshot = prepareAgenticWalletMarketSwapAccountingMutationCommitment(
    stored.commitment.plan,
    stored.commitment.mutationId,
    stored.commitment.preparedAt,
  ).commitment;
  if (snapshot === null)
    throw new Error('Accounting mutation commitment snapshot is invalid');

  return {
    scope: 'agentic_wallet_market_swap_accounting_mutation_authorization',
    authorizationId: request.authorizationId,
    commitment: {
      commitment: snapshot,
      recordedAt: new Date(stored.recordedAt),
    },
    acknowledgment: ACCOUNTING_MUTATION_AUTHORIZATION_ACKNOWLEDGMENT,
    authorizedAt: new Date(request.authorizedAt),
    financialReconciliationComplete: true,
    accountingMutationRequired: true,
    accountingMutationAuthorized: true,
    accountingMutationComplete: false,
    submissionRetryAllowed: false,
  };
}

function addIf(
  blockers: AgenticWalletMarketSwapAccountingMutationAuthorizationBlocker[],
  condition: boolean,
  blocker: AgenticWalletMarketSwapAccountingMutationAuthorizationBlocker,
): void {
  if (condition) blockers.push(blocker);
}
