import { jest } from '@jest/globals';
import { SpotSymbolCatalogService } from '../application/spot-symbol-catalog.service';
import { NewListingsScannerController } from './new-listings-scanner.controller';

describe('NewListingsScannerController', () => {
  it('returns the catalog scanner status without triggering a provider load', () => {
    const status = {
      state: 'waiting_for_activation' as const,
      monitoredSymbolCount: 770,
      configuredPollIntervalMs: 1000,
      effectivePollIntervalMs: 1000,
      lastAttemptAt: new Date('2026-10-27T12:00:00.000Z'),
      lastSuccessfulObservationAt: new Date('2026-10-27T12:00:04.000Z'),
      nextAttemptAt: new Date('2026-10-27T12:00:05.000Z'),
      consecutiveFailures: 0,
      lastFailureCode: null,
      requestWeight: null,
    };
    const catalog = { status: jest.fn(() => status) };
    const activityStream = {
      state: 'connected' as const,
      lastConnectedAt: new Date('2026-10-27T12:00:00.000Z'),
      lastEventAt: null,
      lastTriggeredRefreshAt: null,
      lastTriggeredSymbol: null,
      triggeredRefreshCount: 0,
      reconnectCount: 0,
    };
    const activity = { status: jest.fn(() => activityStream) };

    expect(
      new NewListingsScannerController(
        catalog as unknown as SpotSymbolCatalogService,
        activity as never,
      ).status(),
    ).toEqual({ ...status, activityStream });
    expect(catalog.status).toHaveBeenCalledTimes(1);
  });
});
