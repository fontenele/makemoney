import { jest } from '@jest/globals';
import { PredictionTagProvider } from '../domain/prediction-tag';
import { PredictionTagService } from './prediction-tag.service';

describe('PredictionTagService', () => {
  it('delegates bounded catalog lookup', async () => {
    const result = {
      provider: 'polymarket' as const,
      tags: [{ id: '2', label: 'Politics', slug: 'politics' }],
      offset: 20,
      nextOffset: null,
      stablePagination: false as const,
      receivedAt: new Date('2026-09-27T21:00:00.000Z'),
    };
    const list = jest
      .fn<PredictionTagProvider['list']>()
      .mockResolvedValue(result);
    const service = new PredictionTagService({
      list,
      getById: () => Promise.reject(new Error('unexpected detail call')),
    });

    await expect(service.list({ limit: 20, offset: 20 })).resolves.toBe(result);
    expect(list).toHaveBeenCalledWith({ limit: 20, offset: 20 }, undefined);
  });

  it('delegates selected tag lookup', async () => {
    const result = {
      provider: 'polymarket' as const,
      id: '2',
      label: 'Politics',
      slug: 'politics',
      receivedAt: new Date('2026-09-27T22:00:00.000Z'),
    };
    const getById = jest
      .fn<PredictionTagProvider['getById']>()
      .mockResolvedValue(result);
    const service = new PredictionTagService({
      list: () => Promise.reject(new Error('unexpected list call')),
      getById,
    });

    await expect(service.getById('2')).resolves.toBe(result);
    expect(getById).toHaveBeenCalledWith('2', undefined);
  });
});
