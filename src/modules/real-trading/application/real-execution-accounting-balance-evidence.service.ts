import {
  AgenticWalletMarketSwapAccountingBalanceEvidence,
  AgenticWalletMarketSwapBalanceChange,
  isValidAgenticWalletMarketSwapAccountingBalanceEvidence,
} from '../infrastructure/agentic-wallet-market-swap-accounting-balance-evidence';
import {
  AgenticWalletMarketSwapAccountingBalanceEvidenceStore,
  StoredAgenticWalletMarketSwapAccountingBalanceEvidence,
} from '../infrastructure/agentic-wallet-market-swap-accounting-balance-evidence.store';

const REQUEST_KEYS = [
  'scope',
  'completionEvidenceId',
  'gateId',
  'transactionHash',
  'balanceChanges',
  'coverageComplete',
  'observedAt',
] as const;
const TOKEN_CHANGE_KEYS = [
  'assetType',
  'assetAddress',
  'direction',
  'beforeQuantity',
  'afterQuantity',
  'deltaQuantity',
] as const;
const NATIVE_CHANGE_KEYS = [
  'assetType',
  'assetSymbol',
  'direction',
  'beforeQuantity',
  'afterQuantity',
  'deltaQuantity',
] as const;

export interface RealExecutionAccountingBalanceEvidenceResult {
  readonly scope: 'real_execution_accounting_balance_evidence';
  readonly status: 'accounting_balance_evidence_recorded';
  readonly storedEvidence: StoredAgenticWalletMarketSwapAccountingBalanceEvidence;
  readonly replayed: boolean;
  readonly providerCallStarted: false;
  readonly financialReconciliationComplete: true;
  readonly accountingMutationRequired: true;
  readonly accountingMutationComplete: false;
  readonly submissionRetryAllowed: false;
}

export class InvalidRealExecutionAccountingBalanceEvidenceRequestError extends Error {
  constructor() {
    super('Invalid real execution accounting balance evidence request');
    this.name = InvalidRealExecutionAccountingBalanceEvidenceRequestError.name;
  }
}

export class RealExecutionAccountingBalanceEvidenceService {
  constructor(
    private readonly evidenceStore: AgenticWalletMarketSwapAccountingBalanceEvidenceStore,
  ) {}

  async record(
    input: unknown,
  ): Promise<RealExecutionAccountingBalanceEvidenceResult> {
    const evidence = parseEvidence(input);
    const recorded = await this.evidenceStore.record(evidence);
    return {
      scope: 'real_execution_accounting_balance_evidence',
      status: 'accounting_balance_evidence_recorded',
      storedEvidence: recorded.stored,
      replayed: recorded.replayed,
      providerCallStarted: false,
      financialReconciliationComplete: true,
      accountingMutationRequired: true,
      accountingMutationComplete: false,
      submissionRetryAllowed: false,
    };
  }
}

function parseEvidence(
  input: unknown,
): AgenticWalletMarketSwapAccountingBalanceEvidence {
  if (
    !isExactRecord(input, REQUEST_KEYS) ||
    !Array.isArray(input.balanceChanges)
  )
    throw new InvalidRealExecutionAccountingBalanceEvidenceRequestError();
  if (!input.balanceChanges.every(isExactBalanceChange))
    throw new InvalidRealExecutionAccountingBalanceEvidenceRequestError();
  const observedAt = parseCanonicalDate(input.observedAt);
  const evidence = {
    ...input,
    balanceChanges: input.balanceChanges.map((entry) => ({ ...entry })),
    observedAt,
  } as unknown as AgenticWalletMarketSwapAccountingBalanceEvidence;
  if (
    observedAt === null ||
    !isValidAgenticWalletMarketSwapAccountingBalanceEvidence(evidence)
  )
    throw new InvalidRealExecutionAccountingBalanceEvidenceRequestError();
  return {
    ...evidence,
    balanceChanges: evidence.balanceChanges.map((entry) => ({ ...entry })),
    observedAt: new Date(evidence.observedAt),
  };
}

function isExactBalanceChange(
  value: unknown,
): value is AgenticWalletMarketSwapBalanceChange {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const record = value as Record<string, unknown>;
  return record.assetType === 'token'
    ? isExactRecord(record, TOKEN_CHANGE_KEYS)
    : record.assetType === 'native' &&
        isExactRecord(record, NATIVE_CHANGE_KEYS);
}

function isExactRecord(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const actual = Object.keys(value);
  return (
    actual.length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function parseCanonicalDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value
    ? date
    : null;
}
