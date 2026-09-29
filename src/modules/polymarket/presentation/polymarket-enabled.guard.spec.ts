import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PolymarketController } from './polymarket.controller';
import { PolymarketEnabledGuard } from './polymarket-enabled.guard';

describe('PolymarketEnabledGuard', () => {
  it('protects the complete Polymarket controller', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, PolymarketController)).toEqual([
      PolymarketEnabledGuard,
    ]);
  });

  it('allows access only when explicitly enabled', () => {
    expect(guard(true).canActivate()).toBe(true);
  });

  it('fails closed before a disabled route reaches its provider', () => {
    expect(() => guard(false).canActivate()).toThrow(
      ServiceUnavailableException,
    );
    expect(() => guard(false).canActivate()).toThrow(
      'Polymarket research is disabled by configuration',
    );
  });
});

function guard(enabled: boolean): PolymarketEnabledGuard {
  return new PolymarketEnabledGuard({
    getOrThrow: () => enabled,
  } as unknown as ConfigService);
}
