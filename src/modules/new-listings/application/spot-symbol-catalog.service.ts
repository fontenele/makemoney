import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  SPOT_SYMBOL_CATALOG_PROVIDER,
  SPOT_SYMBOL_REPOSITORY,
  SpotSymbolCatalog,
  SpotSymbolCatalogProvider,
  SpotSymbol,
  SpotSymbolRepository,
} from '../domain/spot-symbol-catalog';

@Injectable()
export class SpotSymbolCatalogService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SpotSymbolCatalogService.name);
  private readonly abortController = new AbortController();
  private catalog?: SpotSymbolCatalog;
  private newlyObservedSymbols: SpotSymbol[] = [];

  constructor(
    @Inject(SPOT_SYMBOL_CATALOG_PROVIDER)
    private readonly provider: SpotSymbolCatalogProvider,
    @Inject(SPOT_SYMBOL_REPOSITORY)
    private readonly repository: SpotSymbolRepository,
  ) {}

  onModuleInit(): void {
    void this.load();
  }

  onModuleDestroy(): void {
    this.abortController.abort();
  }

  latest(): SpotSymbolCatalog | undefined {
    return this.catalog;
  }

  latestNewlyObserved(): SpotSymbol[] {
    return [...this.newlyObservedSymbols];
  }

  private async load(): Promise<void> {
    try {
      const catalog = await this.provider.load(this.abortController.signal);
      const newlyObservedSymbols = await this.repository.observe(catalog);
      this.catalog = catalog;
      this.newlyObservedSymbols = newlyObservedSymbols;
      this.logger.log({
        event: 'new_listings.catalog_loaded',
        symbolCount: this.catalog.symbols.length,
        newlyObservedCount: newlyObservedSymbols.length,
        receivedAt: this.catalog.receivedAt.toISOString(),
      });
    } catch (error: unknown) {
      if (!this.abortController.signal.aborted) {
        this.logger.error('Failed to load Binance Spot symbol catalog', error);
      }
    }
  }
}
