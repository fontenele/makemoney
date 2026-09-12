import { PaperMarketBuyQuote } from './paper-market-buy-quote';
import { PaperMarketSellQuote } from './paper-market-sell-quote';
import { PaperExecution } from './trading-executor';

export const PAPER_EXECUTION_REPOSITORY = Symbol('PAPER_EXECUTION_REPOSITORY');

export interface PaperExecutionRepository {
  find(id: string): Promise<PaperExecution | undefined>;
  listRecent(limit: number): Promise<PaperExecution[]>;
  listAllChronological(): Promise<PaperExecution[]>;
  executeBuy(id: string, quote: PaperMarketBuyQuote): Promise<PaperExecution>;
  executeSell(id: string, quote: PaperMarketSellQuote): Promise<PaperExecution>;
}

export class PaperPositionLimitExceededError extends RangeError {
  constructor(readonly limit: string) {
    super('Atomic BTC paper position limit exceeded');
    this.name = PaperPositionLimitExceededError.name;
  }
}
