import { jest } from '@jest/globals';
import {
  ApprovalCleanupMonitor,
  ApprovalCleanupMonitorStore,
  ApprovalCleanupReceiptReader,
} from './approval-cleanup-monitor';
import { ApprovalCleanupRecord } from './approval-cleanup';
import {
  cleanupPlan,
  cleanupReceipt,
  cleanupSubmitted,
} from '../../../../test/fixtures/approval-cleanup';
function harness() {
  const store = {
    unresolved: jest
      .fn<ApprovalCleanupMonitorStore['unresolved']>()
      .mockResolvedValue([cleanupSubmitted()]),
    transition: jest
      .fn<ApprovalCleanupMonitorStore['transition']>()
      .mockResolvedValue({ ...cleanupSubmitted(), state: 'cleared' }),
  };
  const reader = {
    load: jest
      .fn<ApprovalCleanupReceiptReader['load']>()
      .mockResolvedValue(cleanupReceipt()),
  };
  return { store, reader, monitor: new ApprovalCleanupMonitor(store, reader) };
}
describe('Passive approval-cleanup monitor', () => {
  it('persists verified evidence without a claim or mutation transport', async () => {
    const t = harness();
    await expect(t.monitor.observe(cleanupPlan().walletHash)).resolves.toEqual({
      status: 'clear',
      providerAccessPerformed: true,
      submissionAuthorized: false,
      automaticRetryAllowed: false,
    });
    expect(t.store.transition).toHaveBeenCalledWith(
      cleanupPlan().id,
      cleanupSubmitted().fingerprint,
      { type: 'receipt', evidence: cleanupReceipt() },
    );
    expect(t.reader.load).toHaveBeenCalledTimes(1);
  });
  it.each([
    'awaiting_operation',
    'ready',
    'claimed',
    'unknown',
    'failed',
  ] as const)('never attempts financial retry for %s', async (state) => {
    const t = harness();
    t.store.unresolved.mockResolvedValue([{ ...cleanupSubmitted(), state }]);
    await expect(
      t.monitor.observe(cleanupPlan().walletHash),
    ).resolves.toMatchObject({
      status: 'unresolved',
      providerAccessPerformed: false,
    });
    expect(t.reader.load).not.toHaveBeenCalled();
    expect(t.store.transition).not.toHaveBeenCalled();
  });
  it('reports no local obligation without implying submission authority', async () => {
    const t = harness();
    t.store.unresolved.mockResolvedValue([]);
    await expect(
      t.monitor.observe(cleanupPlan().walletHash),
    ).resolves.toMatchObject({
      status: 'clear',
      providerAccessPerformed: false,
      submissionAuthorized: false,
    });
  });
  it('keeps failed cleanup unresolved', async () => {
    const t = harness();
    t.store.transition.mockResolvedValue({
      ...cleanupSubmitted(),
      state: 'failed',
    });
    await expect(
      t.monitor.observe(cleanupPlan().walletHash),
    ).resolves.toMatchObject({
      status: 'unresolved',
      automaticRetryAllowed: false,
    });
  });
  it('sanitizes provider failures and permits another read-only observation', async () => {
    const t = harness();
    t.reader.load.mockRejectedValueOnce(
      new Error('sensitive raw dependency data'),
    );
    const result = await t.monitor.observe(cleanupPlan().walletHash);
    expect(result.status).toBe('evidence_unavailable');
    expect(JSON.stringify(result)).not.toContain('sensitive');
    await expect(
      t.monitor.observe(cleanupPlan().walletHash),
    ).resolves.toMatchObject({ status: 'clear' });
  });
  it('suppresses overlapping observations of the same wallet', async () => {
    const t = harness();
    let release!: (records: ApprovalCleanupRecord[]) => void;
    t.store.unresolved.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    const first = t.monitor.observe(cleanupPlan().walletHash);
    await expect(
      t.monitor.observe(cleanupPlan().walletHash),
    ).resolves.toMatchObject({
      status: 'busy',
      providerAccessPerformed: false,
    });
    release([]);
    await first;
    expect(t.reader.load).not.toHaveBeenCalled();
  });
  it('does not access a mismatched wallet record', async () => {
    const t = harness();
    const r = cleanupSubmitted();
    r.plan.walletHash = 'f'.repeat(64);
    t.store.unresolved.mockResolvedValue([r]);
    await expect(
      t.monitor.observe(cleanupPlan().walletHash),
    ).resolves.toMatchObject({
      status: 'evidence_unavailable',
      providerAccessPerformed: false,
    });
    expect(t.reader.load).not.toHaveBeenCalled();
  });
});
