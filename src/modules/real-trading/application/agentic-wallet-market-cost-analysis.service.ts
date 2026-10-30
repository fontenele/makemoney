import { AgenticWalletMarketCostPreviewService } from './agentic-wallet-market-cost-preview.service';
import { RealTradingStatusService } from './real-trading-status.service';
import {
  analyzeMarketCostEstimates,
  ExplicitMarketUsdValuation,
  InvalidMarketCostAnalysisRequestError,
  validMarketUsdValuation,
} from './agentic-wallet-market-cost-analysis';

export class AgenticWalletMarketCostAnalysisService {
  constructor(
    private readonly previews: Pick<
      AgenticWalletMarketCostPreviewService,
      'load'
    >,
    private readonly status: Pick<RealTradingStatusService, 'getLocalStatus'>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async load(request: unknown) {
    if (
      typeof request !== 'object' ||
      request === null ||
      Array.isArray(request) ||
      Object.keys(request).length !== 3 ||
      !('side' in request) ||
      !('sourceQuantity' in request) ||
      !('valuation' in request)
    )
      throw new InvalidMarketCostAnalysisRequestError(
        'Expected side, sourceQuantity, and explicit valuation',
      );
    const raw = request.valuation;
    if (
      typeof raw !== 'object' ||
      raw === null ||
      Array.isArray(raw) ||
      Object.keys(raw).length !== 4 ||
      !('usdtUsd' in raw) ||
      !('bnbUsd' in raw) ||
      !('source' in raw) ||
      !('observedAt' in raw) ||
      typeof raw.observedAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(raw.observedAt)
    )
      throw new InvalidMarketCostAnalysisRequestError(
        'Explicit valuation fields are invalid',
      );
    const valuation = {
      usdtUsd: raw.usdtUsd,
      bnbUsd: raw.bnbUsd,
      source: raw.source,
      observedAt: new Date(raw.observedAt),
    } as ExplicitMarketUsdValuation;
    if (
      !validMarketUsdValuation(valuation, this.now()) ||
      valuation.observedAt.toISOString() !== raw.observedAt
    )
      throw new InvalidMarketCostAnalysisRequestError(
        'Explicit valuation is invalid or stale',
      );
    const limits = { ...this.status.getLocalStatus().localRiskLimits.limits };
    const preview = await this.previews.load({
      side: request.side,
      sourceQuantity: request.sourceQuantity,
    });
    if (preview.feeEvidence === null || !preview.quoteCurrent)
      return { preview, analysis: null };
    return {
      preview,
      analysis: analyzeMarketCostEstimates(
        preview.feeEvidence,
        valuation,
        limits,
        this.now(),
      ),
    };
  }
}
