import { ServiceUnavailableException } from '@nestjs/common';
import { jest } from '@jest/globals';
import Redis from 'ioredis';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const queryRawMock = jest.fn();
  const connectMock = jest.fn();
  const pingMock = jest.fn();
  const prisma = {
    $queryRaw: queryRawMock,
  } as unknown as PrismaService;
  const redis = {
    status: 'ready',
    connect: connectMock,
    ping: pingMock,
  } as unknown as Redis;

  beforeEach(() => jest.clearAllMocks());

  it('reports all required services as available', async () => {
    queryRawMock.mockResolvedValueOnce([{ '?column?': 1 }]);
    pingMock.mockResolvedValueOnce('PONG');
    const service = new HealthService(prisma, redis);

    await expect(service.check()).resolves.toEqual({
      status: 'ok',
      services: { api: 'up', postgres: 'up', redis: 'up' },
    });
  });

  it('returns an unavailable error when a dependency fails', async () => {
    queryRawMock.mockRejectedValueOnce(new Error('offline'));
    const service = new HealthService(prisma, redis);

    await expect(service.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
