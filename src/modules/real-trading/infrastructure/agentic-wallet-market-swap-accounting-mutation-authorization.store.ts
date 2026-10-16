import {
  AgenticWalletMarketSwapAccountingMutationAuthorization,
  AgenticWalletMarketSwapAccountingMutationAuthorizationBlocker,
} from './agentic-wallet-market-swap-accounting-mutation-authorization';

export interface StoredAgenticWalletMarketSwapAccountingMutationAuthorization {
  readonly authorization: AgenticWalletMarketSwapAccountingMutationAuthorization;
  readonly recordedAt: Date;
}

export interface AgenticWalletMarketSwapAccountingMutationAuthorizationStore {
  record(
    authorization: AgenticWalletMarketSwapAccountingMutationAuthorization,
  ): Promise<{
    stored: StoredAgenticWalletMarketSwapAccountingMutationAuthorization;
    replayed: boolean;
  }>;
}

export interface AgenticWalletMarketSwapAccountingMutationAuthorizationReadStore {
  getByGateId(
    gateId: string,
  ): Promise<StoredAgenticWalletMarketSwapAccountingMutationAuthorization | null>;
}

export class AgenticWalletMarketSwapAccountingMutationAuthorizationBlockedError extends Error {
  constructor(
    readonly blockers: readonly AgenticWalletMarketSwapAccountingMutationAuthorizationBlocker[],
  ) {
    super('Agentic Wallet accounting mutation authorization is blocked');
    this.name =
      AgenticWalletMarketSwapAccountingMutationAuthorizationBlockedError.name;
  }
}

export class AgenticWalletMarketSwapAccountingMutationAuthorizationConflictError extends Error {
  constructor() {
    super('Accounting mutation authorization already exists differently');
    this.name =
      AgenticWalletMarketSwapAccountingMutationAuthorizationConflictError.name;
  }
}

export class AgenticWalletMarketSwapAccountingMutationCommitmentNotFoundError extends Error {
  constructor() {
    super('Durable accounting mutation commitment was not found');
    this.name =
      AgenticWalletMarketSwapAccountingMutationCommitmentNotFoundError.name;
  }
}

export class AgenticWalletMarketSwapAccountingMutationAuthorizationIdentityError extends Error {
  constructor() {
    super('Accounting mutation authorization gate identity is invalid');
    this.name =
      AgenticWalletMarketSwapAccountingMutationAuthorizationIdentityError.name;
  }
}
