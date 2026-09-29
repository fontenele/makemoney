import { ConfigService } from '@nestjs/config';
import { PolymarketAvailabilityService } from './polymarket-availability.service';

describe('PolymarketAvailabilityService', () => {
  it('starts from the validated configuration', () => {
    expect(service(false).current()).toEqual({
      enabled: false,
      startupDefault: false,
      source: 'startup',
      changedAt: null,
    });
    expect(service(true).isEnabled()).toBe(true);
  });

  it('applies a process-local runtime override', () => {
    const availability = service(false);

    const state = availability.setEnabled(true);

    expect(state).toMatchObject({
      enabled: true,
      startupDefault: false,
      source: 'runtime',
    });
    expect(state.changedAt).toBeInstanceOf(Date);
    expect(availability.isEnabled()).toBe(true);
  });

  it('keeps an idempotent request on its existing source and timestamp', () => {
    const availability = service(false);

    expect(availability.setEnabled(false)).toEqual(availability.current());
    expect(availability.current().source).toBe('startup');
    expect(availability.current().changedAt).toBeNull();
  });
});

function service(enabled: boolean): PolymarketAvailabilityService {
  return new PolymarketAvailabilityService({
    getOrThrow: () => enabled,
  } as unknown as ConfigService);
}
