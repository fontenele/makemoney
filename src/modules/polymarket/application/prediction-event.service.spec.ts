import { jest } from '@jest/globals';
import { PredictionEventProvider } from '../domain/prediction-event';
import { PredictionEventService } from './prediction-event.service';

describe('PredictionEventService', () => {
  it('delegates bounded active-event discovery', async () => {
    const page = {
      events: [],
      nextCursor: null,
      receivedAt: new Date('2026-09-27T20:00:00.000Z'),
    };
    const listActive = jest
      .fn<PredictionEventProvider['listActive']>()
      .mockResolvedValue(page);
    const service = new PredictionEventService({
      listActive,
      getById: () => Promise.reject(new Error('unexpected detail call')),
      getTagsById: () => Promise.reject(new Error('unexpected tags call')),
    });

    await expect(
      service.listActive({ limit: 20, afterCursor: 'next-page' }),
    ).resolves.toBe(page);
    expect(listActive).toHaveBeenCalledWith(
      { limit: 20, afterCursor: 'next-page' },
      undefined,
    );
  });

  it('delegates selected-event lookup without changing the normalized result', async () => {
    const event = {
      provider: 'polymarket' as const,
      id: '1000',
      slug: 'example-event',
      title: 'Example event',
      description: null,
      resolutionSource: null,
      startDate: null,
      endDate: null,
      active: true,
      closed: false,
      archived: false,
      restricted: false,
      markets: [],
      receivedAt: new Date('2026-09-27T20:00:00.000Z'),
    };
    const getById = jest
      .fn<PredictionEventProvider['getById']>()
      .mockResolvedValue(event);

    await expect(
      new PredictionEventService({
        listActive: () => Promise.reject(new Error('unexpected list call')),
        getById,
        getTagsById: () => Promise.reject(new Error('unexpected tags call')),
      }).getById('1000'),
    ).resolves.toBe(event);
    expect(getById).toHaveBeenCalledWith('1000', undefined);
  });

  it('delegates selected-event tag lookup', async () => {
    const result = {
      provider: 'polymarket' as const,
      eventId: '1000',
      tags: [{ id: '2', label: 'Politics', slug: 'politics' }],
      receivedAt: new Date('2026-09-27T20:00:00.000Z'),
    };
    const getTagsById = jest
      .fn<PredictionEventProvider['getTagsById']>()
      .mockResolvedValue(result);
    const service = new PredictionEventService({
      listActive: () => Promise.reject(new Error('unexpected list call')),
      getById: () => Promise.reject(new Error('unexpected detail call')),
      getTagsById,
    });

    await expect(service.getTagsById('1000')).resolves.toBe(result);
    expect(getTagsById).toHaveBeenCalledWith('1000', undefined);
  });
});
