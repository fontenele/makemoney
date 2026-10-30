import {
  ApprovalCleanupRecord,
  ApprovalCleanupReceiptEvidence,
  ApprovalCleanupEvent,
} from './approval-cleanup';
export interface ApprovalCleanupReceiptReader {
  load(record: ApprovalCleanupRecord): Promise<ApprovalCleanupReceiptEvidence>;
}
export interface ApprovalCleanupMonitorStore {
  unresolved(walletHash: string): Promise<ApprovalCleanupRecord[]>;
  transition(
    id: string,
    fingerprint: string,
    event: ApprovalCleanupEvent,
  ): Promise<ApprovalCleanupRecord>;
}
/** Passive one-pass monitor: cannot register, claim, sign, broadcast or retry. */
export class ApprovalCleanupMonitor {
  private readonly busy = new Set<string>();
  constructor(
    private readonly store: ApprovalCleanupMonitorStore,
    private readonly reader: ApprovalCleanupReceiptReader,
  ) {}
  async observe(walletHash: string) {
    if (!/^[a-f0-9]{64}$/.test(walletHash))
      throw new Error('Invalid wallet digest');
    const result = (
      status: 'busy' | 'clear' | 'unresolved' | 'evidence_unavailable',
      providerAccessPerformed: boolean,
    ) => ({
      status,
      providerAccessPerformed,
      submissionAuthorized: false as const,
      automaticRetryAllowed: false as const,
    });
    if (this.busy.has(walletHash)) return result('busy', false);
    this.busy.add(walletHash);
    let providerAccessPerformed = false;
    try {
      const records = await this.store.unresolved(walletHash);
      if (records.length === 0) return result('clear', false);
      if (records.length !== 1 || records[0].plan.walletHash !== walletHash)
        return result('evidence_unavailable', false);
      const record = records[0];
      if (record.state !== 'submitted') return result('unresolved', false);
      providerAccessPerformed = true;
      const evidence = await this.reader.load(record);
      const updated = await this.store.transition(
        record.plan.id,
        record.fingerprint,
        { type: 'receipt', evidence },
      );
      return result(updated.state === 'cleared' ? 'clear' : 'unresolved', true);
    } catch {
      return result('evidence_unavailable', providerAccessPerformed);
    } finally {
      this.busy.delete(walletHash);
    }
  }
}
