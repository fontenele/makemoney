import {
  AgenticWalletMarketSwapAccountingMutationApplication,
  AgenticWalletMarketSwapAccountingMutationApplicationBlocker,
} from './agentic-wallet-market-swap-accounting-mutation-application';

export interface AppliedAgenticWalletMarketSwapAccountingMutation {
  readonly scope: 'applied_agentic_wallet_market_swap_accounting_mutation';
  readonly application: AgenticWalletMarketSwapAccountingMutationApplication;
  readonly appliedAt: Date;
  readonly financialReconciliationComplete: true;
  readonly accountingMutationRequired: true;
  readonly accountingMutationAuthorized: true;
  readonly accountingMutationPrepared: true;
  readonly accountingMutationComplete: true;
  readonly submissionRetryAllowed: false;
}

export interface AgenticWalletMarketSwapAccountingMutationApplicationStore {
  apply(
    application: AgenticWalletMarketSwapAccountingMutationApplication,
  ): Promise<{
    applied: AppliedAgenticWalletMarketSwapAccountingMutation;
    replayed: boolean;
  }>;
}

export interface AgenticWalletMarketSwapAccountingMutationApplicationReadStore {
  getByGateId(
    gateId: string,
  ): Promise<AppliedAgenticWalletMarketSwapAccountingMutation | null>;
}

export class AgenticWalletMarketSwapAccountingMutationApplicationBlockedError extends Error {
  constructor(
    readonly blockers: readonly AgenticWalletMarketSwapAccountingMutationApplicationBlocker[],
  ) {
    super('Agentic Wallet accounting mutation application is blocked');
    this.name =
      AgenticWalletMarketSwapAccountingMutationApplicationBlockedError.name;
  }
}

export class AgenticWalletMarketSwapAccountingMutationApplicationConflictError extends Error {
  constructor() {
    super('Accounting mutation application already exists differently');
    this.name =
      AgenticWalletMarketSwapAccountingMutationApplicationConflictError.name;
  }
}

export class AgenticWalletMarketSwapAccountingMutationAuthorizationNotFoundError extends Error {
  constructor() {
    super('Durable accounting mutation authorization was not found');
    this.name =
      AgenticWalletMarketSwapAccountingMutationAuthorizationNotFoundError.name;
  }
}

export class AgenticWalletMarketSwapAccountingLedgerMismatchError extends Error {
  constructor() {
    super('Local accounting balances no longer match the authorized plan');
    this.name = AgenticWalletMarketSwapAccountingLedgerMismatchError.name;
  }
}

export class AgenticWalletMarketSwapAccountingMutationApplicationIdentityError extends Error {
  constructor() {
    super('Accounting mutation application gate identity is invalid');
    this.name =
      AgenticWalletMarketSwapAccountingMutationApplicationIdentityError.name;
  }
}
