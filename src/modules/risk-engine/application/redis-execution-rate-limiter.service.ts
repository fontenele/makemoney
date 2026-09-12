import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../../infrastructure/redis/redis.constants';
import {
  ExecutionRateLimiter,
  ExecutionRateLimitPermit,
} from '../domain/execution-rate-limiter';

const RATE_LIMIT_KEY = 'risk:paper-execution:fixed-window';
const CONSUME_SCRIPT = `
local key = KEYS[1]
local id = ARGV[1]
local limit = tonumber(ARGV[2])
local windowMs = tonumber(ARGV[3])

if redis.call('EXISTS', key) == 0 then
  redis.call('HSET', key, id, '1')
  redis.call('PEXPIRE', key, windowMs)
  return {1, 1, windowMs}
end

local ttl = redis.call('PTTL', key)
if ttl < 0 then
  redis.call('PEXPIRE', key, windowMs)
  ttl = windowMs
end

local count = redis.call('HLEN', key)
if redis.call('HEXISTS', key, id) == 1 then
  return {1, count, ttl}
end

if count >= limit then
  return {0, count, ttl}
end

redis.call('HSET', key, id, '1')
return {1, count + 1, ttl}
`;

@Injectable()
export class RedisExecutionRateLimiterService implements ExecutionRateLimiter {
  private readonly logger = new Logger(RedisExecutionRateLimiterService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {}

  async consume(idempotencyKey: string): Promise<ExecutionRateLimitPermit> {
    const limit = this.config.getOrThrow<number>(
      'RISK_MAX_EXECUTIONS_PER_WINDOW',
    );
    const windowMs = this.config.getOrThrow<number>('RISK_EXECUTION_WINDOW_MS');

    let result: unknown;
    try {
      result = await this.redis.eval(
        CONSUME_SCRIPT,
        1,
        RATE_LIMIT_KEY,
        idempotencyKey,
        limit,
        windowMs,
      );
    } catch (cause) {
      this.logger.error({ event: 'risk.execution_rate_limit.unavailable' });
      throw new ExecutionRateLimiterUnavailableError({ cause });
    }

    const [allowed, count, retryAfterMs] = parseResult(result);
    if (allowed !== 1) {
      this.logger.warn({
        event: 'risk.execution_rate_limit.rejected',
        count,
        limit,
        retryAfterMs,
      });
      throw new ExecutionRateLimitExceededError(count, limit, retryAfterMs);
    }

    this.logger.log({
      event: 'risk.execution_rate_limit.permitted',
      count,
      limit,
      retryAfterMs,
    });
    return { count, limit, retryAfterMs };
  }
}

export class ExecutionRateLimitExceededError extends Error {
  constructor(
    readonly count: number,
    readonly limit: number,
    readonly retryAfterMs: number,
  ) {
    super('Paper execution rate limit exceeded');
    this.name = ExecutionRateLimitExceededError.name;
  }
}

export class ExecutionRateLimiterUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super('Paper execution rate limiter is unavailable', options);
    this.name = ExecutionRateLimiterUnavailableError.name;
  }
}

function parseResult(value: unknown): [number, number, number] {
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    value.some(
      (item) => typeof item !== 'number' || !Number.isSafeInteger(item),
    )
  ) {
    throw new ExecutionRateLimiterUnavailableError();
  }
  return value as [number, number, number];
}
