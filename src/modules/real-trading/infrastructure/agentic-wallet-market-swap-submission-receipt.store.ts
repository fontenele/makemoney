import { AgenticWalletMarketSwapSubmissionReceipt } from './agentic-wallet-market-swap-submission-response';

export interface StoredAgenticWalletMarketSwapSubmissionReceipt {
  readonly receipt: AgenticWalletMarketSwapSubmissionReceipt;
  readonly recordedAt: Date;
}

export interface AgenticWalletMarketSwapSubmissionReceiptStore {
  record(receipt: AgenticWalletMarketSwapSubmissionReceipt): Promise<{
    stored: StoredAgenticWalletMarketSwapSubmissionReceipt;
    replayed: boolean;
  }>;
}

export class AgenticWalletMarketSwapSubmissionReceiptBlockedError extends Error {
  constructor() {
    super('Agentic Wallet market-swap submission receipt is invalid');
    this.name = AgenticWalletMarketSwapSubmissionReceiptBlockedError.name;
  }
}

export class AgenticWalletMarketSwapSubmissionReceiptGateNotFoundError extends Error {
  constructor() {
    super('Real execution submission gate was not found');
    this.name = AgenticWalletMarketSwapSubmissionReceiptGateNotFoundError.name;
  }
}

export class AgenticWalletMarketSwapSubmissionReceiptConflictError extends Error {
  constructor() {
    super('Submission gate already has a different provider order identity');
    this.name = AgenticWalletMarketSwapSubmissionReceiptConflictError.name;
  }
}

export class AgenticWalletMarketSwapProviderOrderIdentityConflictError extends Error {
  constructor() {
    super(
      'Provider order identity is already bound to another submission gate',
    );
    this.name = AgenticWalletMarketSwapProviderOrderIdentityConflictError.name;
  }
}
