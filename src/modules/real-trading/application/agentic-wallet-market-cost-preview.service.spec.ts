import { jest } from '@jest/globals';
import {
  AgenticWalletMarketCostPreviewService,
  MarketCostPreviewInProgressError,
} from './agentic-wallet-market-cost-preview.service';
import { AgenticWalletMarketQuoteService } from './agentic-wallet-market-quote.service';
import { AgenticWalletMarketCostAnalysisService } from './agentic-wallet-market-cost-analysis.service';
import { RealTradingStatusService } from './real-trading-status.service';
import { AgenticWalletMarketFeeEvidence } from '../infrastructure/agentic-wallet-market-fee-evidence.adapter';

const NOW = new Date('2026-10-29T20:00:00.000Z');
function harness() {
  const quote = {
    id: 'quote',
    intent: { id: 'intent' },
    quotedAt: new Date(NOW.getTime() - 1000),
    expiresAt: new Date(NOW.getTime() + 4000),
    executable: false,
    costCoverage: 'partial',
  };
  const quoted = {
    quote,
    blockers: [],
    status: 'quote_available',
    riskApproved: false,
    reservationCreated: false,
    submissionAuthorized: false,
  } as unknown as Awaited<ReturnType<AgenticWalletMarketQuoteService['load']>>;
  const loadQuote = jest
    .fn<AgenticWalletMarketQuoteService['load']>()
    .mockResolvedValue(quoted);
  const prepared = {
    intent: quote.intent,
    maximumOrderNotionalUsdt: '5',
    blockers: [],
    status: 'quote_preview_ready',
  } as unknown as Awaited<
    ReturnType<AgenticWalletMarketQuoteService['prepare']>
  >;
  const prepare = jest
    .fn<AgenticWalletMarketQuoteService['prepare']>()
    .mockResolvedValue(prepared);
  const evidence: AgenticWalletMarketFeeEvidence = {
    intentId: 'intent',
    chainId: '56',
    sourceSymbol: 'USDT',
    targetSymbol: 'BTCB',
    sourceQuantity: '2',
    expectedTargetQuantity: '0.00002',
    maximumSlippageRate: '0.005',
    providerFeeRate: '0',
    providerFeeUsd: '0',
    estimatedNetworkFeeUsd: '0',
    gasMode: 'fast',
    observedAt: new Date(NOW),
    coverage: 'provider_display_estimate',
  };
  const loadFees = jest
    .fn<() => Promise<AgenticWalletMarketFeeEvidence>>()
    .mockResolvedValue(evidence);
  const service = new AgenticWalletMarketCostPreviewService(
    { prepare, finalize: loadQuote },
    { load: loadFees },
    () => NOW,
  );
  return {
    service,
    loadQuote,
    loadFees,
    quoted,
    evidence,
    quote,
    prepare,
    prepared,
  };
}
describe('AgenticWalletMarketCostPreviewService', () => {
  it('collects one fee observation for the exact server-created intent', async () => {
    const h = harness();
    await expect(
      h.service.load({ side: 'buy', sourceQuantity: '2' }),
    ).resolves.toMatchObject({
      status: 'cost_estimates_available',
      independentQuoteObservations: true,
      exactCostCoverageComplete: false,
      submissionAuthorized: false,
    });
    expect(h.loadFees).toHaveBeenCalledWith(h.quote.intent);
    expect(h.loadFees).toHaveBeenCalledTimes(1);
  });
  it('does not request fees after a blocked quote', async () => {
    const h = harness();
    h.prepare.mockResolvedValue({
      ...h.prepared,
      intent: null,
      status: 'blocked',
    });
    h.loadQuote.mockResolvedValue({
      ...h.quoted,
      quote: null,
      status: 'blocked',
    });
    await expect(h.service.load({})).resolves.toMatchObject({
      feeEvidence: null,
      quoteCurrent: false,
    });
    expect(h.loadFees).not.toHaveBeenCalled();
  });
  it('marks a quote that expires during fee acquisition unavailable for current use', async () => {
    const h = harness();
    h.quote.expiresAt.setTime(NOW.getTime());
    await expect(h.service.load({})).resolves.toMatchObject({
      status: 'blocked',
      quoteCurrent: false,
      blockers: ['quote_or_fee_evidence_expired'],
    });
  });
  it('blocks future fee evidence', async () => {
    const h = harness();
    h.evidence.observedAt.setTime(NOW.getTime() + 1);
    await expect(h.service.load({})).resolves.toMatchObject({
      status: 'blocked',
      quoteCurrent: false,
    });
  });
  it('propagates fee failures without retrying', async () => {
    const h = harness();
    h.loadFees.mockRejectedValue(new Error('unavailable'));
    await expect(h.service.load({})).rejects.toThrow('unavailable');
    expect(h.loadFees).toHaveBeenCalledTimes(1);
  });
  it('reads fees before the final JSON quote without an initial JSON quote', async () => {
    const h = harness();
    const events: string[] = [];
    h.loadFees.mockImplementation(() => {
      events.push('fees');
      return Promise.resolve(h.evidence);
    });
    h.loadQuote.mockImplementation(() => {
      events.push('final_quote');
      return Promise.resolve(h.quoted);
    });
    await h.service.load({});
    expect(events).toEqual(['fees', 'final_quote']);
  });
  it('rejects overlapping work before provider access and releases the guard after failure', async () => {
    const h = harness();
    let reject!: (error: Error) => void;
    h.loadFees.mockImplementationOnce(
      () =>
        new Promise((_resolve, rejectPromise) => {
          reject = rejectPromise;
        }),
    );
    const pending = h.service.load({});
    await Promise.resolve();
    await expect(h.service.load({})).rejects.toBeInstanceOf(
      MarketCostPreviewInProgressError,
    );
    expect(h.prepare).toHaveBeenCalledTimes(1);
    reject(new Error('read failed'));
    await expect(pending).rejects.toThrow('read failed');
    await expect(h.service.load({})).resolves.toMatchObject({
      status: 'cost_estimates_available',
    });
  });
});

describe('AgenticWalletMarketCostAnalysisService', () => {
  const request = () => ({
    side: 'buy',
    sourceQuantity: '2',
    valuation: {
      usdtUsd: '0.99',
      bnbUsd: '600',
      source: 'public-feed',
      observedAt: NOW.toISOString(),
    },
  });
  const status = {
    getLocalStatus: () => ({
      localRiskLimits: {
        limits: {
          maximumProviderFeeRate: '0.01',
          maximumNetworkFeeUsdt: '0.5',
        },
      },
    }),
  } as unknown as RealTradingStatusService;
  it('rejects invalid valuation before provider dependencies', async () => {
    const h = harness();
    const load = jest.fn(h.service.load.bind(h.service));
    const service = new AgenticWalletMarketCostAnalysisService(
      { load },
      status,
      () => NOW,
    );
    await expect(
      service.load({
        ...request(),
        valuation: { ...request().valuation, usdtUsd: '0' },
      }),
    ).rejects.toThrow();
    expect(load).not.toHaveBeenCalled();
  });
  it('rechecks valuation freshness after asynchronous provider work', async () => {
    const h = harness();
    let calls = 0;
    const service = new AgenticWalletMarketCostAnalysisService(
      h.service,
      status,
      () => new Date(NOW.getTime() + (calls++ === 0 ? 0 : 60001)),
    );
    await expect(service.load(request())).rejects.toThrow('valuation');
  });
  it('retains explicit non-parity and zero-gas uncertainty on success', async () => {
    const h = harness();
    await expect(
      new AgenticWalletMarketCostAnalysisService(
        h.service,
        status,
        () => NOW,
      ).load(request()),
    ).resolves.toMatchObject({
      analysis: {
        usdtUsdParityAssumed: false,
        estimatedNativeGasBnb: null,
        submissionAuthorized: false,
      },
    });
  });
});
