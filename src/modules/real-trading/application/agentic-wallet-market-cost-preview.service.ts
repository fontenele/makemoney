import { AgenticWalletMarketQuoteService } from './agentic-wallet-market-quote.service';
import { AgenticWalletMarketFeeEvidenceAdapter } from '../infrastructure/agentic-wallet-market-fee-evidence.adapter';

export class MarketCostPreviewInProgressError extends Error {}

export class AgenticWalletMarketCostPreviewService {
  private inFlight = false;
  constructor(
    private readonly quotes: Pick<
      AgenticWalletMarketQuoteService,
      'prepare' | 'finalize'
    >,
    private readonly fees: Pick<AgenticWalletMarketFeeEvidenceAdapter, 'load'>,
    private readonly now: () => Date = () => new Date(),
  ) {}
  async load(request: unknown) {
    if (this.inFlight)
      throw new MarketCostPreviewInProgressError(
        'A market cost preview is already in progress',
      );
    this.inFlight = true;
    try {
      return await this.collect(request);
    } finally {
      this.inFlight = false;
    }
  }
  private async collect(request: unknown) {
    const prepared = await this.quotes.prepare(request);
    if (prepared.intent === null) {
      const blocked = await this.quotes.finalize(prepared);
      return {
        ...blocked,
        scope: 'agentic_wallet_market_cost_preview' as const,
        feeEvidence: null,
        quoteCurrent: false,
        executionBlockers: ['market_quote_blocked'],
      };
    }
    const feeEvidence = await this.fees.load(prepared.intent);
    const quoted = await this.quotes.finalize(prepared);
    const evaluatedAt = this.now();
    if (
      !(evaluatedAt instanceof Date) ||
      !Number.isFinite(evaluatedAt.getTime())
    )
      throw new Error('Market cost evaluation clock is invalid');
    const quoteCurrent =
      quoted.quote !== null &&
      quoted.quote.quotedAt <= evaluatedAt &&
      evaluatedAt < quoted.quote.expiresAt &&
      feeEvidence.observedAt instanceof Date &&
      Number.isFinite(feeEvidence.observedAt.getTime()) &&
      feeEvidence.observedAt <= evaluatedAt &&
      evaluatedAt.getTime() - feeEvidence.observedAt.getTime() <= 5000;
    return {
      ...quoted,
      scope: 'agentic_wallet_market_cost_preview' as const,
      status: quoteCurrent
        ? ('cost_estimates_available' as const)
        : ('blocked' as const),
      blockers:
        quoted.quote === null
          ? quoted.blockers
          : quoteCurrent
            ? []
            : ['quote_or_fee_evidence_expired'],
      feeEvidence,
      quoteCurrent,
      evaluatedAt: new Date(evaluatedAt),
      independentQuoteObservations: true,
      exactCostCoverageComplete: false,
      executionBlockers: [
        'provider_fee_token_debit_unverified',
        'native_gas_quantity_unverified',
        'usd_valuation_required',
        'authenticated_reservation_required',
      ],
    };
  }
}
