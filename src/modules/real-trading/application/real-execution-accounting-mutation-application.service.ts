import {
  ACCOUNTING_MUTATION_APPLICATION_ACKNOWLEDGMENT,
  AgenticWalletMarketSwapAccountingMutationApplicationRequest,
  AgenticWalletMarketSwapLocalAccountingBalance,
  prepareAgenticWalletMarketSwapAccountingMutationApplication,
} from '../infrastructure/agentic-wallet-market-swap-accounting-mutation-application';
import {
  AgenticWalletMarketSwapAccountingMutationApplicationBlockedError,
  AgenticWalletMarketSwapAccountingMutationApplicationStore,
  AgenticWalletMarketSwapAccountingMutationAuthorizationNotFoundError,
  AppliedAgenticWalletMarketSwapAccountingMutation,
} from '../infrastructure/agentic-wallet-market-swap-accounting-mutation-application.store';
import { AgenticWalletMarketSwapAccountingMutationAuthorizationReadStore } from '../infrastructure/agentic-wallet-market-swap-accounting-mutation-authorization.store';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const HASH = /^0x[0-9a-f]{64}$/;
const ADDRESS = /^0x[0-9a-f]{40}$/;
const DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d*[1-9])?$/;
const KEYS = [
  'applicationId',
  'authorizationId',
  'mutationId',
  'planFingerprint',
  'gateId',
  'transactionHash',
  'acknowledgment',
  'currentBalances',
  'balanceCoverageComplete',
  'balancesObservedAt',
] as const;

export class InvalidRealExecutionAccountingMutationApplicationRequestError extends Error {
  constructor() {
    super('Invalid real execution accounting mutation application request');
    this.name =
      InvalidRealExecutionAccountingMutationApplicationRequestError.name;
  }
}

export class RealExecutionAccountingMutationApplicationService {
  constructor(
    private readonly authorizations: AgenticWalletMarketSwapAccountingMutationAuthorizationReadStore,
    private readonly applications: AgenticWalletMarketSwapAccountingMutationApplicationStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async apply(input: unknown): Promise<{
    readonly scope: 'real_execution_accounting_mutation_application';
    readonly status: 'accounting_mutation_applied';
    readonly appliedMutation: AppliedAgenticWalletMarketSwapAccountingMutation;
    readonly replayed: boolean;
    readonly providerCallStarted: false;
    readonly accountingMutationComplete: true;
    readonly submissionRetryAllowed: false;
  }> {
    const parsed = parse(input);
    const stored = await this.authorizations.getByGateId(parsed.gateId);
    if (stored === null)
      throw new AgenticWalletMarketSwapAccountingMutationAuthorizationNotFoundError();
    const assessment =
      prepareAgenticWalletMarketSwapAccountingMutationApplication(stored, {
        ...parsed,
        preparedAt: this.now(),
      });
    if (assessment.application === null)
      throw new AgenticWalletMarketSwapAccountingMutationApplicationBlockedError(
        assessment.blockers,
      );
    const result = await this.applications.apply(assessment.application);
    return {
      scope: 'real_execution_accounting_mutation_application',
      status: 'accounting_mutation_applied',
      appliedMutation: result.applied,
      replayed: result.replayed,
      providerCallStarted: false,
      accountingMutationComplete: true,
      submissionRetryAllowed: false,
    };
  }
}

function parse(
  input: unknown,
): Omit<
  AgenticWalletMarketSwapAccountingMutationApplicationRequest,
  'preparedAt'
> {
  if (!exact(input, KEYS)) invalid();
  const value = input;
  if (
    !matches(value.applicationId, UUID) ||
    !matches(value.authorizationId, UUID) ||
    !matches(value.mutationId, UUID) ||
    !matches(value.planFingerprint, SHA256) ||
    !matches(value.gateId, UUID) ||
    !matches(value.transactionHash, HASH) ||
    value.acknowledgment !== ACCOUNTING_MUTATION_APPLICATION_ACKNOWLEDGMENT ||
    value.balanceCoverageComplete !== true ||
    !Array.isArray(value.currentBalances) ||
    value.currentBalances.length < 1 ||
    value.currentBalances.length > 20
  )
    invalid();
  const balances = value.currentBalances;
  if (!balances.every(validBalance)) invalid();
  const identities = balances.map(identity);
  if (new Set(identities).size !== identities.length) invalid();
  const observedAt = canonicalDate(value.balancesObservedAt);
  if (observedAt === null) invalid();
  return {
    applicationId: value.applicationId,
    authorizationId: value.authorizationId,
    mutationId: value.mutationId,
    planFingerprint: value.planFingerprint,
    gateId: value.gateId,
    transactionHash: value.transactionHash,
    acknowledgment: ACCOUNTING_MUTATION_APPLICATION_ACKNOWLEDGMENT,
    currentBalances: balances.map((entry) => ({ ...entry })),
    balanceCoverageComplete: true,
    balancesObservedAt: observedAt,
  };
}

function validBalance(
  value: unknown,
): value is AgenticWalletMarketSwapLocalAccountingBalance {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const row = value as Record<string, unknown>;
  const keys =
    row.assetType === 'token'
      ? ['assetType', 'assetAddress', 'currentQuantity']
      : ['assetType', 'assetSymbol', 'currentQuantity'];
  return (
    exact(row, keys) &&
    typeof row.currentQuantity === 'string' &&
    DECIMAL.test(row.currentQuantity) &&
    (row.assetType === 'token'
      ? typeof row.assetAddress === 'string' && ADDRESS.test(row.assetAddress)
      : row.assetType === 'native' && row.assetSymbol === 'BNB')
  );
}

function matches(value: unknown, pattern: RegExp): value is string {
  return typeof value === 'string' && pattern.test(value);
}

function identity(
  value: AgenticWalletMarketSwapLocalAccountingBalance,
): string {
  return value.assetType === 'token'
    ? `token:${value.assetAddress}`
    : `native:${value.assetSymbol}`;
}

function exact(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function canonicalDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value
    ? date
    : null;
}

function invalid(): never {
  throw new InvalidRealExecutionAccountingMutationApplicationRequestError();
}
