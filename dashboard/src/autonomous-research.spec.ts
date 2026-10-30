import { describe, expect, it, vi } from 'vitest';
import {
  loadAutonomousResearch,
  researchPercentage,
} from './autonomous-research';

const payload = () => ({
  scope: 'autonomous_strategy_research',
  status: 'research_only',
  observedAt: '2026-10-30T12:00:00.000Z',
  walletAccessPerformed: false,
  submissionAuthorized: false,
  evidence: {
    symbol: 'BTC/USDT',
    candleCount: 1000,
    closedTradeCount: 108,
    latestAction: 'hold',
    grossMeanReturnRate: '-0.000120705349106635',
    grossLowerQuartileReturnRate: '-0.000768902807688724',
    endedAt: '2026-10-30T11:59:59.999Z',
    expectedProfitVerified: false,
    btcbExecutionEdgeVerified: false,
    submissionAuthorized: false,
  },
});
describe('autonomous research display', () => {
  it('reads only the cached endpoint without credentials or mutation', async () => {
    const request = vi.fn(() => Promise.resolve(Response.json(payload())));
    await expect(loadAutonomousResearch(request)).resolves.toEqual(payload());
    expect(request).toHaveBeenCalledWith(
      '/api/real-trading/autonomous-research',
      { headers: { Accept: 'application/json' } },
    );
  });
  it.each([
    {},
    { ...payload(), submissionAuthorized: true },
    {
      ...payload(),
      evidence: { ...payload().evidence, expectedProfitVerified: true },
    },
    { ...payload(), evidence: { ...payload().evidence, candleCount: 1001 } },
    {
      ...payload(),
      evidence: { ...payload().evidence, grossMeanReturnRate: 'NaN' },
    },
    { ...payload(), observedAt: 'bad' },
  ])('rejects misleading or malformed evidence', async (value) => {
    await expect(
      loadAutonomousResearch(() => Promise.resolve(Response.json(value))),
    ).resolves.toBeNull();
  });
  it('preserves unavailable state rather than calling it ready', async () => {
    const result = { ...payload(), status: 'unavailable' };
    await expect(
      loadAutonomousResearch(() => Promise.resolve(Response.json(result))),
    ).resolves.toEqual(result);
  });
  it('handles provider-free endpoint failure', async () => {
    await expect(
      loadAutonomousResearch(() =>
        Promise.resolve(new Response('', { status: 503 })),
      ),
    ).resolves.toBeNull();
    await expect(
      loadAutonomousResearch(() => Promise.reject(new Error('offline'))),
    ).resolves.toBeNull();
  });
  it('formats rates as percentages without floating point', () => {
    expect(researchPercentage('-0.000120705349106635')).toBe('-0.0121%');
    expect(researchPercentage(null)).toBe('Unavailable');
  });
});
