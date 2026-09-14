import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  SPOT_SYMBOL_CATALOG_PROVIDER,
  SpotSymbolCatalog,
  SpotSymbolCatalogProvider,
} from '../domain/spot-symbol-catalog';

@Injectable()
export class SpotSymbolCatalogService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SpotSymbolCatalogService.name);
  private readonly abortController = new AbortController();
  private catalog?: SpotSymbolCatalog;

  constructor(
    @Inject(SPOT_SYMBOL_CATALOG_PROVIDER)
    private readonly provider: SpotSymbolCatalogProvider,
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

  private async load(): Promise<void> {
    try {
      this.catalog = await this.provider.load(this.abortController.signal);
      this.logger.log({
        event: 'new_listings.catalog_loaded',
        symbolCount: this.catalog.symbols.length,
        receivedAt: this.catalog.receivedAt.toISOString(),
      });
    } catch (error: unknown) {
      if (!this.abortController.signal.aborted) {
        this.logger.error('Failed to load Binance Spot symbol catalog', error);
      }
    }
  }
}
