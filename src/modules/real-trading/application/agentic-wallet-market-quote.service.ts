import { randomUUID } from 'node:crypto';
import Decimal from 'decimal.js';
import { RealTradingStatusService } from './real-trading-status.service';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT as instrument } from './real-execution-instrument-approval';
import { AgenticWalletMarketQuoteAdapter } from '../infrastructure/agentic-wallet-market-quote.adapter';
import { RealExecutionIntent } from '../domain/real-execution';

const ExactDecimal = Decimal.clone({
  precision: 80,
  toExpNeg: -80,
  toExpPos: 80,
});
const QUANTITY = /^(?:[1-9]\d{0,29}(?:\.\d{1,30})?|0\.\d{0,29}[1-9]\d{0,29})$/;

export class InvalidMarketQuoteRequestError extends Error {}

/** Manual, quote-only entry point; partial fee evidence cannot authorize execution. */
export class AgenticWalletMarketQuoteService {
  constructor(
    private readonly status: Pick<
      RealTradingStatusService,
      'verifyFunding' | 'getLocalStatus'
    >,
    private readonly provider: Pick<AgenticWalletMarketQuoteAdapter, 'load'>,
    private readonly now: () => Date = () => new Date(),
    private readonly createId: () => string = randomUUID,
  ) {}

  async prepare(request: unknown) {
    if (
      typeof request !== 'object' ||
      request === null ||
      Array.isArray(request) ||
      Object.keys(request).length !== 2 ||
      !('side' in request) ||
      (request.side !== 'buy' && request.side !== 'sell') ||
      !('sourceQuantity' in request) ||
      typeof request.sourceQuantity !== 'string' ||
      request.sourceQuantity.length > 61 ||
      !QUANTITY.test(request.sourceQuantity) ||
      !new ExactDecimal(request.sourceQuantity).isPositive()
    )
      throw new InvalidMarketQuoteRequestError(
        'Expected side and a bounded positive sourceQuantity',
      );

    const side = request.side;
    const sourceQuantity = new ExactDecimal(request.sourceQuantity).toFixed();
    const local = this.status.getLocalStatus();
    const limits = { ...local.localRiskLimits.limits };
    const blockers: string[] = [];
    const blocked = () => ({
      scope: 'agentic_wallet_market_quote_readiness' as const,
      status: 'blocked' as const,
      blockers,
      intent: null,
      maximumOrderNotionalUsdt: limits.maximumOrderNotionalUsdt,
      providerCallStarted: false,
      reservationCreated: false,
      riskApproved: false,
      submissionAuthorized: false,
      strategyExecutionAuthorized: false,
      automaticRefresh: false,
    });
    if (
      local.localRiskLimits.status !== 'defined' ||
      limits.maximumSlippageRate === null ||
      limits.maximumOrderNotionalUsdt === null
    ) {
      blockers.push('local_risk_limits_blocked');
      return blocked();
    }
    if (
      side === 'buy' &&
      new ExactDecimal(sourceQuantity).greaterThan(
        limits.maximumOrderNotionalUsdt,
      )
    ) {
      blockers.push('maximum_order_notional_exceeded');
      return blocked();
    }
    const funding = await this.status.verifyFunding();
    if (funding.status !== 'funds_observed')
      blockers.push('funding_verification_blocked');
    const source = side === 'buy' ? instrument.usdt : instrument.btc;
    const target = side === 'buy' ? instrument.btc : instrument.usdt;
    const balance = funding.assets.find(
      (asset) => asset.symbol === source.symbol,
    );
    if (
      balance?.quantity === null ||
      balance?.quantity === undefined ||
      new ExactDecimal(sourceQuantity).greaterThan(balance.quantity)
    ) {
      blockers.push('source_balance_insufficient');
    }
    if (blockers.length) return blocked();

    const id = this.createId();
    const intent: RealExecutionIntent = {
      id,
      idempotencyKey: `manual-quote:${id}`,
      kind: 'market_swap',
      chainId: instrument.chainId,
      sourceAsset: { tokenAddress: source.tokenAddress, symbol: source.symbol },
      targetAsset: { tokenAddress: target.tokenAddress, symbol: target.symbol },
      sourceQuantity,
      maxSlippageRate: limits.maximumSlippageRate,
      createdAt: this.now(),
    };
    return { ...blocked(), status: 'quote_preview_ready' as const, intent };
  }

  async load(request: unknown) {
    return this.finalize(await this.prepare(request));
  }

  async finalize(
    prepared: Awaited<ReturnType<AgenticWalletMarketQuoteService['prepare']>>,
  ) {
    const base = {
      scope: 'agentic_wallet_market_quote' as const,
      status: 'blocked' as const,
      blockers: [...prepared.blockers],
      quote: null,
      providerCallStarted: false,
      reservationCreated: false,
      riskApproved: false,
      submissionAuthorized: false,
      strategyExecutionAuthorized: false,
      automaticRefresh: false,
    };
    if (prepared.intent === null || prepared.maximumOrderNotionalUsdt === null)
      return base;
    const quote = await this.provider.load(prepared.intent);
    if (
      prepared.intent.sourceAsset.symbol === 'BTCB' &&
      new ExactDecimal(quote.expectedTargetQuantity).greaterThan(
        prepared.maximumOrderNotionalUsdt,
      )
    ) {
      return {
        ...base,
        blockers: ['maximum_order_notional_exceeded'],
        providerCallStarted: true,
      };
    }
    return {
      ...base,
      status: 'quote_available' as const,
      quote,
      providerCallStarted: true,
    };
  }
}
