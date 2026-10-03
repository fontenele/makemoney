import { jest } from '@jest/globals';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { EmergencyStopIdempotencyConflictError } from '../domain/emergency-stop';
import { PrismaEmergencyStopRepository } from './prisma-emergency-stop.repository';

describe('PrismaEmergencyStopRepository', () => {
  it('serializes a new stop change with the submission-gate lock', async () => {
    const harness = repositoryHarness();

    await expect(
      harness.repository.change('stop-1', true, 'operator stop'),
    ).resolves.toEqual({
      event: {
        id: 'stop-1',
        active: true,
        reason: 'operator stop',
        changedAt: new Date('2026-10-03T12:00:00.000Z'),
      },
      replayed: false,
    });
    expect(harness.tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(harness.tx.riskControlEvent.create).toHaveBeenCalledWith({
      data: {
        id: 'stop-1',
        control: 'emergency_stop',
        active: true,
        reason: 'operator stop',
      },
    });
    expect(harness.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it('replays the exact stop change under the same lock', async () => {
    const harness = repositoryHarness();
    harness.tx.riskControlEvent.findUnique.mockResolvedValue(eventRow());

    await expect(
      harness.repository.change('stop-1', true, 'operator stop'),
    ).resolves.toMatchObject({ replayed: true });
    expect(harness.tx.riskControlEvent.create).not.toHaveBeenCalled();
  });

  it('rejects conflicting reuse of a stop identity', async () => {
    const harness = repositoryHarness();
    harness.tx.riskControlEvent.findUnique.mockResolvedValue(eventRow());

    await expect(
      harness.repository.change('stop-1', false, 'different'),
    ).rejects.toBeInstanceOf(EmergencyStopIdempotencyConflictError);
  });
});

function repositoryHarness() {
  const tx = {
    $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1),
    riskControlEvent: {
      findUnique: jest
        .fn<() => Promise<ReturnType<typeof eventRow> | null>>()
        .mockResolvedValue(null),
      create: jest
        .fn<() => Promise<ReturnType<typeof eventRow>>>()
        .mockResolvedValue(eventRow()),
    },
  };
  const transaction = jest.fn(
    async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
  );
  const prisma = { $transaction: transaction } as unknown as PrismaService;
  return {
    tx,
    transaction,
    repository: new PrismaEmergencyStopRepository(prisma),
  };
}

function eventRow() {
  return {
    id: 'stop-1',
    control: 'emergency_stop',
    active: true,
    reason: 'operator stop',
    changedAt: new Date('2026-10-03T12:00:00.000Z'),
  };
}
