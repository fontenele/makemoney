import { AgenticWalletMarketSwapStatusObservation } from './agentic-wallet-market-swap-status-response';
import { AgenticWalletMarketSwapStatusTransitionBlocker } from './agentic-wallet-market-swap-status-transition';

export interface StoredAgenticWalletMarketSwapStatusObservation {
  readonly id: string;
  readonly observation: AgenticWalletMarketSwapStatusObservation;
  readonly recordedAt: Date;
}

export interface AgenticWalletMarketSwapStatusObservationStore {
  record(observation: AgenticWalletMarketSwapStatusObservation): Promise<{
    stored: StoredAgenticWalletMarketSwapStatusObservation;
    replayed: boolean;
  }>;
}

export class AgenticWalletMarketSwapStatusObservationBlockedError extends Error {
  constructor(
    readonly blockers: readonly AgenticWalletMarketSwapStatusTransitionBlocker[],
  ) {
    super('Agentic Wallet market-swap status observation is blocked');
    this.name = AgenticWalletMarketSwapStatusObservationBlockedError.name;
  }
}

export class AgenticWalletMarketSwapStatusObservationReceiptNotFoundError extends Error {
  constructor() {
    super('Agentic Wallet market-swap submission receipt was not found');
    this.name =
      AgenticWalletMarketSwapStatusObservationReceiptNotFoundError.name;
  }
}

export class AgenticWalletMarketSwapStatusObservationReceiptMismatchError extends Error {
  constructor() {
    super('Status observation does not match its submission receipt');
    this.name =
      AgenticWalletMarketSwapStatusObservationReceiptMismatchError.name;
  }
}
