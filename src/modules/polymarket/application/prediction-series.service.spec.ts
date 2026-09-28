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
    });

    await expect(service.getById('1')).resolves.toBe(result);
    expect(getById).toHaveBeenCalledWith('1', undefined);
  });
});

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
