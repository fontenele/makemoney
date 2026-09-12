import { jest } from '@jest/globals';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { EmergencyStopService } from '../application/emergency-stop.service';
import { EmergencyStopIdempotencyConflictError } from '../domain/emergency-stop';
import { RiskControlController } from './risk-control.controller';

describe('RiskControlController', () => {
  const state = {
    active: true,
    source: 'persisted' as const,
    changeId: 'change-1',
    reason: 'review',
    changedAt: new Date('2026-09-12T12:00:00.000Z'),
    replayed: false,
  };

  it('returns the current emergency-stop state', () => {
    const controller = new RiskControlController({
      current: () => state,
    } as EmergencyStopService);

    expect(controller.getEmergencyStop()).toBe(state);
  });

  it('validates and trims a control change', async () => {
    const change = jest.fn(() => Promise.resolve(state));
    const controller = new RiskControlController({
      change,
    } as unknown as EmergencyStopService);

    await expect(
      controller.changeEmergencyStop('change-1', {
        active: true,
        reason: '  review  ',
      }),
    ).resolves.toBe(state);
    expect(change).toHaveBeenCalledWith('change-1', true, 'review');
  });

  it('rejects a missing idempotency key', async () => {
    const controller = new RiskControlController({} as EmergencyStopService);
    await expect(
      controller.changeEmergencyStop(undefined, {
        active: true,
        reason: 'review',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an invalid body', async () => {
    const controller = new RiskControlController({} as EmergencyStopService);
    await expect(
      controller.changeEmergencyStop('change-1', {
        active: 'true',
        reason: '',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps idempotency conflicts to HTTP 409', async () => {
    const controller = new RiskControlController({
      change: () =>
        Promise.reject(new EmergencyStopIdempotencyConflictError('change-1')),
    } as EmergencyStopService);

    await expect(
      controller.changeEmergencyStop('change-1', {
        active: true,
        reason: 'review',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
