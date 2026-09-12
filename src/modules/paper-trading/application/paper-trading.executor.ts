import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  RISK_ENGINE,
  RiskAssessment,
  RiskEngine,
} from '../../risk-engine/domain/risk-engine';
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
    @Inject(RISK_ENGINE) private readonly riskEngine: RiskEngine,
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

    let execution: PaperExecution;
    if (intent.side === 'buy') {
      const quote = this.buyQuoteService.quote(intent.quantity);
      this.assertRiskApproved(intent, quote);
      execution = await this.repository.executeBuy(
        intent.idempotencyKey,
        quote,
      );
    } else {
      const quote = this.sellQuoteService.quote(intent.quantity);
      this.assertRiskApproved(intent, quote);
      execution = await this.repository.executeSell(
        intent.idempotencyKey,
        quote,
      );
    }
    this.logger.log({
      event: `paper_trade.${execution.side}_executed`,
      ...execution,
    });
    return execution;
  }

  private assertRiskApproved(
    intent: PaperOrderIntent,
    quote: { quantity: string; notional: string },
  ): void {
    const assessment = this.riskEngine.assess({
      id: intent.idempotencyKey,
      symbol: intent.symbol,
      side: intent.side,
      quantity: quote.quantity,
      notional: quote.notional,
    });
    if (assessment.decision === 'rejected') {
      throw new PaperOrderRiskRejectedError(assessment);
    }
  }
}

export class PaperOrderRiskRejectedError extends Error {
  constructor(
    readonly assessment: Extract<RiskAssessment, { decision: 'rejected' }>,
  ) {
    super(`Paper order rejected by risk: ${assessment.reason}`);
    this.name = PaperOrderRiskRejectedError.name;
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
