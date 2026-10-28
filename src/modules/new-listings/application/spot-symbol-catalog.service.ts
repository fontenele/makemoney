import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  NEW_LISTINGS_POLL_INTERVAL_MS,
  SPOT_SYMBOL_CATALOG_PROVIDER,
  SPOT_SYMBOL_REPOSITORY,
  SpotSymbolCatalog,
  SpotSymbolCatalogProvider,
  SpotSymbolCatalogRateLimitError,
  SpotSymbolCatalogScannerStatus,
  SpotSymbol,
  SpotSymbolRepository,
} from '../domain/spot-symbol-catalog';

@Injectable()
export class SpotSymbolCatalogService implements OnModuleInit, OnModuleDestroy {
  private static readonly UNOBSERVED_WEIGHT_FALLBACK_MS = 5000;
  private static readonly REQUEST_WEIGHT_HEADROOM_RATIO = 0.8;
  private readonly logger = new Logger(SpotSymbolCatalogService.name);
  private readonly abortController = new AbortController();
  private catalog?: SpotSymbolCatalog;
  private catalogSymbols = new Set<string>();
  private newlyActivatedSymbols: SpotSymbol[] = [];
  private refreshTimer?: NodeJS.Timeout;
  private lastAttemptAt: Date | null = null;
  private lastSuccessfulObservationAt: Date | null = null;
  private nextAttemptAt: Date | null = null;
  private effectivePollIntervalMs: number | null = null;
  private consecutiveFailures = 0;
  private lastFailureCode: SpotSymbolCatalogScannerStatus['lastFailureCode'] =
    null;
  private loadInProgress = false;
  private readonly clock = (): Date => new Date();

  constructor(
    @Inject(SPOT_SYMBOL_CATALOG_PROVIDER)
    private readonly provider: SpotSymbolCatalogProvider,
    @Inject(SPOT_SYMBOL_REPOSITORY)
    private readonly repository: SpotSymbolRepository,
    @Inject(NEW_LISTINGS_POLL_INTERVAL_MS)
    private readonly pollIntervalMs: number,
  ) {}

  onModuleInit(): void {
    void this.load('startup');
  }

  onModuleDestroy(): void {
    this.abortController.abort();
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }
  }

  latest(): SpotSymbolCatalog | undefined {
    return this.catalog;
  }

  latestNewlyActivated(): SpotSymbol[] {
    return [...this.newlyActivatedSymbols];
  }

  status(): SpotSymbolCatalogScannerStatus {
    return {
      state:
        this.consecutiveFailures > 0
          ? 'degraded'
          : this.catalog
            ? 'waiting_for_activation'
            : 'starting',
      monitoredSymbolCount: this.catalog?.symbols.length ?? 0,
      configuredPollIntervalMs: this.pollIntervalMs,
      effectivePollIntervalMs: this.effectivePollIntervalMs,
      lastAttemptAt: this.lastAttemptAt,
      lastSuccessfulObservationAt: this.lastSuccessfulObservationAt,
      nextAttemptAt: this.nextAttemptAt,
      consecutiveFailures: this.consecutiveFailures,
      lastFailureCode: this.lastFailureCode,
      requestWeight: this.catalog?.requestWeight ?? null,
    };
  }

  requestActivityRefresh(symbol: string): boolean {
    if (
      this.abortController.signal.aborted ||
      this.loadInProgress ||
      !this.catalog ||
      this.catalogSymbols.has(symbol) ||
      this.consecutiveFailures > 0 ||
      !this.hasRequestWeightHeadroom(this.catalog)
    ) {
      return false;
    }
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = undefined;
    }
    void this.load('activity_stream');
    return true;
  }

  private async load(
    trigger: 'startup' | 'scheduled' | 'activity_stream',
  ): Promise<void> {
    if (this.loadInProgress || this.abortController.signal.aborted) return;
    this.loadInProgress = true;
    this.lastAttemptAt = this.clock();
    this.nextAttemptAt = null;
    let nextDelayMs = SpotSymbolCatalogService.UNOBSERVED_WEIGHT_FALLBACK_MS;
    try {
      const catalog = await this.provider.load(this.abortController.signal);
      const newlyActivatedSymbols = await this.repository.observe(catalog);
      this.catalog = catalog;
      this.catalogSymbols = new Set(
        catalog.symbols.map(({ symbol }) => symbol),
      );
      this.newlyActivatedSymbols = newlyActivatedSymbols;
      this.lastSuccessfulObservationAt = catalog.receivedAt;
      this.consecutiveFailures = 0;
      this.lastFailureCode = null;
      nextDelayMs = this.successDelay(catalog);
      this.logger.log({
        event: 'new_listings.catalog_loaded',
        symbolCount: this.catalog.symbols.length,
        newlyActivatedCount: newlyActivatedSymbols.length,
        receivedAt: this.catalog.receivedAt.toISOString(),
        trigger,
      });
    } catch (error: unknown) {
      if (!this.abortController.signal.aborted) {
        this.consecutiveFailures += 1;
        this.lastFailureCode =
          error instanceof SpotSymbolCatalogRateLimitError
            ? 'provider_rate_limited'
            : 'catalog_load_failed';
        if (error instanceof SpotSymbolCatalogRateLimitError) {
          nextDelayMs = Math.max(this.pollIntervalMs, error.retryAfterMs);
        }
        this.logger.error('Failed to load Binance Spot symbol catalog', error);
      }
    } finally {
      this.loadInProgress = false;
      this.scheduleNextLoad(nextDelayMs);
    }
  }

  private successDelay(catalog: SpotSymbolCatalog): number {
    const weight = catalog.requestWeight;
    if (!weight || weight.limit === null || weight.intervalMs === null) {
      return Math.max(
        this.pollIntervalMs,
        SpotSymbolCatalogService.UNOBSERVED_WEIGHT_FALLBACK_MS,
      );
    }
    if (
      weight.usedWeight / weight.limit >=
      SpotSymbolCatalogService.REQUEST_WEIGHT_HEADROOM_RATIO
    ) {
      return Math.max(this.pollIntervalMs, weight.intervalMs);
    }
    return this.pollIntervalMs;
  }

  private hasRequestWeightHeadroom(catalog: SpotSymbolCatalog): boolean {
    const weight = catalog.requestWeight;
    return Boolean(
      weight &&
      weight.limit !== null &&
      weight.intervalMs !== null &&
      weight.usedWeight / weight.limit <
        SpotSymbolCatalogService.REQUEST_WEIGHT_HEADROOM_RATIO,
    );
  }

  private scheduleNextLoad(delayMs: number): void {
    if (this.abortController.signal.aborted) {
      return;
    }
    this.effectivePollIntervalMs = delayMs;
    this.nextAttemptAt = new Date(this.clock().getTime() + delayMs);
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = undefined;
      void this.load('scheduled');
    }, delayMs);
  }
}
