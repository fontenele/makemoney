import { describe, it, expect } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import RealWalletOverview from './RealWalletOverview.vue';
import type { AgenticWalletFundingValuation, Resource } from './api';
const valuation = (): AgenticWalletFundingValuation => ({
  scope: 'agentic_wallet_funding_valuation',
  status: 'available',
  blockers: [],
  balanceObservedAt: '2026-10-30T18:00:00.000Z',
  pricesObservedAt: '2026-10-30T18:00:01.000Z',
  balance: {
    quantityBnb: '0.005',
    quantityUsdt: '2',
    quantityBtcb: '0.000012907690498746',
    valueUsdt: '3.5',
    valueBrl: '17.5',
    usdtValueBrl: '10',
    btcbValueUsdt: '1',
    btcbValueBrl: '5',
    totalValueUsdt: '6.5',
    totalValueBrl: '32.5',
  },
  prices: {
    provider: 'binance',
    bnbUsdt: '700',
    usdtBrl: '5',
    btcUsdtReference: '77000',
    btcbBasis: 'btc_spot_reference_not_btcb_quote',
  },
  refreshMode: 'initial_and_manual',
  valuationOnly: true,
  fundingAuthorized: false,
  quoteAuthorized: false,
  submissionAuthorized: false,
});
const render = (
  resource: Resource<AgenticWalletFundingValuation> | null,
  loading = false,
) =>
  renderToString(
    createSSRApp({
      render: () => h(RealWalletOverview, { resource, loading }),
    }),
  );
describe('Real wallet overview', () => {
  it('renders the actual BTCB quantity and inclusive total separately from paper results', async () => {
    const html = await render({ status: 'available', data: valuation() });
    expect(html).toContain('0.000012907690498746');
    expect(html).toContain('6.50');
    expect(html).toContain('BTCB · real position');
    expect(html).toContain('not a BTCB sale quote');
    expect(html).toContain('real win rate are unavailable');
    expect(html).not.toContain('1,000.00');
  });
  it('does not show a partial wallet total or treat missing BTCB as zero', async () => {
    const data = valuation();
    data.balance!.quantityBtcb = null;
    data.balance!.btcbValueUsdt = null;
    data.balance!.btcbValueBrl = null;
    data.balance!.totalValueUsdt = null;
    data.balance!.totalValueBrl = null;
    const html = await render({ status: 'available', data });
    expect(html).toContain('Not reported');
    expect(html).toContain('no partial total is shown');
    expect(html).not.toContain('6.50');
  });
  it('shows loading/unavailable without invented balances', async () => {
    const html = await render(null, true);
    expect(html).toContain('Reading the real wallet');
    expect(html).toContain('disabled');
    expect(html).not.toContain('0.000012907690498746');
  });
});
