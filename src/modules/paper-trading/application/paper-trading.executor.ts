import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  PAPER_EXECUTION_REPOSITORY,
  PaperExecutionRepository,
} from '../domain/paper-execution-repository';
import {
  PaperExecution,
  PaperOrderIntent,
  TradingExecutor,
} from '../domain/trading-executor';
import { PaperMarketBuyQuoteService } from './paper-market-buy-quote.service';
import { PaperMarketSellQuoteService } from './paper-market-sell-quote.service';

@Injectable()
export class PaperTradingExecutor implements TradingExecutor {
  private readonly logger = new Logger(PaperTradingExecutor.name);

  constructor(
    private readonly buyQuoteService: PaperMarketBuyQuoteService,
    private readonly sellQuoteService: PaperMarketSellQuoteService,
    @Inject(PAPER_EXECUTION_REPOSITORY)
    private readonly repository: PaperExecutionRepository,
  ) {}

  async execute(intent: PaperOrderIntent): Promise<PaperExecution> {
    validateIntent(intent);
    const existing = await this.repository.find(intent.idempotencyKey);
    if (existing) {
      this.logger.log({
        event: 'paper_trade.execution_replayed',
        id: existing.id,
      });
      return { ...existing, replayed: true };
    }

    const execution =
      intent.side === 'buy'
        ? await this.repository.executeBuy(
            intent.idempotencyKey,
            this.buyQuoteService.quote(intent.quantity),
          )
        : await this.repository.executeSell(
            intent.idempotencyKey,
            this.sellQuoteService.quote(intent.quantity),
          );
    this.logger.log({
      event: `paper_trade.${execution.side}_executed`,
      ...execution,
    });
    return execution;
  }
}

function validateIntent(intent: PaperOrderIntent): void {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(intent.idempotencyKey))
    throw new TypeError('Invalid paper execution idempotency key');
  if (
    intent.symbol !== 'BTC/USDT' ||
    (intent.side !== 'buy' && intent.side !== 'sell')
  )
    throw new TypeError('Unsupported paper order');
}
