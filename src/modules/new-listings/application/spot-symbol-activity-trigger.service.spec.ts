import { jest } from '@jest/globals';
import {
  SpotSymbolActivityStream,
  SpotSymbolActivityStreamEvent,
} from '../domain/spot-symbol-activity-stream';
import { SpotSymbolCatalogService } from './spot-symbol-catalog.service';
import { SpotSymbolActivityTriggerService } from './spot-symbol-activity-trigger.service';

describe('SpotSymbolActivityTriggerService', () => {
  it('tracks connection health and requests one refresh per symbol cooldown', () => {
    let observer: ((event: SpotSymbolActivityStreamEvent) => void) | undefined;
    const stop = jest.fn();
    const stream: SpotSymbolActivityStream = {
      start: jest.fn((value) => {
        observer = value;
      }),
      stop,
    };
    const requestActivityRefresh = jest.fn(() => true);
    const catalog = {
      requestActivityRefresh,
    } as unknown as SpotSymbolCatalogService;
    const service = new SpotSymbolActivityTriggerService(stream, catalog);
    const connectedAt = new Date('2026-10-28T12:00:00.000Z');
    const receivedAt = new Date('2026-10-28T12:00:01.000Z');

    service.onModuleInit();
    observer?.({ type: 'connected', observedAt: connectedAt });
    observer?.({ type: 'activity', activity: activity(receivedAt) });
    observer?.({ type: 'activity', activity: activity(receivedAt) });

    expect(requestActivityRefresh).toHaveBeenCalledTimes(1);
    expect(service.status()).toEqual({
      state: 'connected',
      lastConnectedAt: connectedAt,
      lastEventAt: receivedAt,
      lastTriggeredRefreshAt: receivedAt,
      lastTriggeredSymbol: 'NEWUSDT',
      triggeredRefreshCount: 1,
      reconnectCount: 0,
    });
    service.onModuleDestroy();
    expect(stop).toHaveBeenCalledTimes(1);
    expect(service.status().state).toBe('stopped');
  });

  it('reports reconnecting without treating known activity as a trigger', () => {
    let observer: ((event: SpotSymbolActivityStreamEvent) => void) | undefined;
    const stream: SpotSymbolActivityStream = {
      start: (value) => {
        observer = value;
      },
      stop: jest.fn(),
    };
    const catalog = {
      requestActivityRefresh: jest.fn(() => false),
    } as unknown as SpotSymbolCatalogService;
    const service = new SpotSymbolActivityTriggerService(stream, catalog);
    const observedAt = new Date('2026-10-28T12:00:00.000Z');

    service.onModuleInit();
    observer?.({
      type: 'disconnected',
      observedAt,
      reconnectAttempt: 1,
      reconnectDelayMs: 1000,
    });
    observer?.({ type: 'activity', activity: activity(observedAt) });

    expect(service.status()).toMatchObject({
      state: 'reconnecting',
      reconnectCount: 1,
      triggeredRefreshCount: 0,
      lastEventAt: observedAt,
    });
  });
});

function activity(receivedAt: Date) {
  return {
    provider: 'binance' as const,
    symbol: 'NEWUSDT',
    eventTime: receivedAt,
    receivedAt,
  };
}
