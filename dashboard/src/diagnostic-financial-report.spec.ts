import { describe, expect, it, vi } from 'vitest';
import evidence from '../../docs/gas-diagnostic-financial-report-2026-10-30.json';
import { loadDiagnosticFinancialReport } from './diagnostic-financial-report';
const payload = () => ({
  scope: 'diagnostic_financial_report',
  status: 'available',
  report: structuredClone(evidence.report),
  providerAccessPerformed: false,
  submissionAuthorized: false,
});
const http = (data: unknown) =>
  vi.fn<typeof fetch>().mockResolvedValue(Response.json(data));
describe('Cached real diagnostic report client', () => {
  it('preserves exact receipt decimals through one cached GET without credentials', async () => {
    const request = http(payload());
    const result = await loadDiagnosticFinancialReport(request);
    expect(result?.report?.gas.totalBnb).toBe('0.000068006349138526');
    expect(result?.report?.receivedBtcb).toBe('0.000012907690498746');
    expect(request).toHaveBeenCalledExactlyOnceWith(
      '/api/real-trading/gas-diagnostic-report',
      { headers: { Accept: 'application/json' } },
    );
  });
  it('distinguishes absent evidence from a failed read', async () => {
    await expect(
      loadDiagnosticFinancialReport(
        http({ ...payload(), status: 'unavailable', report: null }),
      ),
    ).resolves.toEqual({ status: 'unavailable', report: null });
    await expect(
      loadDiagnosticFinancialReport(
        vi
          .fn<typeof fetch>()
          .mockResolvedValue(new Response('', { status: 503 })),
      ),
    ).resolves.toBeNull();
    await expect(
      loadDiagnosticFinancialReport(
        vi.fn<typeof fetch>().mockRejectedValue(new Error('offline')),
      ),
    ).resolves.toBeNull();
  });
  it.each([
    'sellGasMeasured',
    'futureGasCostGuaranteed',
    'realizedTradingPnlAvailable',
    'globalAccountingMutated',
    'unrelatedTransactionsIncluded',
    'submissionAuthorized',
  ])('rejects unsupported %s claims', async (key) => {
    const data = payload();
    (data.report as unknown as Record<string, unknown>)[key] = true;
    await expect(loadDiagnosticFinancialReport(http(data))).resolves.toBeNull();
  });
  it.each([
    'number',
    'exponent',
    'negative',
    'large',
    'date',
    'hash',
    'conversion',
    'provider',
    'allowance',
  ])('rejects malformed %s evidence', async (fault) => {
    const data = payload();
    const r = data.report as unknown as Record<string, unknown>;
    if (fault === 'number') r.receivedBtcb = 0.1;
    if (fault === 'exponent') r.receivedBtcb = '1e-5';
    if (fault === 'negative') r.indicativeEntryGasUsdt = '-1';
    if (fault === 'large') r.indicativeEntryGasUsdt = '1'.repeat(100);
    if (fault === 'date') r.observedAt = 'invalid';
    if (fault === 'hash') r.transactions = { swap: 'javascript:alert(1)' };
    if (fault === 'conversion') r.conversionBasis = 'execution_price';
    if (fault === 'provider') data.providerAccessPerformed = true;
    if (fault === 'allowance')
      data.report.approval.observationBasis =
        'finalized' as typeof data.report.approval.observationBasis;
    await expect(loadDiagnosticFinancialReport(http(data))).resolves.toBeNull();
  });
});
