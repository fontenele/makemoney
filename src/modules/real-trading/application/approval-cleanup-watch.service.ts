import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
export interface CleanupWatchQueue {
  list(): Promise<Array<{ walletHash: string; state: string }>>;
}
export interface CleanupWatchMonitor {
  observe(
    walletHash: string,
  ): Promise<{ status: string; providerAccessPerformed: boolean }>;
}
const STATES = [
  'awaiting_operation',
  'ready',
  'claimed',
  'accepted',
  'submitted',
  'unknown',
  'failed',
];
/** Background receipt observation only. No financial mutation dependency. */
export class ApprovalCleanupWatchService
  implements OnModuleInit, OnModuleDestroy
{
  private timer?: ReturnType<typeof setTimeout>;
  private stopped = false;
  private inFlight = false;
  private observedAt: Date | null = null;
  private status: 'warming_up' | 'idle' | 'unresolved' | 'unavailable' =
    'warming_up';
  private pendingCount: number | null = null;
  private states: Record<string, number> = {};
  private lastCycleProviderReadPerformed = false;
  constructor(
    private readonly queue: CleanupWatchQueue,
    private readonly monitor: CleanupWatchMonitor,
    private readonly now: () => Date = () => new Date(),
  ) {}
  onModuleInit() {
    void this.cycle();
  }
  onModuleDestroy() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
  }
  read() {
    const now = this.now();
    const stale =
      this.observedAt !== null &&
      (!Number.isFinite(now.getTime()) ||
        now < this.observedAt ||
        now.getTime() - this.observedAt.getTime() > 90000);
    return {
      scope: 'approval_cleanup_watch' as const,
      status: stale ? 'stale' : this.status,
      observedAt: this.observedAt ? new Date(this.observedAt) : null,
      pendingCount: this.pendingCount,
      states: { ...this.states },
      inFlight: this.inFlight,
      lastCycleProviderReadPerformed: this.lastCycleProviderReadPerformed,
      refreshIntervalSeconds: 30,
      backgroundMode: 'receipt_observation_only' as const,
      providerAccessPerformed: false as const,
      submissionAuthorized: false as const,
      automaticRetryAllowed: false as const,
    };
  }
  async refresh() {
    if (this.stopped || this.inFlight) return;
    this.inFlight = true;
    this.lastCycleProviderReadPerformed = false;
    try {
      let rows = await this.queue.list();
      this.validate(rows);
      if (rows.length) {
        const result = await this.monitor.observe(rows[0].walletHash);
        this.lastCycleProviderReadPerformed = result.providerAccessPerformed;
        if (result.status === 'evidence_unavailable')
          throw new Error('Receipt evidence unavailable');
        rows = await this.queue.list();
        this.validate(rows);
      }
      if (this.stopped) return;
      const at = this.now();
      if (!Number.isFinite(at.getTime()))
        throw new Error('Invalid watch clock');
      this.pendingCount = rows.length;
      this.states = {};
      for (const row of rows)
        this.states[row.state] = (this.states[row.state] ?? 0) + 1;
      this.status = rows.length ? 'unresolved' : 'idle';
      this.observedAt = at;
    } catch {
      if (!this.stopped) {
        this.status = 'unavailable';
        this.pendingCount = null;
        this.states = {};
        this.observedAt = this.now();
      }
    } finally {
      this.inFlight = false;
    }
  }
  private validate(rows: Array<{ walletHash: string; state: string }>) {
    if (
      !Array.isArray(rows) ||
      rows.length > 1 ||
      rows.some(
        (row) =>
          !/^[a-f0-9]{64}$/.test(row.walletHash) || !STATES.includes(row.state),
      )
    )
      throw new Error('Cleanup watch scope unavailable');
  }
  private async cycle() {
    await this.refresh();
    if (!this.stopped) {
      this.timer = setTimeout(() => {
        void this.cycle();
      }, 30000);
      this.timer.unref();
    }
  }
}
