import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { DetectedSpotSymbol } from '../domain/spot-symbol-catalog';
import { DetectedSpotSymbolCursorNotFoundError } from '../domain/spot-symbol-catalog';
import { NewListingsController } from './new-listings.controller';

describe('NewListingsController', () => {
  it('returns a filtered detection summary without pagination input', async () => {
    const summarize = jest.fn(() =>
      Promise.resolve({
        count: 2,
        firstDetectedAt: new Date('2026-09-14T02:00:00.000Z'),
        lastDetectedAt: new Date('2026-09-14T03:00:00.000Z'),
      }),
    );
    const controller = new NewListingsController({ summarize });

    await expect(
      controller.summary(
        '2026-09-14T01:00:00.000Z',
        '2026-09-14T04:00:00.000Z',
        'binance',
        'TRADING',
        'true',
      ),
    ).resolves.toMatchObject({ count: 2 });
    expect(summarize).toHaveBeenCalledWith({
      detectedFrom: new Date('2026-09-14T01:00:00.000Z'),
      detectedTo: new Date('2026-09-14T04:00:00.000Z'),
      provider: 'binance',
      status: 'TRADING',
      spotTradingAllowed: true,
    });
  });

  it('applies list filter validation to the summary', async () => {
    const controller = new NewListingsController({
      summarize: jest.fn(() => Promise.resolve({})),
    });
    expect(() =>
      controller.summary(undefined, undefined, undefined, 'trading'),
    ).toThrow('status must be an uppercase provider status');
  });

  it('uses the default or requested bounded limit', async () => {
    const listRecent = jest.fn((query: { limit: number }) =>
      Promise.resolve(query.limit > 0 ? [detection()] : []),
    );
    const controller = new NewListingsController({ listRecent });

    await expect(controller.list()).resolves.toHaveLength(1);
    expect(listRecent).toHaveBeenLastCalledWith(
      { limit: 50, detectedFrom: undefined, detectedTo: undefined },
      undefined,
    );
    await expect(controller.list('1')).resolves.toHaveLength(1);
    expect(listRecent).toHaveBeenLastCalledWith(
      { limit: 1, detectedFrom: undefined, detectedTo: undefined },
      undefined,
    );
  });

  it.each(['0', '-1', '1.5', 'abc', '101'])(
    'rejects invalid limit %s',
    async (limit) => {
      const controller = new NewListingsController({
        listRecent: jest.fn(() => Promise.resolve([])),
      });
      await expect(controller.list(limit)).rejects.toThrow(
        'limit must be an integer from 1 to 100',
      );
    },
  );

  it('accepts inclusive canonical UTC detection bounds', async () => {
    const listRecent = jest.fn(() => Promise.resolve([detection()]));
    const controller = new NewListingsController({ listRecent });

    await controller.list(
      '10',
      '2026-09-14T02:00:00.000Z',
      '2026-09-14T03:00:00.000Z',
    );
    expect(listRecent).toHaveBeenCalledWith(
      {
        limit: 10,
        detectedFrom: new Date('2026-09-14T02:00:00.000Z'),
        detectedTo: new Date('2026-09-14T03:00:00.000Z'),
      },
      undefined,
    );
  });

  it.each([
    ['detectedFrom', '2026-09-14'],
    ['detectedTo', '2026-09-14T02:00:00Z'],
  ])('rejects invalid %s', async (field, value) => {
    const controller = new NewListingsController({
      listRecent: jest.fn(() => Promise.resolve([])),
    });
    await expect(
      controller.list(
        undefined,
        field === 'detectedFrom' ? value : undefined,
        field === 'detectedTo' ? value : undefined,
      ),
    ).rejects.toThrow(`${field} must be an ISO 8601 UTC timestamp`);
  });

  it('rejects an inverted detection range', async () => {
    const controller = new NewListingsController({
      listRecent: jest.fn(() => Promise.resolve([])),
    });
    await expect(
      controller.list(
        undefined,
        '2026-09-14T03:00:00.000Z',
        '2026-09-14T02:00:00.000Z',
      ),
    ).rejects.toThrow('detectedFrom must be at or before detectedTo');
  });

  it('accepts a provider and symbol cursor', async () => {
    const listRecent = jest.fn(() => Promise.resolve([]));
    const controller = new NewListingsController({ listRecent });
    await controller.list(undefined, undefined, undefined, 'binance:NEWUSDT');
    expect(listRecent).toHaveBeenCalledWith(
      { limit: 50, detectedFrom: undefined, detectedTo: undefined },
      { provider: 'binance', symbol: 'NEWUSDT' },
    );
  });

  it.each(['invalid', 'BINANCE:NEWUSDT', 'binance:newusdt', 'binance:'])(
    'rejects malformed cursor %s',
    async (cursor) => {
      const controller = new NewListingsController({
        listRecent: jest.fn(() => Promise.resolve([])),
      });
      await expect(
        controller.list(undefined, undefined, undefined, cursor),
      ).rejects.toThrow('cursor must use provider:symbol format');
    },
  );

  it('maps an unknown cursor to bad request', async () => {
    const controller = new NewListingsController({
      listRecent: jest.fn(() =>
        Promise.reject(new DetectedSpotSymbolCursorNotFoundError()),
      ),
    });
    await expect(
      controller.list(undefined, undefined, undefined, 'binance:NEWUSDT'),
    ).rejects.toThrow('cursor must identify a detected symbol');
  });

  it('accepts composable provider state filters', async () => {
    const listRecent = jest.fn(() => Promise.resolve([]));
    const controller = new NewListingsController({ listRecent });
    await controller.list(
      '10',
      undefined,
      undefined,
      undefined,
      'binance',
      'TRADING',
      'true',
    );
    expect(listRecent).toHaveBeenCalledWith(
      {
        limit: 10,
        detectedFrom: undefined,
        detectedTo: undefined,
        provider: 'binance',
        status: 'TRADING',
        spotTradingAllowed: true,
      },
      undefined,
    );
  });

  it.each([
    ['provider', 'other'],
    ['status', 'trading'],
    ['status', ''],
    ['spotTradingAllowed', '1'],
  ])('rejects invalid %s filter', async (field, value) => {
    const controller = new NewListingsController({
      listRecent: jest.fn(() => Promise.resolve([])),
    });
    await expect(
      controller.list(
        undefined,
        undefined,
        undefined,
        undefined,
        field === 'provider' ? value : undefined,
        field === 'status' ? value : undefined,
        field === 'spotTradingAllowed' ? value : undefined,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

function detection(): DetectedSpotSymbol {
  return {
    provider: 'binance',
    symbol: 'NEWUSDT',
    baseAsset: 'NEW',
    quoteAsset: 'USDT',
    status: 'TRADING',
    spotTradingAllowed: true,
    detectedAt: new Date('2026-09-14T02:00:00.000Z'),
    lastObservedAt: new Date('2026-09-14T03:00:00.000Z'),
  };
}
