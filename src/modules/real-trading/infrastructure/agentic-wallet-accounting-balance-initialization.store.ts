import { AgenticWalletAccountingBalanceInitialization } from './agentic-wallet-accounting-balance-initialization';

export interface InitializedAgenticWalletAccountingBalances {
  readonly scope: 'initialized_agentic_wallet_accounting_balances';
  readonly initialization: AgenticWalletAccountingBalanceInitialization;
  readonly initializedAt: Date;
  readonly accountingBalancesInitialized: true;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
}

export interface AgenticWalletAccountingBalanceInitializationStore {
  initialize(
    initialization: AgenticWalletAccountingBalanceInitialization,
  ): Promise<{
    initialized: InitializedAgenticWalletAccountingBalances;
    replayed: boolean;
  }>;
}

export interface AgenticWalletAccountingBalanceInitializationReadStore {
  getByInitializationId(
    initializationId: string,
  ): Promise<InitializedAgenticWalletAccountingBalances | null>;
}

export class AgenticWalletAccountingBalanceInitializationBlockedError extends Error {
  constructor() {
    super('Agentic Wallet accounting balance initialization is blocked');
    this.name = AgenticWalletAccountingBalanceInitializationBlockedError.name;
  }
}

export class AgenticWalletAccountingBalanceInitializationConflictError extends Error {
  constructor() {
    super('Accounting balances were already initialized differently');
    this.name = AgenticWalletAccountingBalanceInitializationConflictError.name;
  }
}

export class AgenticWalletAccountingBalanceInitializationStaleError extends Error {
  constructor() {
    super('Wallet balance observation is stale at initialization time');
    this.name = AgenticWalletAccountingBalanceInitializationStaleError.name;
  }
}

export class AgenticWalletAccountingBalanceInitializationIdentityError extends Error {
  constructor() {
    super('Accounting balance initialization identity is invalid');
    this.name = AgenticWalletAccountingBalanceInitializationIdentityError.name;
  }
}
