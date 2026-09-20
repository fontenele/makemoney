import { ConfigService } from '@nestjs/config';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { Provider } from '@nestjs/common';
import { jest } from '@jest/globals';
import { LISTING_TOP_OF_BOOK_OBSERVATION_PROVIDER } from './domain/listing-top-of-book-observation';
import { BinanceListingTopOfBookClient } from './infrastructure/binance-listing-top-of-book.client';
import { NewListingsModule } from './new-listings.module';

describe('NewListingsModule', () => {
  it('registers the public Binance top-of-book adapter without activating a consumer', () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      NewListingsModule,
    ) as Provider[];
    const registration = providers.find(
      (provider) =>
        typeof provider === 'object' &&
        provider !== null &&
        'provide' in provider &&
        provider.provide === LISTING_TOP_OF_BOOK_OBSERVATION_PROVIDER,
    );

    expect(registration).toMatchObject({
      provide: LISTING_TOP_OF_BOOK_OBSERVATION_PROVIDER,
      inject: [ConfigService],
    });
    if (
      typeof registration !== 'object' ||
      registration === null ||
      !('useFactory' in registration)
    ) {
      throw new Error('Top-of-book provider factory is missing');
    }

    const getOrThrow = jest
      .fn<ConfigService['getOrThrow']>()
      .mockReturnValue('https://api.binance.test');
    const config = { getOrThrow } as unknown as ConfigService;
    const provider = registration.useFactory(config) as unknown;

    expect(getOrThrow).toHaveBeenCalledWith('BINANCE_REST_BASE_URL');
    expect(provider).toBeInstanceOf(BinanceListingTopOfBookClient);
  });
});
