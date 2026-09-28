import { jest } from '@jest/globals';
import { PredictionSeriesProvider } from '../domain/prediction-series';
import { PredictionSeriesService } from './prediction-series.service';

describe('PredictionSeriesService', () => {
  it('delegates bounded active-series discovery', async () => {
    const result = seriesPage();
    const listActive = jest
      .fn<PredictionSeriesProvider['listActive']>()
      .mockResolvedValue(result);
    const service = new PredictionSeriesService({
      listActive,
      getById: () => Promise.reject(new Error('unexpected detail call')),
      getEventsById: () => Promise.reject(new Error('unexpected events call')),
    });

    await expect(
      service.listActive({ limit: 20, offset: 40, recurrence: 'weekly' }),
    ).resolves.toBe(result);
    expect(listActive).toHaveBeenCalledWith(
      { limit: 20, offset: 40, recurrence: 'weekly' },
      undefined,
    );
  });

  it('delegates selected series lookup', async () => {
    const result = seriesDetails();
    const getById = jest
      .fn<PredictionSeriesProvider['getById']>()
      .mockResolvedValue(result);
    const service = new PredictionSeriesService({
      listActive: () => Promise.reject(new Error('unexpected list call')),
      getById,
      getEventsById: () => Promise.reject(new Error('unexpected events call')),
    });

    await expect(service.getById('1')).resolves.toBe(result);
    expect(getById).toHaveBeenCalledWith('1', undefined);
  });

  it('delegates selected series event lookup', async () => {
    const result = seriesEvents();
    const getEventsById = jest
      .fn<PredictionSeriesProvider['getEventsById']>()
      .mockResolvedValue(result);
    const service = new PredictionSeriesService({
      listActive: () => Promise.reject(new Error('unexpected list call')),
      getById: () => Promise.reject(new Error('unexpected detail call')),
      getEventsById,
    });

    await expect(service.getEventsById('1')).resolves.toBe(result);
    expect(getEventsById).toHaveBeenCalledWith('1', undefined);
  });
});

function seriesEvents() {
  return {
    provider: 'polymarket' as const,
    seriesId: '1',
    events: [event()],
    receivedAt: new Date('2026-09-28T01:30:00.000Z'),
  };
}

function event() {
  return {
    id: '100',
    slug: 'nfl-week-one',
    title: 'NFL Week One',
    startDate: '2026-09-01T00:00:00Z',
    endDate: '2026-09-08T00:00:00Z',
    active: true,
    closed: false,
    archived: false,
    restricted: false,
  };
}

function seriesPage() {
  return {
    provider: 'polymarket' as const,
    series: [series()],
    offset: 40,
    nextOffset: null,
    stablePagination: false as const,
    receivedAt: new Date('2026-09-28T00:00:00.000Z'),
  };
}

function series() {
  return {
    id: '1',
    slug: 'nfl',
    title: 'NFL',
    recurrence: 'weekly',
    closed: false,
  };
}

function seriesDetails() {
  return {
    provider: 'polymarket' as const,
    ...series(),
    receivedAt: new Date('2026-09-27T23:30:00.000Z'),
  };
}
