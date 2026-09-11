import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  PAPER_EXECUTION_REPOSITORY,
  PaperExecutionRepository,
} from '../domain/paper-execution-repository';
import {
  PaperBuyIntent,
  PaperExecution,
  TradingExecutor,
} from '../domain/trading-executor';
import { PaperMarketBuyQuoteService } from './paper-market-buy-quote.service';

@Injectable()
export class PaperTradingExecutor implements TradingExecutor {
  private readonly logger = new Logger(PaperTradingExecutor.name);

  constructor(
    private readonly quoteService: PaperMarketBuyQuoteService,
    @Inject(PAPER_EXECUTION_REPOSITORY)
    private readonly repository: PaperExecutionRepository,
  ) {}

  async execute(intent: PaperBuyIntent): Promise<PaperExecution> {
    validateIntent(intent);
    const existing = await this.repository.find(intent.idempotencyKey);
    if (existing) {
      this.logger.log({
        event: 'paper_trade.execution_replayed',
        id: existing.id,
      });
      return { ...existing, replayed: true };
    }

    const quote = this.quoteService.quote(intent.quantity);
    const execution = await this.repository.executeBuy(
      intent.idempotencyKey,
      quote,
    );
    this.logger.log({ event: 'paper_trade.buy_executed', ...execution });
    return execution;
  }
}

function validateIntent(intent: PaperBuyIntent): void {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(intent.idempotencyKey))
    throw new TypeError('Invalid paper execution idempotency key');
  if (intent.symbol !== 'BTC/USDT' || intent.side !== 'buy')
    throw new TypeError('Unsupported paper order');
}
