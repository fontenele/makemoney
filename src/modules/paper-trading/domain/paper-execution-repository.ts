import { PaperMarketBuyQuote } from './paper-market-buy-quote';
import { PaperExecution } from './trading-executor';

export const PAPER_EXECUTION_REPOSITORY = Symbol('PAPER_EXECUTION_REPOSITORY');

export interface PaperExecutionRepository {
  find(id: string): Promise<PaperExecution | undefined>;
  executeBuy(id: string, quote: PaperMarketBuyQuote): Promise<PaperExecution>;
}
