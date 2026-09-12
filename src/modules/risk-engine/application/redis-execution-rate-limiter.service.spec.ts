import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import Redis from 'ioredis';
import {
  ExecutionRateLimitExceededError,
  ExecutionRateLimiterUnavailableError,
  RedisExecutionRateLimiterService,
} from './redis-execution-rate-limiter.service';

describe('RedisExecutionRateLimiterService', () => {
  it('permits the exact configured boundary', async () => {
    const { service, evalCommand } = limiter([1, 10, 1234]);

    await expect(service.consume('order-10')).resolves.toEqual({
      count: 10,
      limit: 10,
      retryAfterMs: 1234,
    });
    expect(evalCommand).toHaveBeenCalledWith(
      expect.any(String),
      1,
      'risk:paper-execution:fixed-window',
      'order-10',
      10,
      60000,
    );
  });

  it('rejects a new key after the configured limit', async () => {
    const { service } = limiter([0, 10, 4321]);

    await expect(service.consume('order-11')).rejects.toEqual(
      expect.objectContaining<Partial<ExecutionRateLimitExceededError>>({
        count: 10,
        limit: 10,
        retryAfterMs: 4321,
      }),
    );
  });

  it('fails closed when Redis is unavailable', async () => {
    const { service } = limiter(new Error('connection unavailable'));

    await expect(service.consume('order-1')).rejects.toBeInstanceOf(
      ExecutionRateLimiterUnavailableError,
    );
  });

  it('fails closed for an invalid Redis script response', async () => {
    const { service } = limiter('invalid');

    await expect(service.consume('order-1')).rejects.toBeInstanceOf(
      ExecutionRateLimiterUnavailableError,
    );
  });
});

function limiter(result: unknown) {
  const evalCommand = jest.fn<Redis['eval']>(() =>
    result instanceof Error ? Promise.reject(result) : Promise.resolve(result),
  );
  const redis = { eval: evalCommand } as unknown as Redis;
  const config = {
    getOrThrow: (key: string) =>
      key === 'RISK_MAX_EXECUTIONS_PER_WINDOW' ? 10 : 60000,
  } as unknown as ConfigService;
  return {
    service: new RedisExecutionRateLimiterService(redis, config),
    evalCommand,
  };
}
