import { BadRequestException } from '@nestjs/common';
import { PolymarketAvailabilityService } from '../application/polymarket-availability.service';
import { PolymarketSettingsController } from './polymarket-settings.controller';

describe('PolymarketSettingsController', () => {
  it('exposes settings while research access is disabled', () => {
    expect(controller(false).getSettings()).toEqual({
      enabled: false,
      startupDefault: false,
      source: 'startup',
      changedAt: null,
    });
  });

  it('requires explicit access confirmation before enabling', () => {
    const settings = controller(false);

    expect(() =>
      settings.changeSettings({ enabled: true, accessConfirmed: false }),
    ).toThrow(BadRequestException);
    expect(settings.getSettings().enabled).toBe(false);
  });

  it('enables and disables research at runtime', () => {
    const settings = controller(false);

    expect(
      settings.changeSettings({ enabled: true, accessConfirmed: true }),
    ).toMatchObject({ enabled: true, source: 'runtime' });
    expect(
      settings.changeSettings({ enabled: false, accessConfirmed: false }),
    ).toMatchObject({ enabled: false, source: 'runtime' });
  });

  it.each([
    null,
    {},
    { enabled: 'true', accessConfirmed: true },
    { enabled: false },
    { enabled: false, accessConfirmed: false, extra: true },
  ])('rejects malformed settings change %#', (body) => {
    expect(() => controller(false).changeSettings(body)).toThrow(
      BadRequestException,
    );
  });
});

function controller(enabled: boolean): PolymarketSettingsController {
  const state = {
    enabled,
    startupDefault: enabled,
    source: 'startup' as const,
    changedAt: null,
  };
  let current = state;
  return new PolymarketSettingsController({
    current: () => current,
    setEnabled: (next: boolean) => {
      current = {
        enabled: next,
        startupDefault: enabled,
        source: 'runtime',
        changedAt: new Date(),
      };
      return current;
    },
  } as unknown as PolymarketAvailabilityService);
}
