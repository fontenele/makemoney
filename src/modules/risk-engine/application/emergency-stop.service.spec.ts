import { jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { EmergencyStopRepository } from '../domain/emergency-stop';
import { EmergencyStopService } from './emergency-stop.service';

describe('EmergencyStopService', () => {
  it('uses configuration when no persisted event exists', async () => {
    const repository = repo();
    const service = createService(true, repository);

    await service.onModuleInit();

    expect(service.current()).toEqual({
      active: true,
      source: 'configuration',
      changeId: null,
      reason: null,
      changedAt: null,
      replayed: false,
    });
  });

  it('loads the latest persisted state over configuration', async () => {
    const repository = repo();
    const changedAt = new Date('2026-09-12T12:00:00.000Z');
    repository.current.mockResolvedValue({
      id: 'change-1',
      active: false,
      reason: 'operator review complete',
      changedAt,
    });
    const service = createService(true, repository);

    await service.onModuleInit();

    expect(service.current()).toMatchObject({
      active: false,
      source: 'persisted',
      changeId: 'change-1',
      changedAt,
    });
  });

  it('persists a change and updates the synchronous risk state', async () => {
    const repository = repo();
    const changedAt = new Date('2026-09-12T12:00:00.000Z');
    repository.change.mockResolvedValue({
      event: {
        id: 'change-1',
        active: true,
        reason: 'unexpected market behavior',
        changedAt,
      },
      replayed: false,
    });
    const service = createService(false, repository);

    await expect(
      service.change('change-1', true, 'unexpected market behavior'),
    ).resolves.toMatchObject({ active: true, replayed: false });
    expect(service.isActive()).toBe(true);
  });

  it('reports an idempotent replay', async () => {
    const repository = repo();
    repository.change.mockResolvedValue({
      event: {
        id: 'change-1',
        active: true,
        reason: 'review',
        changedAt: new Date('2026-09-12T12:00:00.000Z'),
      },
      replayed: true,
    });
    const service = createService(false, repository);

    await expect(
      service.change('change-1', true, 'review'),
    ).resolves.toMatchObject({ active: true, replayed: true });
  });
});

function createService(
  configured: boolean,
  repository: ReturnType<typeof repo>,
): EmergencyStopService {
  return new EmergencyStopService(
    {
      getOrThrow: () => configured,
    } as unknown as ConfigService,
    repository,
  );
}

function repo() {
  return {
    current: jest.fn<EmergencyStopRepository['current']>(() =>
      Promise.resolve(undefined),
    ),
    change: jest.fn<EmergencyStopRepository['change']>(),
  };
}
