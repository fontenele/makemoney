import { jest } from '@jest/globals';
import { MarketPairMetadata } from '../domain/market-pair-metadata';
import { PairMetadataProvider } from '../domain/pair-metadata-provider';
import { PublicPairMetadataService } from './public-pair-metadata.service';
import { LatestPairMetadataService } from './latest-pair-metadata.service';

describe('PublicPairMetadataService', () => {
  it('loads pair metadata during module initialization', () => {
    const metadata: MarketPairMetadata = {
      provider: 'binance',
      symbol: 'BTC/USDT',
      status: 'TRADING',
      baseAsset: 'BTC',
      quoteAsset: 'USDT',
      minPrice: '0.01',
      maxPrice: '1000000',
      tickSize: '0.01',
      minQuantity: '0.00001',
      maxQuantity: '9000',
      stepSize: '0.00001',
      minNotional: '5',
      receivedAt: new Date('2026-09-11T12:00:00.000Z'),
    };
    const load = jest.fn<() => Promise<MarketPairMetadata | null>>();
    load.mockResolvedValue(metadata);
    const provider: PairMetadataProvider = { load };

    const service = new PublicPairMetadataService(
      provider,
      new LatestPairMetadataService(),
    );

    service.onModuleInit();

    expect(load).toHaveBeenCalledTimes(1);
    expect(load.mock.calls[0]?.[0]).toBeInstanceOf(AbortSignal);
    service.onModuleDestroy();
  });

  it('does not reject application startup when the request fails', async () => {
    const provider: PairMetadataProvider = {
      load: jest
        .fn<() => Promise<MarketPairMetadata | null>>()
        .mockRejectedValue(new Error('network unavailable')),
    };

    const service = new PublicPairMetadataService(
      provider,
      new LatestPairMetadataService(),
    );

    expect(() => service.onModuleInit()).not.toThrow();
    await Promise.resolve();
  });
});
