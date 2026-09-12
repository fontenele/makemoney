export const EXECUTION_RATE_LIMITER = Symbol('EXECUTION_RATE_LIMITER');

export interface ExecutionRateLimitPermit {
  count: number;
  limit: number;
  retryAfterMs: number;
}

export interface ExecutionRateLimiter {
  consume(idempotencyKey: string): Promise<ExecutionRateLimitPermit>;
}
