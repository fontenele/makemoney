import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PredictionMarketDiscoveryService } from '../application/prediction-market-discovery.service';
import { PredictionMarketProvider } from '../domain/prediction-market';
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
});

function controllerWith(
  provider: PredictionMarketProvider,
): PolymarketController {
  return new PolymarketController(
    new PredictionMarketDiscoveryService(provider),
  );
}

function unusedProvider(): PredictionMarketProvider {
  return {
    listActive: () => Promise.reject(new Error('unexpected provider call')),
  };
}
