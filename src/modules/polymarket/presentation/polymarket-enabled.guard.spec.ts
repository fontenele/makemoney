import { ServiceUnavailableException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PolymarketController } from './polymarket.controller';
import { PolymarketEnabledGuard } from './polymarket-enabled.guard';
import { PolymarketAvailabilityService } from '../application/polymarket-availability.service';

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
      'Polymarket research is disabled by local settings',
    );
  });
});

function guard(enabled: boolean): PolymarketEnabledGuard {
  return new PolymarketEnabledGuard({
    isEnabled: () => enabled,
  } as PolymarketAvailabilityService);
}
