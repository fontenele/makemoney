import { jest } from '@jest/globals';
import { SpotSymbolDetectionReadModelService } from './spot-symbol-detection-read-model.service';
import { DetectedSpotSymbolCursorNotFoundError } from '../domain/spot-symbol-catalog';

describe('SpotSymbolDetectionReadModelService', () => {
  it('resolves a cursor and passes its immutable sort identity', async () => {
    const cursor = detection();
    const repository = repositoryWith({
      findDetected: jest.fn(() => Promise.resolve(cursor)),
    });
    const service = new SpotSymbolDetectionReadModelService(repository);
    await service.listRecent(
      { limit: 10 },
      {
        provider: 'binance',
        symbol: 'NEWUSDT',
      },
    );
    expect(repository.listDetected).toHaveBeenCalledWith({ limit: 10, cursor });
  });

  it('rejects missing and out-of-range cursors', async () => {
    const missing = new SpotSymbolDetectionReadModelService(repositoryWith());
    await expect(
      missing.listRecent(
        { limit: 10 },
        { provider: 'binance', symbol: 'XUSDT' },
      ),
    ).rejects.toBeInstanceOf(DetectedSpotSymbolCursorNotFoundError);

    const outside = new SpotSymbolDetectionReadModelService(
      repositoryWith({
        findDetected: jest.fn(() => Promise.resolve(detection())),
      }),
    );
    await expect(
      outside.listRecent(
        { limit: 10, detectedFrom: new Date('2026-09-15T00:00:00.000Z') },
        { provider: 'binance', symbol: 'NEWUSDT' },
      ),
    ).rejects.toBeInstanceOf(DetectedSpotSymbolCursorNotFoundError);
  });

  it('rejects a cursor outside the requested provider-state filters', async () => {
    const service = new SpotSymbolDetectionReadModelService(
      repositoryWith({
        findDetected: jest.fn(() => Promise.resolve(detection())),
      }),
    );
    await expect(
      service.listRecent(
        { limit: 10, status: 'BREAK' },
        { provider: 'binance', symbol: 'NEWUSDT' },
      ),
    ).rejects.toBeInstanceOf(DetectedSpotSymbolCursorNotFoundError);
    await expect(
      service.listRecent(
        { limit: 10, spotTradingAllowed: false },
        { provider: 'binance', symbol: 'NEWUSDT' },
      ),
    ).rejects.toBeInstanceOf(DetectedSpotSymbolCursorNotFoundError);
  });
});

function repositoryWith(overrides: Record<string, unknown> = {}) {
  return {
    observe: jest.fn(() => Promise.resolve([])),
    findDetected: jest.fn(() => Promise.resolve(null)),
    listDetected: jest.fn(() => Promise.resolve([])),
    ...overrides,
  };
}

function detection() {
  return {
    provider: 'binance' as const,
    symbol: 'NEWUSDT',
    baseAsset: 'NEW',
    quoteAsset: 'USDT' as const,
    status: 'TRADING',
    spotTradingAllowed: true,
    detectedAt: new Date('2026-09-14T02:00:00.000Z'),
    lastObservedAt: new Date('2026-09-14T03:00:00.000Z'),
  };
}
