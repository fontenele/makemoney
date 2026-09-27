import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PredictionMarketDiscoveryService } from '../application/prediction-market-discovery.service';
import {
  PredictionMarketNotFoundError,
  PredictionMarketProvider,
} from '../domain/prediction-market';
import { PolymarketController } from './polymarket.controller';

describe('PolymarketController', () => {
  it('loads the default bounded active-market page', async () => {
    const calls: unknown[] = [];
    const controller = controllerWith({
      listActive: (query) => {
        calls.push(query);
        return Promise.resolve({
          markets: [],
          nextCursor: null,
          receivedAt: new Date('2026-09-26T12:00:00.000Z'),
        });
      },
    });

    await expect(controller.listActiveMarkets()).resolves.toMatchObject({
      markets: [],
    });
    expect(calls).toEqual([{ limit: 20 }]);
  });

  it('passes a validated limit and opaque keyset cursor', async () => {
    const calls: unknown[] = [];
    const controller = controllerWith({
      listActive: (query) => {
        calls.push(query);
        return Promise.resolve({
          markets: [],
          nextCursor: null,
          receivedAt: new Date('2026-09-26T12:00:00.000Z'),
        });
      },
    });

    await controller.listActiveMarkets('100', 'page_2-cursor');
    expect(calls).toEqual([{ limit: 100, afterCursor: 'page_2-cursor' }]);
  });

  it.each(['0', '-1', '1.5', 'abc', '101'])(
    'rejects invalid limit %s',
    async (limit) => {
      await expect(
        controllerWith(unusedProvider()).listActiveMarkets(limit),
      ).rejects.toThrow(BadRequestException);
    },
  );

  it.each(['', 'contains space', 'line\nbreak'])(
    'rejects invalid cursor %s',
    async (cursor) => {
      await expect(
        controllerWith(unusedProvider()).listActiveMarkets(undefined, cursor),
      ).rejects.toThrow(BadRequestException);
    },
  );

  it('maps provider failure to service unavailable', async () => {
    const controller = controllerWith({
      listActive: () => Promise.reject(new Error('network unavailable')),
    });

    await expect(controller.listActiveMarkets()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('loads one selected market with YES and NO token identities', async () => {
    const calls: string[] = [];
    const controller = controllerWith({
      getById: (id) => {
        calls.push(id);
        return Promise.resolve(marketDetails());
      },
    });

    await expect(controller.getMarket('703257')).resolves.toEqual(
      marketDetails(),
    );
    expect(calls).toEqual(['703257']);
  });

  it.each(['', '0', '-1', '1.5', 'abc'])(
    'rejects invalid market id %s',
    async (id) => {
      await expect(controllerWith({}).getMarket(id)).rejects.toThrow(
        BadRequestException,
      );
    },
  );

  it('maps an absent selected market to not found', async () => {
    const controller = controllerWith({
      getById: (id) => Promise.reject(new PredictionMarketNotFoundError(id)),
    });

    await expect(controller.getMarket('703257')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('maps selected-market provider failure to service unavailable', async () => {
    const controller = controllerWith({
      getById: () => Promise.reject(new Error('network unavailable')),
    });

    await expect(controller.getMarket('703257')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});

function controllerWith(
  provider: Partial<PredictionMarketProvider>,
): PolymarketController {
  return new PolymarketController(
    new PredictionMarketDiscoveryService({
      listActive:
        provider.listActive ??
        (() => Promise.reject(new Error('unexpected list call'))),
      getById:
        provider.getById ??
        (() => Promise.reject(new Error('unexpected detail call'))),
    }),
  );
}

function unusedProvider(): Partial<PredictionMarketProvider> {
  return {};
}

function marketDetails() {
  return {
    provider: 'polymarket' as const,
    id: '703257',
    slug: 'will-example-happen',
    question: 'Will the example happen?',
    conditionId:
      '0x747dc809fb79e1b05be09c42d6179459a58de2ef3e40f02484a4e1260f741f75',
    outcomes: {
      yes: { label: 'Yes', tokenId: '111' },
      no: { label: 'No', tokenId: '222' },
    },
    receivedAt: new Date('2026-09-26T12:00:00.000Z'),
  };
}
