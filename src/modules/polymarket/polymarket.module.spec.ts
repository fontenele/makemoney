import { ConfigService } from '@nestjs/config';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { Provider } from '@nestjs/common';
import { jest } from '@jest/globals';
import { PREDICTION_MARKET_PROVIDER } from './domain/prediction-market';
import { PREDICTION_MARKET_MIDPOINT_PROVIDER } from './domain/prediction-market-midpoint';
import { PREDICTION_MARKET_ORDER_BOOK_PROVIDER } from './domain/prediction-market-top-of-book';
import { PolymarketClobMidpointClient } from './infrastructure/polymarket-clob-midpoint.client';
import { PolymarketClobOrderBookClient } from './infrastructure/polymarket-clob-order-book.client';
import { PolymarketGammaMarketClient } from './infrastructure/polymarket-gamma-market.client';
import { PolymarketModule } from './polymarket.module';

describe('PolymarketModule', () => {
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
});
