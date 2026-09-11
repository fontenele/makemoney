import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  PAIR_METADATA_PROVIDER,
  PairMetadataProvider,
} from '../domain/pair-metadata-provider';
import { LatestPairMetadataService } from './latest-pair-metadata.service';

@Injectable()
export class PublicPairMetadataService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PublicPairMetadataService.name);
  private readonly abortController = new AbortController();

  constructor(
    @Inject(PAIR_METADATA_PROVIDER)
    private readonly pairMetadataProvider: PairMetadataProvider,
    private readonly latestPairMetadata: LatestPairMetadataService,
  ) {}

  onModuleInit(): void {
    void this.loadAndLog();
  }

  onModuleDestroy(): void {
    this.abortController.abort();
  }

  private async loadAndLog(): Promise<void> {
    try {
      const metadata = await this.pairMetadataProvider.load(
        this.abortController.signal,
      );

      if (metadata === null) {
        this.logger.warn('Invalid Binance BTC/USDT pair metadata response');
        return;
      }

      this.latestPairMetadata.update(metadata);

      this.logger.log({
        event: 'market.pair_metadata.received',
        provider: metadata.provider,
        symbol: metadata.symbol,
        status: metadata.status,
        baseAsset: metadata.baseAsset,
        quoteAsset: metadata.quoteAsset,
        minPrice: metadata.minPrice,
        maxPrice: metadata.maxPrice,
        tickSize: metadata.tickSize,
        minQuantity: metadata.minQuantity,
        maxQuantity: metadata.maxQuantity,
        stepSize: metadata.stepSize,
        minNotional: metadata.minNotional,
        receivedAt: metadata.receivedAt.toISOString(),
      });
    } catch (error: unknown) {
      if (this.abortController.signal.aborted) {
        return;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        'Failed to load Binance BTC/USDT pair metadata',
        message,
      );
    }
  }
}
