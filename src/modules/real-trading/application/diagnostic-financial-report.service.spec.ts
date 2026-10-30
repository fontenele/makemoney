import { jest } from '@jest/globals';
import {
  diagnosticBundle,
  diagnosticPlan,
} from '../../../../test/fixtures/diagnostic-report';
import { DiagnosticFinancialReportService } from './diagnostic-financial-report.service';
import { DiagnosticFinancialReport } from './diagnostic-financial-report';
function harness() {
  const plan = diagnosticPlan(),
    bundle = diagnosticBundle();
  const diagnostics = {
    read: jest.fn(() =>
      Promise.resolve({
        plan,
        state: 'submitted' as const,
        providerOrderId: '123',
      }),
    ),
  };
  const status = {
    measure: jest.fn(() =>
      Promise.resolve({
        executionSucceeded: true,
        gasMeasurementAvailable: true,
        transactionHash: bundle.swap.hash,
      }),
    ),
  };
  const reader = { load: jest.fn(() => Promise.resolve(bundle)) };
  const store = {
    save: jest.fn((report: DiagnosticFinancialReport) =>
      Promise.resolve({ report, replayed: false }),
    ),
    latest: jest.fn(() => Promise.resolve(null)),
  };
  const service = new DiagnosticFinancialReportService(
    diagnostics,
    status,
    reader,
    store,
  );
  const request = {
    planId: plan.id,
    approvalTransactionHash: bundle.approval.hash,
    revocationTransactionHash: bundle.revocation.hash,
  };
  return { service, request, diagnostics, status, reader, store };
}
describe('diagnostic financial report composition', () => {
  it('binds the main hash to the stored provider order and recomputes financial facts before persistence', async () => {
    const h = harness();
    const result = await h.service.record(h.request);
    expect(result.report.receivedBtcb).toBe('0.000012907690498746');
    expect(h.reader.load).toHaveBeenCalledWith({
      swapHash: diagnosticBundle().swap.hash,
      approvalHash: h.request.approvalTransactionHash,
      revocationHash: h.request.revocationTransactionHash,
      walletHash: diagnosticPlan().walletHash,
    });
    expect(h.store.save).toHaveBeenCalledTimes(1);
  });
  it.each([
    {},
    null,
    { planId: 'bad' },
    { ...harness().request, sourceSpentUsdt: '2' },
  ])(
    'rejects caller-supplied financial facts or malformed identities before any provider read',
    async (request) => {
      const h = harness();
      await expect(h.service.record(request)).rejects.toThrow();
      expect(h.diagnostics.read).not.toHaveBeenCalled();
    },
  );
  it('does not persist a pending diagnostic and releases the overlap guard', async () => {
    const h = harness();
    h.status.measure.mockResolvedValueOnce({
      executionSucceeded: false,
      gasMeasurementAvailable: false,
      transactionHash: diagnosticBundle().swap.hash,
    });
    await expect(h.service.record(h.request)).rejects.toThrow();
    expect(h.reader.load).not.toHaveBeenCalled();
    await expect(h.service.record(h.request)).resolves.toMatchObject({
      status: 'recorded',
    });
  });
  it('serves the cache without wallet, quote or chain reads', async () => {
    const h = harness();
    await expect(h.service.read()).resolves.toMatchObject({
      status: 'unavailable',
      providerAccessPerformed: false,
      submissionAuthorized: false,
    });
    expect(h.diagnostics.read).not.toHaveBeenCalled();
    expect(h.status.measure).not.toHaveBeenCalled();
    expect(h.reader.load).not.toHaveBeenCalled();
  });
});
