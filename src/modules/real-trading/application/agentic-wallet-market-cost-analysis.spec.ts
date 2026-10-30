import {
  analyzeMarketCostEstimates,
  InvalidMarketCostAnalysisRequestError,
} from './agentic-wallet-market-cost-analysis';
import { AgenticWalletMarketFeeEvidence } from '../infrastructure/agentic-wallet-market-fee-evidence.adapter';

const NOW = new Date('2026-10-29T20:00:00.000Z');
const valuation = () => ({
  usdtUsd: '0.98',
  bnbUsd: '600',
  source: 'operator-reviewed-feed',
  observedAt: new Date(NOW),
});
const limits = {
  maximumOrderNotionalUsdt: '5',
  maximumDailySpendUsdt: '10',
  maximumBankrollUsdt: '20',
  maximumProviderFeeRate: '0.01',
  maximumNetworkFeeUsdt: '0.5',
  maximumSlippageRate: '0.005',
};
const fees = (): AgenticWalletMarketFeeEvidence => ({
  intentId: 'id',
  chainId: '56',
  sourceSymbol: 'USDT',
  targetSymbol: 'BTCB',
  sourceQuantity: '2',
  expectedTargetQuantity: '0.00002',
  maximumSlippageRate: '0.005',
  providerFeeRate: '0.001',
  providerFeeUsd: '0.002',
  estimatedNetworkFeeUsd: '0.0007',
  gasMode: 'fast',
  observedAt: new Date(NOW),
  coverage: 'provider_display_estimate',
});

describe('analyzeMarketCostEstimates', () => {
  it('keeps USD/USDT distinct and rounds estimates upward at 18 decimals', () => {
    expect(
      analyzeMarketCostEstimates(fees(), valuation(), limits, NOW),
    ).toMatchObject({
      displayedTotalCostUsd: '0.0027',
      estimatedProviderFeeUsdt: '0.002040816326530613',
      estimatedNetworkFeeUsdt: '0.000714285714285715',
      estimatedNativeGasBnb: '0.000001166666666667',
      usdtUsdParityAssumed: false,
      riskApproved: false,
      valuationAuthenticated: false,
      exactCostCoverageComplete: false,
    });
  });
  it('does not infer a zero BNB gas requirement from zero display dollars', () => {
    expect(
      analyzeMarketCostEstimates(
        { ...fees(), estimatedNetworkFeeUsd: '0' },
        valuation(),
        limits,
        NOW,
      ),
    ).toMatchObject({
      estimatedNativeGasBnb: null,
      zeroGasDisplayProvesFreeTransaction: false,
    });
  });
  it.each([
    new Date(NOW.getTime() + 1),
    new Date(NOW.getTime() - 60001),
    new Date(NaN),
  ])('rejects invalid valuation chronology %s', (observedAt) => {
    expect(() =>
      analyzeMarketCostEstimates(
        fees(),
        { ...valuation(), observedAt },
        limits,
        NOW,
      ),
    ).toThrow(InvalidMarketCostAnalysisRequestError);
  });
  it('accepts the exact maximum valuation age', () => {
    expect(
      analyzeMarketCostEstimates(
        fees(),
        { ...valuation(), observedAt: new Date(NOW.getTime() - 60000) },
        limits,
        NOW,
      ).status,
    ).toBe('estimate_limits_satisfied');
  });
  it('rejects stale fee evidence', () => {
    expect(() =>
      analyzeMarketCostEstimates(
        { ...fees(), observedAt: new Date(NOW.getTime() - 5001) },
        valuation(),
        limits,
        NOW,
      ),
    ).toThrow();
  });
  it('enforces the fee rate and conservatively converted network ceiling', () => {
    expect(
      analyzeMarketCostEstimates(
        fees(),
        valuation(),
        {
          ...limits,
          maximumProviderFeeRate: '0.0009',
          maximumNetworkFeeUsdt: '0.0007',
        },
        NOW,
      ).limitBlockers,
    ).toEqual([
      'provider_fee_rate_exceeds_limit',
      'network_fee_estimate_exceeds_limit',
    ]);
  });
  it('rejects contradictory zero-fee display facts', () => {
    expect(
      analyzeMarketCostEstimates(
        { ...fees(), providerFeeRate: '0' },
        valuation(),
        limits,
        NOW,
      ).limitBlockers,
    ).toContain('provider_fee_display_inconsistent');
  });
  it('copies external valuation dates', () => {
    const input = valuation();
    const result = analyzeMarketCostEstimates(fees(), input, limits, NOW);
    input.observedAt.setTime(0);
    expect(result.valuation.observedAt).toEqual(NOW);
  });
});
