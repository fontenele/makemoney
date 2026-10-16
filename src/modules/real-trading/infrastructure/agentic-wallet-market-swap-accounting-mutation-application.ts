import { AgenticWalletMarketSwapBalanceChange } from './agentic-wallet-market-swap-accounting-balance-evidence';
import { StoredAgenticWalletMarketSwapAccountingMutationAuthorization } from './agentic-wallet-market-swap-accounting-mutation-authorization.store';
import { isValidStoredAgenticWalletMarketSwapAccountingMutationAuthorization } from './agentic-wallet-market-swap-accounting-mutation-authorization.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const EVM_ADDRESS_PATTERN = /^0x[0-9a-f]{40}$/;
const EVM_TRANSACTION_HASH_PATTERN = /^0x[0-9a-f]{64}$/;
const CANONICAL_DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d*[1-9])?$/;

export const ACCOUNTING_MUTATION_APPLICATION_ACKNOWLEDGMENT =
  'authorized_transitions_and_current_ledger_balances_reviewed_for_atomic_application' as const;

export type AgenticWalletMarketSwapLocalAccountingBalance =
  | {
      readonly assetType: 'token';
      readonly assetAddress: string;
      readonly currentQuantity: string;
    }
  | {
      readonly assetType: 'native';
      readonly assetSymbol: 'BNB';
      readonly currentQuantity: string;
    };

export interface AgenticWalletMarketSwapAccountingMutationApplicationRequest {
  readonly applicationId: string;
  readonly authorizationId: string;
  readonly mutationId: string;
  readonly planFingerprint: string;
  readonly gateId: string;
  readonly transactionHash: string;
  readonly acknowledgment: typeof ACCOUNTING_MUTATION_APPLICATION_ACKNOWLEDGMENT;
  readonly currentBalances: readonly AgenticWalletMarketSwapLocalAccountingBalance[];
  readonly balanceCoverageComplete: true;
  readonly balancesObservedAt: Date;
  readonly preparedAt: Date;
}

export interface AgenticWalletMarketSwapAccountingMutationApplication {
  readonly scope: 'agentic_wallet_market_swap_accounting_mutation_application';
  readonly applicationId: string;
  readonly authorizationId: string;
  readonly mutationId: string;
  readonly planFingerprint: string;
  readonly gateId: string;
  readonly transactionHash: string;
  readonly acknowledgment: typeof ACCOUNTING_MUTATION_APPLICATION_ACKNOWLEDGMENT;
  readonly currentBalances: readonly AgenticWalletMarketSwapLocalAccountingBalance[];
  readonly balanceTransitions: readonly AgenticWalletMarketSwapBalanceChange[];
  readonly authorizationRecordedAt: Date;
  readonly balancesObservedAt: Date;
  readonly preparedAt: Date;
  readonly financialReconciliationComplete: true;
  readonly accountingMutationRequired: true;
  readonly accountingMutationAuthorized: true;
  readonly accountingMutationPrepared: true;
  readonly accountingMutationComplete: false;
  readonly submissionRetryAllowed: false;
}

export type AgenticWalletMarketSwapAccountingMutationApplicationBlocker =
  | 'invalid_stored_accounting_mutation_authorization'
  | 'invalid_accounting_mutation_application_request'
  | 'accounting_mutation_application_acknowledgment_missing'
  | 'application_authorization_mismatch'
  | 'application_mutation_mismatch'
  | 'application_plan_fingerprint_mismatch'
  | 'application_gate_mismatch'
  | 'application_transaction_mismatch'
  | 'ledger_balance_coverage_mismatch'
  | 'ledger_current_balance_mismatch'
  | 'ledger_balances_predate_authorization'
  | 'accounting_mutation_application_predates_balances';

export interface AgenticWalletMarketSwapAccountingMutationApplicationAssessment {
  readonly scope: 'agentic_wallet_market_swap_accounting_mutation_application_assessment';
  readonly status: 'accounting_mutation_application_ready' | 'blocked';
  readonly blockers: readonly AgenticWalletMarketSwapAccountingMutationApplicationBlocker[];
  readonly application: AgenticWalletMarketSwapAccountingMutationApplication | null;
  readonly financialReconciliationComplete: boolean;
  readonly accountingMutationRequired: boolean;
  readonly accountingMutationAuthorized: boolean;
  readonly accountingMutationPrepared: boolean;
  readonly accountingMutationComplete: false;
  readonly submissionRetryAllowed: false;
}

export function prepareAgenticWalletMarketSwapAccountingMutationApplication(
  stored: StoredAgenticWalletMarketSwapAccountingMutationAuthorization,
  request: AgenticWalletMarketSwapAccountingMutationApplicationRequest,
): AgenticWalletMarketSwapAccountingMutationApplicationAssessment {
  const blockers: AgenticWalletMarketSwapAccountingMutationApplicationBlocker[] =
    [];
  const storedValid =
    isValidStoredAgenticWalletMarketSwapAccountingMutationAuthorization(stored);
  const requestValid = isValidRequest(request);
  addIf(
    blockers,
    !storedValid,
    'invalid_stored_accounting_mutation_authorization',
  );
  addIf(
    blockers,
    !requestValid,
    'invalid_accounting_mutation_application_request',
  );
  addIf(
    blockers,
    request?.acknowledgment !== ACCOUNTING_MUTATION_APPLICATION_ACKNOWLEDGMENT,
    'accounting_mutation_application_acknowledgment_missing',
  );

  if (storedValid && requestValid) {
    const authorization = stored.authorization;
    const commitment = authorization.commitment.commitment;
    addIf(
      blockers,
      request.authorizationId !== authorization.authorizationId,
      'application_authorization_mismatch',
    );
    addIf(
      blockers,
      request.mutationId !== commitment.mutationId,
      'application_mutation_mismatch',
    );
    addIf(
      blockers,
      request.planFingerprint !== commitment.planFingerprint,
      'application_plan_fingerprint_mismatch',
    );
    addIf(
      blockers,
      request.gateId !== commitment.plan.gateId,
      'application_gate_mismatch',
    );
    addIf(
      blockers,
      request.transactionHash !== commitment.plan.transactionHash,
      'application_transaction_mismatch',
    );

    const currentByIdentity = new Map(
      request.currentBalances.map((balance) => [identity(balance), balance]),
    );
    const transitions = commitment.plan.balanceTransitions;
    addIf(
      blockers,
      currentByIdentity.size !== transitions.length ||
        transitions.some(
          (transition) => !currentByIdentity.has(identity(transition)),
        ),
      'ledger_balance_coverage_mismatch',
    );
    addIf(
      blockers,
      transitions.some(
        (transition) =>
          currentByIdentity.get(identity(transition))?.currentQuantity !==
          transition.beforeQuantity,
      ),
      'ledger_current_balance_mismatch',
    );
    addIf(
      blockers,
      request.balancesObservedAt.getTime() < stored.recordedAt.getTime(),
      'ledger_balances_predate_authorization',
    );
    addIf(
      blockers,
      request.preparedAt.getTime() < request.balancesObservedAt.getTime(),
      'accounting_mutation_application_predates_balances',
    );
  }

  const application =
    blockers.length === 0 ? buildApplication(stored, request) : null;
  return {
    scope:
      'agentic_wallet_market_swap_accounting_mutation_application_assessment',
    status:
      application === null
        ? 'blocked'
        : 'accounting_mutation_application_ready',
    blockers,
    application,
    financialReconciliationComplete: storedValid,
    accountingMutationRequired: storedValid,
    accountingMutationAuthorized: storedValid,
    accountingMutationPrepared: application !== null,
    accountingMutationComplete: false,
    submissionRetryAllowed: false,
  };
}

function isValidRequest(
  value: AgenticWalletMarketSwapAccountingMutationApplicationRequest,
): boolean {
  if (
    typeof value !== 'object' ||
    value === null ||
    !UUID_PATTERN.test(value.applicationId) ||
    !UUID_PATTERN.test(value.authorizationId) ||
    !UUID_PATTERN.test(value.mutationId) ||
    !SHA256_PATTERN.test(value.planFingerprint) ||
    !UUID_PATTERN.test(value.gateId) ||
    !EVM_TRANSACTION_HASH_PATTERN.test(value.transactionHash) ||
    !Array.isArray(value.currentBalances) ||
    value.currentBalances.length < 1 ||
    value.currentBalances.length > 20 ||
    value.balanceCoverageComplete !== true ||
    !(value.balancesObservedAt instanceof Date) ||
    !Number.isFinite(value.balancesObservedAt.getTime()) ||
    !(value.preparedAt instanceof Date) ||
    !Number.isFinite(value.preparedAt.getTime())
  )
    return false;

  const identities = new Set<string>();
  for (const raw of value.currentBalances as unknown[]) {
    if (!isValidBalance(raw)) return false;
    const key = identity(raw);
    if (identities.has(key)) return false;
    identities.add(key);
  }
  return true;
}

function isValidBalance(
  value: unknown,
): value is AgenticWalletMarketSwapLocalAccountingBalance {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const balance = value as Record<string, unknown>;
  return (
    (balance.assetType === 'token'
      ? typeof balance.assetAddress === 'string' &&
        EVM_ADDRESS_PATTERN.test(balance.assetAddress)
      : balance.assetType === 'native' && balance.assetSymbol === 'BNB') &&
    typeof balance.currentQuantity === 'string' &&
    CANONICAL_DECIMAL_PATTERN.test(balance.currentQuantity)
  );
}

function buildApplication(
  stored: StoredAgenticWalletMarketSwapAccountingMutationAuthorization,
  request: AgenticWalletMarketSwapAccountingMutationApplicationRequest,
): AgenticWalletMarketSwapAccountingMutationApplication {
  const authorization = stored.authorization;
  const commitment = authorization.commitment.commitment;
  return {
    scope: 'agentic_wallet_market_swap_accounting_mutation_application',
    applicationId: request.applicationId,
    authorizationId: authorization.authorizationId,
    mutationId: commitment.mutationId,
    planFingerprint: commitment.planFingerprint,
    gateId: commitment.plan.gateId,
    transactionHash: commitment.plan.transactionHash,
    acknowledgment: ACCOUNTING_MUTATION_APPLICATION_ACKNOWLEDGMENT,
    currentBalances: request.currentBalances
      .map((balance) => ({ ...balance }))
      .sort((left, right) => identity(left).localeCompare(identity(right))),
    balanceTransitions: commitment.plan.balanceTransitions
      .map((transition) => ({ ...transition }))
      .sort((left, right) => identity(left).localeCompare(identity(right))),
    authorizationRecordedAt: new Date(stored.recordedAt),
    balancesObservedAt: new Date(request.balancesObservedAt),
    preparedAt: new Date(request.preparedAt),
    financialReconciliationComplete: true,
    accountingMutationRequired: true,
    accountingMutationAuthorized: true,
    accountingMutationPrepared: true,
    accountingMutationComplete: false,
    submissionRetryAllowed: false,
  };
}

function identity(
  value:
    | AgenticWalletMarketSwapLocalAccountingBalance
    | AgenticWalletMarketSwapBalanceChange,
): string {
  return value.assetType === 'token'
    ? `token:${value.assetAddress}`
    : `native:${value.assetSymbol}`;
}

function addIf(
  blockers: AgenticWalletMarketSwapAccountingMutationApplicationBlocker[],
  condition: boolean,
  blocker: AgenticWalletMarketSwapAccountingMutationApplicationBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
