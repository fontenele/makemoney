import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { HistoricalCandleProvider } from '../../backtesting/domain/historical-candle-provider';
import { Strategy } from '../../strategies/domain/strategy';
import { researchStrategyReturns } from './autonomous-strategy-research';

const REFRESH_MS = 15 * 60_000;

/** Bounded public-data background research. No wallet or executor dependency. */
export class AutonomousStrategyResearchService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(AutonomousStrategyResearchService.name);
  private timer?: ReturnType<typeof setTimeout>;
  private active?: AbortController;
  private stopped = false;
  private inFlight = false;
  private lastError = false;
  private evidence: ReturnType<typeof researchStrategyReturns> | null = null;
  private observedAt: Date | null = null;

  constructor(
    private readonly provider: HistoricalCandleProvider,
    private readonly strategy: Strategy,
    private readonly now: () => Date = () => new Date(),
  ) {}

  onModuleInit() {
    void this.cycle();
  }

  onModuleDestroy() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.active?.abort();
  }

  read() {
    const at = this.now();
    const stale =
      !this.observedAt ||
      !Number.isFinite(at.getTime()) ||
      at < this.observedAt ||
      at.getTime() - this.observedAt.getTime() > REFRESH_MS + 60_000;
    return structuredClone({
      scope: 'autonomous_strategy_research' as const,
      status: this.lastError
        ? 'unavailable'
        : stale
          ? 'warming_up_or_stale'
          : 'research_only',
      inFlight: this.inFlight,
      observedAt: this.observedAt,
      evidence: this.evidence,
      refreshIntervalSeconds: REFRESH_MS / 1000,
      blockers: [
        'validated_strategy_return_model_required',
        'btcb_execution_cost_evidence_required',
        'autonomous_risk_and_execution_composition_required',
      ],
      providerScope: 'public_binance_spot_candles' as const,
      walletAccessPerformed: false,
      submissionAuthorized: false,
    });
  }

  async refresh() {
    if (this.inFlight || this.stopped) return;
    this.inFlight = true;
    this.active = new AbortController();
    try {
      const at = this.now();
      if (!Number.isFinite(at.getTime()))
        throw new Error('Invalid research clock');
      const end = Math.floor(at.getTime() / 60_000) * 60_000 - 1;
      const start = end + 1 - 1000 * 60_000;
      const candles = await this.provider.load(
        {
          symbol: 'BTC/USDT',
          interval: '1m',
          startTime: new Date(start),
          endTime: new Date(end),
          limit: 1000,
        },
        this.active.signal,
      );
      if (this.stopped) return;
      if (
        candles.length !== 1000 ||
        candles[0].openTime.getTime() !== start ||
        candles.at(-1)?.closeTime.getTime() !== end
      )
        throw new Error('Incomplete research window');
      const evidence = researchStrategyReturns(candles, this.strategy);
      const completedAt = this.now();
      if (
        !Number.isFinite(completedAt.getTime()) ||
        completedAt < at ||
        completedAt.getTime() - end > 120_000
      )
        throw new Error('Research collection exceeded freshness bound');
      this.evidence = evidence;
      this.observedAt = completedAt;
      this.lastError = false;
    } catch {
      if (!this.stopped) {
        this.lastError = true;
        this.logger.warn({ event: 'autonomous_research.unavailable' });
      }
    } finally {
      this.inFlight = false;
      this.active = undefined;
    }
  }

  private async cycle() {
    await this.refresh();
    if (!this.stopped) {
      this.timer = setTimeout(() => void this.cycle(), REFRESH_MS);
      this.timer.unref();
    }
  }
}
