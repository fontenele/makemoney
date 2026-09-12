import { ConfigService } from '@nestjs/config';
import {
  ExecutionContext,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { RiskControlAuthGuard } from './risk-control-auth.guard';

describe('RiskControlAuthGuard', () => {
  const token = 'local-test-control-token';
  const tokenHash = createHash('sha256').update(token).digest('hex');

  it('accepts the matching bearer token', () => {
    expect(guard(tokenHash).canActivate(context(`Bearer ${token}`))).toBe(true);
  });

  it.each([undefined, 'Basic value', 'Bearer wrong-token'])(
    'rejects invalid authorization %s',
    (authorization) => {
      expect(() =>
        guard(tokenHash).canActivate(context(authorization)),
      ).toThrow(UnauthorizedException);
    },
  );

  it('fails closed when the token hash is not configured', () => {
    expect(() =>
      guard(undefined).canActivate(context(`Bearer ${token}`)),
    ).toThrow(ServiceUnavailableException);
  });

  it('does not include the supplied token in an authentication error', () => {
    try {
      guard(tokenHash).canActivate(context('Bearer sensitive-value'));
      throw new Error('Expected authentication to fail');
    } catch (error: unknown) {
      expect(String(error)).not.toContain('sensitive-value');
    }
  });
});

function guard(hash: string | undefined): RiskControlAuthGuard {
  return new RiskControlAuthGuard({
    get: () => hash,
  } as unknown as ConfigService);
}

function context(authorization: string | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization } }),
    }),
  } as unknown as ExecutionContext;
}
