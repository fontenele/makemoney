import { ConfigService } from '@nestjs/config';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { Provider } from '@nestjs/common';
import { jest } from '@jest/globals';
import { PREDICTION_MARKET_PROVIDER } from './domain/prediction-market';
import { PREDICTION_DATA_FRESHNESS_PROVIDER } from './domain/prediction-data-freshness';
import { PREDICTION_EVENT_PROVIDER } from './domain/prediction-event';
import { PREDICTION_EVENT_LIVE_VOLUME_PROVIDER } from './domain/prediction-event-live-volume';
import { PREDICTION_TAG_PROVIDER } from './domain/prediction-tag';
import { PREDICTION_SERIES_PROVIDER } from './domain/prediction-series';
import { PREDICTION_MARKET_MIDPOINT_PROVIDER } from './domain/prediction-market-midpoint';
import { PREDICTION_MARKET_ORDER_BOOK_PROVIDER } from './domain/prediction-market-top-of-book';
import { PREDICTION_MARKET_RESOLUTION_PROVIDER } from './domain/prediction-market-resolution';
import {
  PREDICTION_GLOBAL_OPEN_INTEREST_PROVIDER,
  PREDICTION_MARKET_OPEN_INTEREST_PROVIDER,
} from './domain/prediction-market-open-interest';
import { PolymarketClobMidpointClient } from './infrastructure/polymarket-clob-midpoint.client';
import { PolymarketClobOrderBookClient } from './infrastructure/polymarket-clob-order-book.client';
import { PolymarketDataResolutionClient } from './infrastructure/polymarket-data-resolution.client';
import { PolymarketDataFreshnessClient } from './infrastructure/polymarket-data-freshness.client';
import { PolymarketDataOpenInterestClient } from './infrastructure/polymarket-data-open-interest.client';
import { PolymarketDataPriceHistoryClient } from './infrastructure/polymarket-data-price-history.client';
import { PREDICTION_MARKET_PRICE_HISTORY_PROVIDER } from './domain/prediction-market-price-history';
import { PolymarketDataEventLiveVolumeClient } from './infrastructure/polymarket-data-event-live-volume.client';
import { PolymarketGammaMarketClient } from './infrastructure/polymarket-gamma-market.client';
import { PolymarketGammaEventClient } from './infrastructure/polymarket-gamma-event.client';
import { PolymarketGammaTagClient } from './infrastructure/polymarket-gamma-tag.client';
import { PolymarketGammaSeriesClient } from './infrastructure/polymarket-gamma-series.client';
import { PolymarketModule } from './polymarket.module';

describe('PolymarketModule', () => {
  it('registers the public Gamma event adapter', () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      PolymarketModule,
    ) as Provider[];
    const registration = providers.find(
      (provider) =>
        typeof provider === 'object' &&
        provider !== null &&
        'provide' in provider &&
        provider.provide === PREDICTION_EVENT_PROVIDER,
    );
    if (
      typeof registration !== 'object' ||
      registration === null ||
      !('useFactory' in registration)
    ) {
      throw new Error('Polymarket event provider factory is missing');
    }
    const getOrThrow = jest
      .fn<ConfigService['getOrThrow']>()
      .mockReturnValue('https://gamma-api.polymarket.test');
    const config = { getOrThrow } as unknown as ConfigService;
    const provider = registration.useFactory(config) as unknown;

    expect(getOrThrow).toHaveBeenCalledWith('POLYMARKET_GAMMA_BASE_URL');
    expect(provider).toBeInstanceOf(PolymarketGammaEventClient);
  });

  it('registers the public Gamma market adapter', () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      PolymarketModule,
    ) as Provider[];
    const registration = providers.find(
      (provider) =>
        typeof provider === 'object' &&
        provider !== null &&
        'provide' in provider &&
        provider.provide === PREDICTION_MARKET_PROVIDER,
    );

    expect(registration).toMatchObject({
      provide: PREDICTION_MARKET_PROVIDER,
      inject: [ConfigService],
    });
    if (
      typeof registration !== 'object' ||
      registration === null ||
      !('useFactory' in registration)
    ) {
      throw new Error('Polymarket provider factory is missing');
    }

    const getOrThrow = jest
      .fn<ConfigService['getOrThrow']>()
      .mockReturnValue('https://gamma-api.polymarket.test');
    const config = { getOrThrow } as unknown as ConfigService;
    const provider = registration.useFactory(config) as unknown;

    expect(getOrThrow).toHaveBeenCalledWith('POLYMARKET_GAMMA_BASE_URL');
    expect(provider).toBeInstanceOf(PolymarketGammaMarketClient);
  });

  it('registers the public Gamma tag adapter', () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      PolymarketModule,
    ) as Provider[];
    const registration = providers.find(
      (provider) =>
        typeof provider === 'object' &&
        provider !== null &&
        'provide' in provider &&
        provider.provide === PREDICTION_TAG_PROVIDER,
    );
    if (
      typeof registration !== 'object' ||
      registration === null ||
      !('useFactory' in registration)
    ) {
      throw new Error('Polymarket tag provider factory is missing');
    }
    const getOrThrow = jest
      .fn<ConfigService['getOrThrow']>()
      .mockReturnValue('https://gamma-api.polymarket.test');
    const config = { getOrThrow } as unknown as ConfigService;
    const provider = registration.useFactory(config) as unknown;

    expect(getOrThrow).toHaveBeenCalledWith('POLYMARKET_GAMMA_BASE_URL');
    expect(provider).toBeInstanceOf(PolymarketGammaTagClient);
  });

  it('registers the public Gamma series adapter', () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      PolymarketModule,
    ) as Provider[];
    const registration = providers.find(
      (provider) =>
        typeof provider === 'object' &&
        provider !== null &&
        'provide' in provider &&
        provider.provide === PREDICTION_SERIES_PROVIDER,
    );
    if (
      typeof registration !== 'object' ||
      registration === null ||
      !('useFactory' in registration)
    ) {
      throw new Error('Polymarket series provider factory is missing');
    }
    const getOrThrow = jest
      .fn<ConfigService['getOrThrow']>()
      .mockReturnValue('https://gamma-api.polymarket.test');
    const config = { getOrThrow } as unknown as ConfigService;
    const provider = registration.useFactory(config) as unknown;

    expect(getOrThrow).toHaveBeenCalledWith('POLYMARKET_GAMMA_BASE_URL');
    expect(provider).toBeInstanceOf(PolymarketGammaSeriesClient);
  });

  it('registers the public CLOB midpoint adapter', () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      PolymarketModule,
    ) as Provider[];
    const registration = providers.find(
      (provider) =>
        typeof provider === 'object' &&
        provider !== null &&
        'provide' in provider &&
        provider.provide === PREDICTION_MARKET_MIDPOINT_PROVIDER,
    );

    if (
      typeof registration !== 'object' ||
      registration === null ||
      !('useFactory' in registration)
    ) {
      throw new Error('Polymarket midpoint provider factory is missing');
    }
    const getOrThrow = jest
      .fn<ConfigService['getOrThrow']>()
      .mockReturnValue('https://clob.polymarket.test');
    const config = { getOrThrow } as unknown as ConfigService;
    const provider = registration.useFactory(config) as unknown;

    expect(getOrThrow).toHaveBeenCalledWith('POLYMARKET_CLOB_BASE_URL');
    expect(provider).toBeInstanceOf(PolymarketClobMidpointClient);
  });

  it('registers the public CLOB order-book adapter', () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      PolymarketModule,
    ) as Provider[];
    const registration = providers.find(
      (provider) =>
        typeof provider === 'object' &&
        provider !== null &&
        'provide' in provider &&
        provider.provide === PREDICTION_MARKET_ORDER_BOOK_PROVIDER,
    );
    if (
      typeof registration !== 'object' ||
      registration === null ||
      !('useFactory' in registration)
    ) {
      throw new Error('Polymarket order-book provider factory is missing');
    }
    const getOrThrow = jest
      .fn<ConfigService['getOrThrow']>()
      .mockReturnValue('https://clob.polymarket.test');
    const config = { getOrThrow } as unknown as ConfigService;
    const provider = registration.useFactory(config) as unknown;

    expect(getOrThrow).toHaveBeenCalledWith('POLYMARKET_CLOB_BASE_URL');
    expect(provider).toBeInstanceOf(PolymarketClobOrderBookClient);
  });

  it('registers the public Data API resolution adapter', () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      PolymarketModule,
    ) as Provider[];
    const registration = providers.find(
      (provider) =>
        typeof provider === 'object' &&
        provider !== null &&
        'provide' in provider &&
        provider.provide === PREDICTION_MARKET_RESOLUTION_PROVIDER,
    );
    if (
      typeof registration !== 'object' ||
      registration === null ||
      !('useFactory' in registration)
    ) {
      throw new Error('Polymarket resolution provider factory is missing');
    }
    const getOrThrow = jest
      .fn<ConfigService['getOrThrow']>()
      .mockReturnValue('https://data-api.polymarket.test');
    const config = { getOrThrow } as unknown as ConfigService;
    const provider = registration.useFactory(config) as unknown;

    expect(getOrThrow).toHaveBeenCalledWith('POLYMARKET_DATA_BASE_URL');
    expect(provider).toBeInstanceOf(PolymarketDataResolutionClient);
  });

  it('registers the public Data API freshness adapter', () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      PolymarketModule,
    ) as Provider[];
    const registration = providers.find(
      (provider) =>
        typeof provider === 'object' &&
        provider !== null &&
        'provide' in provider &&
        provider.provide === PREDICTION_DATA_FRESHNESS_PROVIDER,
    );
    if (
      typeof registration !== 'object' ||
      registration === null ||
      !('useFactory' in registration)
    ) {
      throw new Error('Polymarket data freshness provider factory is missing');
    }
    const getOrThrow = jest
      .fn<ConfigService['getOrThrow']>()
      .mockReturnValue('https://data-api.polymarket.test');
    const config = { getOrThrow } as unknown as ConfigService;
    const provider = registration.useFactory(config) as unknown;

    expect(getOrThrow).toHaveBeenCalledWith('POLYMARKET_DATA_BASE_URL');
    expect(provider).toBeInstanceOf(PolymarketDataFreshnessClient);
  });

  it('registers the public Data API open-interest adapter', () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      PolymarketModule,
    ) as Provider[];
    const registration = providers.find(
      (provider) =>
        typeof provider === 'object' &&
        provider !== null &&
        'provide' in provider &&
        provider.provide === PREDICTION_MARKET_OPEN_INTEREST_PROVIDER,
    );
    if (
      typeof registration !== 'object' ||
      registration === null ||
      !('useFactory' in registration)
    ) {
      throw new Error('Polymarket open-interest provider factory is missing');
    }
    const getOrThrow = jest
      .fn<ConfigService['getOrThrow']>()
      .mockReturnValue('https://data-api.polymarket.test');
    const config = { getOrThrow } as unknown as ConfigService;
    const provider = registration.useFactory(config) as unknown;

    expect(getOrThrow).toHaveBeenCalledWith('POLYMARKET_DATA_BASE_URL');
    expect(provider).toBeInstanceOf(PolymarketDataOpenInterestClient);
  });

  it('registers the public Data API event live-volume adapter', () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      PolymarketModule,
    ) as Provider[];
    const registration = providers.find(
      (provider) =>
        typeof provider === 'object' &&
        provider !== null &&
        'provide' in provider &&
        provider.provide === PREDICTION_EVENT_LIVE_VOLUME_PROVIDER,
    );
    if (
      typeof registration !== 'object' ||
      registration === null ||
      !('useFactory' in registration)
    ) {
      throw new Error(
        'Polymarket event live-volume provider factory is missing',
      );
    }
    const getOrThrow = jest
      .fn<ConfigService['getOrThrow']>()
      .mockReturnValue('https://data-api.polymarket.test');
    const config = { getOrThrow } as unknown as ConfigService;
    const provider = registration.useFactory(config) as unknown;

    expect(getOrThrow).toHaveBeenCalledWith('POLYMARKET_DATA_BASE_URL');
    expect(provider).toBeInstanceOf(PolymarketDataEventLiveVolumeClient);
  });

  it('registers the public Data API global open-interest adapter', () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      PolymarketModule,
    ) as Provider[];
    const registration = providers.find(
      (provider) =>
        typeof provider === 'object' &&
        provider !== null &&
        'provide' in provider &&
        provider.provide === PREDICTION_GLOBAL_OPEN_INTEREST_PROVIDER,
    );
    if (
      typeof registration !== 'object' ||
      registration === null ||
      !('useFactory' in registration)
    ) {
      throw new Error(
        'Polymarket global open-interest provider factory is missing',
      );
    }
    const getOrThrow = jest
      .fn<ConfigService['getOrThrow']>()
      .mockReturnValue('https://data-api.polymarket.test');
    const config = { getOrThrow } as unknown as ConfigService;
    const provider = registration.useFactory(config) as unknown;

    expect(getOrThrow).toHaveBeenCalledWith('POLYMARKET_DATA_BASE_URL');
    expect(provider).toBeInstanceOf(PolymarketDataOpenInterestClient);
  });

  it('registers the public Data API price-history adapter', () => {
    const providers = Reflect.getMetadata(
      MODULE_METADATA.PROVIDERS,
      PolymarketModule,
    ) as Provider[];
    const registration = providers.find(
      (provider) =>
        typeof provider === 'object' &&
        provider !== null &&
        'provide' in provider &&
        provider.provide === PREDICTION_MARKET_PRICE_HISTORY_PROVIDER,
    );
    if (
      typeof registration !== 'object' ||
      registration === null ||
      !('useFactory' in registration)
    ) {
      throw new Error('Polymarket price-history provider factory is missing');
    }
    const getOrThrow = jest
      .fn<ConfigService['getOrThrow']>()
      .mockReturnValue('https://data-api.polymarket.test');
    const config = { getOrThrow } as unknown as ConfigService;
    const provider = registration.useFactory(config) as unknown;

    expect(getOrThrow).toHaveBeenCalledWith('POLYMARKET_DATA_BASE_URL');
    expect(provider).toBeInstanceOf(PolymarketDataPriceHistoryClient);
  });
});
